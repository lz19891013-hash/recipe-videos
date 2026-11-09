"""EP19 Mexican Street Tacos — Latin cumbia street band ~100 BPM.
Warm electric bass ostinato + nylon syncopated rhythm + soft güiro/shaker + muted brass stabs + light kick.
Fresh from scratch — NOT afrobeat/lo-fi/funk UI ding/toy-piano/marimba/Rhodes/indie-pop jangle/
Mediterranean nylon+oud/riq/Gershwin foxtrot/sunny pastorale/chiptune."""
import json, sys, os, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../lib'))
from synth import *

here = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(here, 'timeline.json'))); E = TL['ev']
D = TL['duration']; M = Mix(D); seed(20261109); cues = []

def cue(t, name, sig, gain=1.0, pan=0.0, bus='sfx'):
    M.add(bus, t, sig, gain, pan); cues.append((round(t, 3), name))

# ---------- fresh cumbia street instruments ----------
def e_bass(m, d=0.55, a=1.0):
    """Warm electric bass — round fundamental + soft click, fixed ostinato feel."""
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2)
    y += 0.35 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 6.5)
    y += 0.12 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 10)
    # mild amp envelope punch
    y *= (0.55 + 0.45 * np.exp(-t * 18))
    click = bandnoise(0.008, 200, 900) * np.exp(-np.arange(int(0.008 * SR)) / SR * 80)
    y[:len(click)] += 0.18 * click
    return a * y * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.04, 0, 1)

def nylon_cumbia(m, d=0.45, a=1.0):
    """Nylon syncopated chops — shorter, drier than fingerstyle ballad; cumbia offbeat."""
    f = hz(m); t = tt(d)
    y = np.zeros_like(t)
    for k, w, decay in [(1, 1.0, 5.5), (2, 0.4, 9), (3, 0.18, 14), (5, 0.07, 20)]:
        y += w * np.sin(2 * np.pi * k * f * t) * np.exp(-t * decay)
    # percussive nail attack for syncopated "chuck"
    click = bandnoise(0.01, 1200, 5000) * np.exp(-np.arange(int(0.01 * SR)) / SR * 100)
    y[:len(click)] += 0.35 * click
    return a * y * np.minimum(1, t / 0.002)

def guiro_scrape(a=1.0, d=0.12):
    """Soft güiro — ridged scrape, not dusty afrobeat shaker bed."""
    t = tt(d)
    # pulsed noise at ~18 ridges/sec
    pulse = 0.5 + 0.5 * np.sin(2 * np.pi * 18 * t)
    y = bandnoise(d, 1800, 6500) * pulse * np.exp(-t * 8)
    y *= np.minimum(1, t / 0.008)
    return a * y * 0.7

def soft_shaker(a=1.0):
    t = tt(0.045)
    return a * bandnoise(0.045, 4000, 10000) * np.exp(-t * 70) * np.minimum(1, t / 0.001)

def muted_brass(m, d=0.28, a=1.0):
    """Muted trumpet/trombone stab — soft buzz, short, not bright lead."""
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    y += 0.45 * square(f, d, bright=0.4)[:len(t)] * np.exp(-t * 9)
    y += 0.15 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 12)
    # mute breath noise
    y += 0.08 * bandnoise(d, 800, 3500) * np.exp(-t * 14)
    return a * y * np.minimum(1, t / 0.01) * np.clip((d - t) / 0.05, 0, 1)

def cumbia_kick(a=1.0):
    """Light street kick — soft thump, NOT dusty afrobeat."""
    t = tt(0.28)
    y = np.sin(2 * np.pi * (70 * np.exp(-t * 14) + 48) * t) * np.exp(-t * 10)
    skin = bandnoise(0.03, 80, 400) * np.exp(-np.arange(int(0.03 * SR)) / SR * 40)
    y[:len(skin)] += 0.3 * skin
    return a * y

def land_thump(a=1.0):
    t = tt(0.18)
    y = np.sin(2 * np.pi * (90 + 40 * np.exp(-t * 28)) * t) * np.exp(-t * 14)
    click = bandnoise(0.03, 300, 1400) * np.exp(-np.arange(int(0.03 * SR)) / SR * 48)
    y[:len(click)] += 0.25 * click
    return a * y

def sear_sizzle(d, a=1.0):
    return a * sizzle(d, a=1.0, crack_rate=140)

