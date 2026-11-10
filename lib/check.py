"""QA for a finished episode MP4.
usage: python3 lib/check.py <episodeDir> <final.mp4>
 - ffprobe: duration / resolution / fps / codecs / pix_fmt / faststart
 - loudness: integrated LUFS + true peak (ffmpeg ebur128), clipping & click scan
 - sync: onset of each discrete SFX cue in the final audio vs timeline time
 - frames: extracts check frames FROM THE MP4 (every step start/mid/end, pours, callouts, card) + contact sheets
writes build/qa/report.json"""
import json, subprocess, sys, os, re, wave, numpy as np
ep, mp4 = sys.argv[1], sys.argv[2]; TL = json.load(open(os.path.join(ep, 'timeline.json'))); E = TL['ev']
qa = os.path.join(ep, 'build', 'qa'); os.makedirs(qa, exist_ok=True); R = {'file': os.path.abspath(mp4)}; fails = []
pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4]))
v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in pr['streams'] if s['codec_type'] == 'audio'][0]
fr = eval(v['r_frame_rate']); dur = float(pr['format']['duration'])
R['video'] = dict(codec=v['codec_name'], profile=v.get('profile'), w=v['width'], h=v['height'], fps=fr, pix_fmt=v['pix_fmt'], frames=int(v.get('nb_frames', 0)))
R['audio'] = dict(codec=a['codec_name'], sr=int(a['sample_rate']), ch=a['channels'], bitrate=a.get('bit_rate'))
R['duration'] = dur; R['size_MB'] = round(int(pr['format']['size']) / 1e6, 2)
head = open(mp4, 'rb').read(200000); R['faststart'] = head.find(b'moov') < head.find(b'mdat') if b'moov' in head else False
if (v['width'], v['height']) != (TL['width'], TL['height']): fails.append('resolution')
if abs(fr - TL['fps']) > .01: fails.append('fps')
if v['codec_name'] != 'h264' or a['codec_name'] != 'aac' or v['pix_fmt'] != 'yuv420p': fails.append('codec/pix_fmt')
if not (60 <= dur <= 300): fails.append('duration out of 1-5 min')
if not R['faststart']: fails.append('faststart')
# loudness
out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', mp4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
summ = out[out.rfind('Summary:'):]
I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1)); TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1)); LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', summ).group(1))
R['loudness'] = dict(integrated_LUFS=I, true_peak_dBTP=TP, LRA=LRA)
if abs(I + 14) > 1.0: fails.append(f'loudness {I}')
if TP > -1.0: fails.append(f'true peak {TP}')
# decode audio for click/sync analysis
wav = os.path.join(qa, 'final_audio.wav'); subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp4, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', wav], check=True)
with wave.open(wav) as w: x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
SR = 48000; R['audio_scan'] = dict(samples_over_0dB=int((np.abs(x) > .999).sum()), max_abs=round(float(np.abs(x).max()), 4))
# pop/click scan: 2nd-difference spikes far above their local (20 ms) RMS
d2 = np.diff(x, 2); w = int(.02 * SR); loc = np.sqrt(np.convolve(d2 ** 2, np.ones(w) / w, 'same')) + 1e-6
spk = np.where((np.abs(d2) / loc > 14) & (np.abs(d2) > .05))[0]
R['audio_scan']['pop_candidates'] = int(len(spk)); R['audio_scan']['pop_times_s'] = sorted({round(i / SR, 2) for i in spk})[:20]
# sync: discrete cues -> onset in final audio (high-passed energy rise)
cues = json.load(open(os.path.join(ep, 'build', 'sfx_cues.json')))
disc = ('egg_crack', 'knife_chop', 'knife_chop_small', 'timer_tick', 'salt_shake', 'chili_shake', 'tomato_hits_wok', 'garlic_hit_oil', 'pasta_splash', 'wok_clang', 'pan_clang', 'ignite', 'timer_ding')
hp = np.diff(x, prepend=0); en = np.convolve(hp ** 2, np.ones(240) / 240, 'same')
sync = []
dts = sorted(t for t, n in cues if n in disc)
for t, name in cues:
    if name not in disc: continue
    if any(0 < abs(t - u) < .15 for u in dts): continue   # too close to another hit to attribute
    i0, i1 = int((t - .12) * SR), int((t + .12) * SR); seg = en[i0:i1]; base = np.median(en[int((t - .4) * SR):i0]) + 1e-9
    rise = np.where(seg > base * 4 + seg.max() * .3)[0]
    on = (i0 + rise[0]) / SR if len(rise) else None; sync.append(dict(t=t, cue=name, onset=None if on is None else round(on, 3), off_ms=None if on is None else round((on - t) * 1000)))
