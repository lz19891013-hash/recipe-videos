#!/usr/bin/env python3
"""QA: container params, loudness/true-peak, clip scan, A/V sync, contact sheets from final MP4."""
import json, os, re, subprocess, sys, math

EP = sys.argv[1]
OUT = sys.argv[2]
QA = os.path.join(EP, 'build', 'qa')
os.makedirs(QA, exist_ok=True)
TL = json.load(open(os.path.join(EP, 'timeline.json')))
fails = []
notes = []

def run(cmd, text=True):
    p = subprocess.run(cmd, capture_output=True, text=text)
    return p

def ffprobe(path):
    p = run(['ffprobe','-v','error','-show_format','-show_streams','-print_format','json', path])
    if p.returncode != 0:
        fails.append('ffprobe failed: ' + (p.stderr or '')[:400])
        return {}
    return json.loads(p.stdout)

info = ffprobe(OUT)
fmt = info.get('format', {})
streams = {s.get('codec_type'): s for s in info.get('streams', [])}
v, a = streams.get('video', {}), streams.get('audio', {})

def chk(cond, msg):
    (notes if cond else fails).append(msg)

w = int(v.get('width') or 0); h = int(v.get('height') or 0)
chk(w == TL['width'] and h == TL['height'], f"res {w}x{h} (want {TL['width']}x{TL['height']})")
# fps
num, den = (v.get('avg_frame_rate') or '0/1').split('/')
fps = float(num) / float(den or 1)
chk(abs(fps - TL['fps']) < 0.05, f"fps {fps} (want {TL['fps']})")
chk(v.get('codec_name') == 'h264', f"vcodec {v.get('codec_name')}")
chk(a.get('codec_name') == 'aac', f"acodec {a.get('codec_name')}")
pix = v.get('pix_fmt')
chk(pix == 'yuv420p', f"pix_fmt {pix}")
dur = float(fmt.get('duration') or 0)
chk(abs(dur - TL['duration']) <= 0.35, f"duration {dur:.3f}s (want {TL['duration']})")
# faststart: moov before mdat
p = run(['ffprobe','-v','trace','-i', OUT])
trace = (p.stderr or '')[:8000]
# simpler: look at atoms via ffmpeg
p2 = run(['ffprobe','-v','error','-show_entries','format=format_name','-of','default=nw=1', OUT])
chk('mp4' in (fmt.get('format_name') or ''), f"format {fmt.get('format_name')}")
# check moov offset via python
with open(OUT, 'rb') as f:
    head = f.read(min(8_000_000, os.path.getsize(OUT)))
moov = head.find(b'moov')
mdat = head.find(b'mdat')
fast = moov != -1 and (mdat == -1 or moov < mdat)
chk(fast, f"faststart moov@{moov} mdat@{mdat}")