# ================= MUSIC: Cumbia in C minor / Ab feel ~100 BPM =================
bpm = 100; beat = 60 / bpm; bar = 4 * beat; t0 = 1.0
# i – VII – III – VImaj (cumbia-friendly Latin minor loop)
chords = [
    [48, 51, 55],       # Cm
    [46, 50, 53],       # Bb
    [51, 55, 58],       # Eb
    [53, 56, 60],       # Fm
    [48, 51, 55],       # Cm
    [46, 50, 53, 57],   # Bbmaj7-ish
    [51, 55, 58],       # Eb
    [43, 47, 50],       # G (dom to Cm)
]
bass_roots = [36, 34, 39, 41, 36, 34, 39, 31]  # C Bb Eb F C Bb Eb G
# nylon syncopation: offbeats + & of 2/4 (cumbia chuck)
nylon_pat = {
    'A': [(0.5, 0), (1.5, 1), (2.5, 2), (3.5, 1)],
    'B': [(0.5, 0), (1.0, 2), (1.5, 1), (2.5, 0), (3.0, 2), (3.5, 1)],
    'C': [(0.5, 2), (1.5, 0), (2.0, 1), (2.5, 2), (3.5, 0)],
}
brass_pat = [(0.0, 0), (2.0, 2)]  # sparse stabs on 1 and 3

k = 0
while True:
    ts = t0 + k * bar
    if ts >= D - 0.4: break
    ci = k % 8; ch = chords[ci]; root = bass_roots[ci]
    sec = ('intro' if ts < 4 else 'A' if ts < 14 else 'B' if ts < 38
           else 'C' if ts < 52 else 'D' if ts < 70 else 'E' if ts < 94
           else 'F' if ts < 102 else 'outro')
    on = lambda bt: ts + bt * beat
    fade = 1.0
    if sec == 'outro':
        fade = max(0.0, 1 - (ts - 102) / 8)
    if sec == 'intro':
        fade = 0.35 + 0.4 * min(1, k / 2)

    # light kick on 1 + soft on 3 (street band, not four-on-floor disco)
    if sec not in ('intro',) or k >= 1:
        M.add('kick', on(0), cumbia_kick(0.95), 0.28 * fade)
        if sec in ('B', 'C', 'D', 'E', 'F'):
            M.add('kick', on(2), cumbia_kick(0.65), 0.14 * fade)

    # warm electric bass ostinato: root on 1, fifth/octave anticipation
    if sec != 'intro' or k >= 1:
        M.add('bass', on(0), e_bass(root, 1.35 * beat, 0.95), 0.34 * fade)
        M.add('bass', on(1.5), e_bass(root + 7, 0.7 * beat, 0.75), 0.2 * fade)
        if sec in ('C', 'D', 'E', 'F'):
            M.add('bass', on(3), e_bass(root + 12, 0.55 * beat, 0.65), 0.16 * fade)

    # nylon syncopated chucks
    pp = nylon_pat['A' if sec in ('intro', 'A', 'outro') else 'B' if sec in ('B', 'D', 'F') else 'C']
    for bt, idx in pp:
        note = ch[idx % len(ch)] + (12 if sec in ('E', 'F') and idx == 2 else 0)
        g = 0.22 * fade
        if sec == 'intro': g *= 0.6
        M.add('nylon', on(bt), nylon_cumbia(note, 0.38, 1.0), g, pan=(-0.2 + 0.3 * ((idx + k) % 3) / 2))

    # güiro on 2 and 4 (classic cumbia scrape)
    if sec in ('A', 'B', 'C', 'D', 'E', 'F', 'outro'):
        M.add('guiro', on(1), guiro_scrape(0.85, 0.11), 0.12 * fade, pan=-0.25)
        M.add('guiro', on(3), guiro_scrape(0.7, 0.1), 0.1 * fade, pan=-0.22)
        if sec in ('D', 'E') and k % 2 == 0:
            M.add('guiro', on(2.5), guiro_scrape(0.55, 0.08), 0.07 * fade, pan=0.2)

    # soft shaker 16ths lightly (not lo-fi hat)
    if sec in ('B', 'C', 'D', 'E', 'F'):
        for j in (1, 3, 5, 7):
            M.add('shaker', on(j * 0.5), soft_shaker(0.6), 0.045 * fade, pan=0.22 if j % 4 else -0.15)

    # muted brass stabs — sparse, street-band
    if sec in ('C', 'D', 'E', 'F') and k % 2 == 0:
        for bt, idx in brass_pat:
            note = ch[idx % len(ch)] + 12
            M.add('brass', on(bt + 0.02), muted_brass(note, 0.26, 1.0), 0.12 * fade, pan=0.15)

    k += 1

# ================= SFX cues =================
cue(E['ignite'], 'ignite', ignite(1.0), 0.45)
cue(E['comal_heat'][0], 'flame', flame_bed(E['comal_heat'][1] - E['comal_heat'][0], 0.7), 0.18)