offs = [abs(s['off_ms']) for s in sync if s['off_ms'] is not None]
R['sync'] = dict(checked=len(sync), detected=len(offs), max_abs_offset_ms=max(offs) if offs else None, median_abs_offset_ms=float(np.median(offs)) if offs else None, items=sync)
if offs and max(offs) > 70: fails.append('sync offset > 70 ms')
# check frames from the MP4
times = set()
for s in TL['steps']:
    for f in (.15, .5, .85): times.add(round(s['start'] + (s['end'] - s['start']) * f, 2))
for c in TL['callouts']: times.add(round((c['t0'] + c['t1']) / 2, 2))
# any pour-window object: {pour:[t0,t1], ...}
for k, v in E.items():
    if isinstance(v, dict) and isinstance(v.get('pour'), list) and len(v['pour']) == 2:
        p0, p1 = v['pour']; times |= {round(p0 + .3, 2), round((p0 + p1) / 2, 2)}
# discrete crack/chop lists + finale anchors
for k, v in E.items():
    if isinstance(v, list) and v and all(isinstance(x, (int, float)) for x in v) and ('chop' in k or 'crack' in k):
        times |= {round(c, 2) for c in v[:3]}
times |= {1.5, E['done'] + 1.5, E['card'] + 3, TL['duration'] - 1.5}
# knife impacts (+ mid-stroke) + any 2-element action windows named stir/scramble
for k, v in E.items():
    if isinstance(v, list) and v and all(isinstance(x, (int, float)) for x in v) and 'chop' in k:
        for c in v: times |= {round(c, 2), round(c - .12, 2)}
for k, v in E.items():
    if isinstance(v, list) and len(v) == 2 and all(isinstance(x, (int, float)) for x in v) and any(t in k for t in ('scramble', 'stir', 'sizzle', 'timer', 'boil')):
        a0, a1 = v; times |= {round(a0 + (a1 - a0) * f, 2) for f in (.2, .5, .8)}
for c in E.get('toss', []): times |= {round(c, 2), round(c + .3, 2)}
if isinstance(E.get('plating'), list): a0, a1 = E['plating']; times |= {round(a0 + (a1 - a0) * f, 2) for f in (.3, .7)}
times = sorted(t for t in times if t < dur)
fd = os.path.join(qa, 'frames'); os.makedirs(fd, exist_ok=True)
for f in os.listdir(fd): os.remove(os.path.join(fd, f))
for t in times: subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', os.path.join(fd, f't{t:06.2f}.png')], check=True)
files = sorted(os.path.join(fd, f) for f in os.listdir(fd)); R['frames'] = len(files)
here = os.path.dirname(os.path.abspath(__file__))
for k in range(0, len(files), 15): subprocess.run(['python3', os.path.join(here, 'contact.py'), os.path.join(qa, f'sheet{k // 15 + 1}.png')] + files[k:k + 15], check=True, capture_output=True)
R['fails'] = fails; R['pass_automatic'] = not fails
json.dump(R, open(os.path.join(qa, 'report.json'), 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: R[k] for k in R if k != 'sync'}, indent=1, ensure_ascii=False)); print('sync:', {k: R['sync'][k] for k in R['sync'] if k != 'items'})