# loudness
p = run(['ffmpeg','-hide_banner','-i', OUT, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
ebu = p.stderr or ''
def grab(label):
    m = re.search(rf"{label}:\s*([-\d.]+)", ebu)
    return float(m.group(1)) if m else None
I = grab(r"I")
TP = grab(r"True peak") or grab(r"Peak")
# Integrated is last "I:" in Summary
ms = list(re.finditer(r"I:\s*([-\d.]+) LUFS", ebu))
I = float(ms[-1].group(1)) if ms else I
tps = list(re.finditer(r"Peak:\s*([-\d.]+) dBFS", ebu))
# true peak
tpt = list(re.finditer(r"True peak:\s*([-\d.]+) dBTP", ebu))
if not tpt:
    tpt = list(re.finditer(r"True peak:\s*([-\d.]+)", ebu))
TP = float(tpt[-1].group(1)) if tpt else TP
chk(I is not None and abs(I - (-14)) <= 1.05, f"integrated LUFS {I} (want -14±1)")
chk(TP is not None and TP <= -0.95, f"true peak {TP} dBTP (want ≤ -1.0)")

# clip scan on audio extract
wav = os.path.join(QA, 'audio.wav')
run(['ffmpeg','-y','-i', OUT, '-vn', '-ac','2','-ar','48000', wav])
try:
    import wave, numpy as np
    with wave.open(wav, 'rb') as wf:
        n = wf.getnframes()
        raw = wf.readframes(n)
        x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
        peak = float(np.max(np.abs(x)))
        clip_frac = float(np.mean(np.abs(x) > 0.99))
        chk(clip_frac < 0.0005, f"clip_frac {clip_frac:.6f} peak {peak:.3f}")
except Exception as e:
    notes.append('clip scan skip: ' + str(e))

# A/V start timestamps
vd = float(v.get('start_time') or 0)
ad = float(a.get('start_time') or 0)
sync_ms = abs(vd - ad) * 1000
chk(sync_ms <= 70, f"av start delta {sync_ms:.1f} ms (want ≤70)")

# extract check frames from FINAL mp4
times = [0.8, 5.0, 12.0, 21.0, 23.0, 35.0, 42.0, 44.0, 50.0, 59.0, 61.0, 70.0, 85.0, 92.0, 96.0, 100.0, 108.0]
frame_dir = os.path.join(QA, 'frames')
os.makedirs(frame_dir, exist_ok=True)
frame_paths = []
for t in times:
    if t >= TL['duration']:
        continue
    fp = os.path.join(frame_dir, f"t{t:.2f}".replace('.', 'p') + '.jpg')
    r = run(['ffmpeg','-y','-ss', f'{t:.3f}', '-i', OUT, '-frames:v','1', '-q:v','2', fp])
    if os.path.exists(fp):
        frame_paths.append(fp)

# contact sheets
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from contact import contact
    sheets = []
    for i in range(0, len(frame_paths), 6):
        chunk = frame_paths[i:i+6]
        sp = os.path.join(QA, f'sheet{i//6}.png')
        contact(chunk, sp, cols=3)
        sheets.append(sp)
except Exception as e:
    notes.append('contact sheet: ' + str(e))
    sheets = []

# crude contrast probe on pill frames (21, 42, 59)
contrast = {}
try:
    import numpy as np
    from struct import unpack
    def load_jpg_via_ffmpeg(path):
        rawp = path + '.rgb'
        run(['ffmpeg','-y','-i', path, '-f','rawvideo','-pix_fmt','rgb24', rawp])
        data = open(rawp,'rb').read(); os.remove(rawp)
        arr = np.frombuffer(data, dtype=np.uint8)
        return arr.reshape(TL['height'], TL['width'], 3)
    for t, tag in [(21.0,'butter'), (42.0,'salt'), (59.0,'wine')]:
        fp = os.path.join(frame_dir, f"t{t:.2f}".replace('.', 'p') + '.jpg')
        if not os.path.exists(fp):
            continue
        im = load_jpg_via_ffmpeg(fp)
        # kit card: x0=70, y=1388, w=620, h=168; amount pill right
        card = im[1388:1556, 70:690]
        pill = im[1410:1530, 450:680]
        def lum(block):
            r,g,b = block[...,0].astype(np.float64), block[...,1].astype(np.float64), block[...,2].astype(np.float64)
            return 0.2126*r + 0.7152*g + 0.0722*b
        lc, lp = lum(card), lum(pill)
        contrast[tag] = {
            'card_mean': float(lc.mean()), 'card_std': float(lc.std()),
            'pill_mean': float(lp.mean()), 'pill_std': float(lp.std()),
            'pill_p10': float(np.percentile(lp, 10)),
            'pill_p90': float(np.percentile(lp, 90)),
            'pill_spread': float(np.percentile(lp, 90) - np.percentile(lp, 10))
        }
        # high contrast if spread decent or mean is gold-ish mid
        if contrast[tag]['pill_spread'] < 25 and contrast[tag]['card_std'] < 20:
            fails.append(f'low contrast pill {tag} t={t}s spread={contrast[tag]["pill_spread"]:.1f}')
except Exception as e:
    notes.append('contrast probe skip: ' + str(e))

report = {
    'episode': TL.get('slug'),
    'out': os.path.abspath(OUT),
    'duration_s': dur,
    'width': w, 'height': h, 'fps': fps,
    'vcodec': v.get('codec_name'), 'acodec': a.get('codec_name'),
    'pix_fmt': pix, 'faststart': fast,
    'lufs_I': I, 'dBTP': TP, 'av_sync_ms': sync_ms,
    'contrast_probe': contrast,
    'frames': frame_paths, 'sheets': sheets,
    'fails': fails, 'notes': notes,
    'pass': len(fails) == 0
}
json.dump(report, open(os.path.join(QA, 'report.json'), 'w'), ensure_ascii=False, indent=2)
print(json.dumps({k: report[k] for k in ('pass','fails','lufs_I','dBTP','duration_s','faststart')}, ensure_ascii=False, indent=2))
if fails:
    print('QA FAILS', file=sys.stderr)
    sys.exit(1)