# oil pour tip-lock
op = E['oil']['pour']
cue(E['oil']['enter'], 'oil_in', whoosh(0.3, up=True), 0.16)
cue(op[0], 'oil_pour', pour(op[1] - op[0], lo=420, hi=2400, a=1.0, glug=5), 0.4)

# beef cascade + sizzle
bd = E['beef_drop']
for i in range(bd['count']):
    ti = bd['start'] + i * bd['gap'] + bd['fall'] * 0.85
    cue(ti, 'beef', land_thump(0.7), 0.12 + 0.03 * (i % 3), pan=(i % 5 - 2) * 0.08)
cue(bd['start'] + 0.2, 'sear', sear_sizzle(E['stir1'][1] - bd['start'], 0.9), 0.22)

# stir scrapes
st = E['stir1']
n_scr = int((st[1] - st[0]) * 1.0 * 2)  # STIR_HZ=1.0 match scene
for i in range(n_scr):
    ti = st[0] + i * ((st[1] - st[0]) / max(1, n_scr))
    cue(ti, 'scrape', scrape(0.8, d=0.14), 0.16, pan=np.sin(i * 0.7) * 0.25)

# tortillas
cue(E['tortilla_on'], 'tortilla', land_thump(0.85), 0.3)
for ft in E['tortilla_flip']:
    cue(ft, 'flip', whoosh(0.28), 0.18)
    cue(ft + 0.2, 'tort_land', land_thump(0.7), 0.22)

# chops
for t in E['onion_chops']:
    cue(t, 'knife_chop', chop(1.0, wood=True), 0.38)
for t in E['cilantro_chops']:
    cue(t, 'knife_chop_small', chop(0.75, wood=True), 0.28)
for t in E['lime_chops']:
    cue(t, 'knife_chop', chop(1.0, wood=True), 0.42)
    cue(t + 0.08, 'lime_split', land_thump(0.6), 0.2)

# plating
cue(E['tortilla_plate'], 'plate_tort', land_thump(0.8), 0.28)
cue(E['beef_plate'], 'plate_beef', land_thump(0.7), 0.22)
cue(E['onion_plate'], 'plate_onion', land_thump(0.5), 0.16)
cue(E['cilantro_plate'], 'plate_cil', land_thump(0.45), 0.14)

# salsa
sp = E['salsa']['pour']
cue(E['salsa']['enter'], 'salsa_in', whoosh(0.28), 0.15)
cue(sp[0], 'salsa_pour', pour(sp[1] - sp[0], lo=350, hi=2000, a=1.0, glug=4), 0.45)

# lime squeeze
cue(E['lime_squeeze'][0], 'squeeze', squeeze(E['lime_squeeze'][1] - E['lime_squeeze'][0], 1.0), 0.4)

cue(E['done'], 'done', bell(hz(67), 2.0, a=0.45), 0.3)
cue(E['hero'], 'hero', nylon_cumbia(67, 0.9, 1.0), 0.24)
cue(E['card'], 'card', land_thump(0.7), 0.26)

# ---------- mix & write ----------
N = M.N; tA = np.arange(N) / SR
music = (M.get('nylon') + M.get('bass') + M.get('kick')
         + M.get('guiro') + M.get('shaker') + M.get('brass'))
music = reverb(music, 1.4, .22, lp=7500)
sfx = reverb(M.get('sfx'), .45, .1, lp=9000)
se = np.abs(sfx).mean(1); w = int(.25 * SR)
se = np.convolve(se, np.ones(w) / w, 'same'); se /= se.max() + 1e-9
music *= (1 - .32 * se)[:, None]
music /= np.sqrt((music ** 2).mean()) + 1e-9
sfx /= np.sqrt((sfx ** 2).mean()) + 1e-9
mix = .5 * music + .6 * sfx
fade = np.minimum(1, tA / .3) * np.clip((D - tA) / 2.5, 0, 1)
mix *= fade[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * 1.25; mix = np.tanh(mix) / np.tanh(1.25)
mix *= db(-16) / (np.sqrt((mix ** 2).mean()) + 1e-9)
mix = limiter(mix, db(-3.0))
os.makedirs(os.path.join(here, 'build'), exist_ok=True)
write_wav(os.path.join(here, 'build', 'mix.wav'), mix)
json.dump(sorted(cues), open(os.path.join(here, 'build', 'sfx_cues.json'), 'w'), ensure_ascii=False, indent=0)
print('mix.wav written', D, 's;', len(cues), 'cues')
