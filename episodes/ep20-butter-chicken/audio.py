"""EP20 Butter Chicken v2 — medieval-hall organum kitchen ~84 BPM Mixolydian.
Soft organ pedal drone + harp arpeggios + hand chimes + water-glass + light timpani.
v2 SFX: butter BLOCK drop + melt sizzle (NO pour/glug); thermometer click; keep hall BGM.
"""
import json, sys, os, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../lib'))
from synth import *

here = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(here, 'timeline.json'))); E = TL['ev']
D = TL['duration']; M = Mix(D); seed(20261110); cues = []

def cue(t, name, sig, gain=1.0, pan=0.0, bus='sfx'):
    M.add(bus, t, sig, gain, pan); cues.append((round(t, 3), name))

# ---------- fresh hall instruments ----------
def organ_pedal(m, d=2.6, a=1.0):
    f = hz(m); t = tt(d)
    y = 0.70 * np.sin(2 * np.pi * f * t)
    y += 0.22 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 0.25)
    y += 0.12 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 0.45)
    y += 0.06 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 0.8)
    y += 0.03 * np.sin(2 * np.pi * f * 6 * t) * np.exp(-t * 1.4)
    y += 0.025 * bandnoise(d, 80, 420) * np.exp(-t * 0.6)
    att = np.minimum(1, t / 0.09)
    rel = np.clip((d - t) / 0.22, 0, 1)
    return a * y * att * rel

def organum_voice(m, d=1.8, a=1.0):
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t)
    y += 0.18 * np.sin(2 * np.pi * f * 2.003 * t)
    y += 0.07 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 1.2)
    y *= (0.85 + 0.15 * np.sin(2 * np.pi * 1.6 * t))
    return a * y * np.minimum(1, t / 0.06) * np.clip((d - t) / 0.18, 0, 1)

def hall_harp(m, d=1.15, a=1.0):
    f = hz(m); t = tt(d)
    y = np.zeros_like(t)
    for k, w, dec in [(1, 1.0, 2.4), (2, 0.42, 3.6), (3, 0.22, 5.2),
                      (4, 0.12, 7.0), (5, 0.07, 9.0), (6, 0.04, 12), (8, 0.02, 16)]:
        y += w * np.sin(2 * np.pi * k * f * t) * np.exp(-t * dec)
    tick = bandnoise(0.012, 600, 2800) * np.exp(-np.arange(int(0.012 * SR)) / SR * 70)
    y[:len(tick)] += 0.12 * tick
    return a * y * np.minimum(1, t / 0.004)

def hand_chime(m, d=2.4, a=1.0):
    f = hz(m); t = tt(d)
    parts = (1.0, 2.76, 5.40, 8.93)
    amps = (1.0, 0.38, 0.16, 0.07)
    y = np.zeros_like(t)
    for p, w in zip(parts, amps):
        y += w * np.sin(2 * np.pi * f * p * t) * np.exp(-t * (1.1 + 0.35 * p))
    return a * y * np.minimum(1, t / 0.008) * np.clip((d - t) / 0.3, 0, 1)

def water_glass(m, d=3.2, a=1.0):
    f = hz(m); t = tt(d)
    parts = (1.0, 2.32, 4.25, 6.63, 9.38)
    amps = (1.0, 0.45, 0.18, 0.08, 0.035)
    y = np.zeros_like(t)
    for p, w in zip(parts, amps):
        y += w * np.sin(2 * np.pi * f * p * t) * np.exp(-t * (0.35 + 0.12 * p))
    y += 0.04 * bandnoise(d, 900, 2600) * np.exp(-t * 3.5)
    return a * y * np.minimum(1, t / 0.12) * np.clip((d - t) / 0.4, 0, 1)

def light_timp(a=1.0):
    t = tt(0.55)
    f = 92 * np.exp(-t * 6.5) + 58
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5)
    skin = bandnoise(0.05, 60, 320) * np.exp(-np.arange(int(0.05 * SR)) / SR * 28)
    y[:len(skin)] += 0.28 * skin
    return a * y * np.minimum(1, t / 0.006)

def land_thump(a=1.0):
    t = tt(0.18)
    y = np.sin(2 * np.pi * (88 + 36 * np.exp(-t * 26)) * t) * np.exp(-t * 13)
    click = bandnoise(0.03, 280, 1300) * np.exp(-np.arange(int(0.03 * SR)) / SR * 46)
    y[:len(click)] += 0.22 * click
    return a * y

def sear_sizzle(d, a=1.0):
    return a * sizzle(d, a=1.0, crack_rate=120)

def butter_soft_land(a=1.0):
    """Solid butter block landing — soft thud, not liquid pour."""
    t = tt(0.22)
    y = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 18)) * t) * np.exp(-t * 11)
    soft = bandnoise(0.08, 200, 900) * np.exp(-np.arange(int(0.08 * SR)) / SR * 28)
    y[:len(soft)] += 0.35 * soft
    return a * y

def butter_melt_hiss(d, a=1.0):
    """Gentle melting hiss as butter softens — not pour/glug."""
    return a * 0.55 * sizzle(d, a=1.0, crack_rate=40) + a * 0.25 * bandnoise(d, 180, 700) * np.linspace(0.3, 1.0, int(round(d * SR)))[:int(round(d * SR))]

def thermo_click(a=1.0):
    """Probe insert + dial tick — short plastic/metal click, not UI ding."""
    t = tt(0.14)
    y = bandnoise(0.14, 1800, 6500) * np.exp(-t * 55)
    tick = np.sin(2 * np.pi * 920 * t) * np.exp(-t * 40)
    return a * (0.7 * y + 0.45 * tick)

def thermo_beep_ok(a=1.0):
    """Soft confirmation when ≥74°C — short double chime, hall-compatible."""
    return a * 0.85 * hand_chime(79, 1.4, 1.0)  # G5

# ================= MUSIC: G Mixolydian organum ~84 BPM =================
bpm = 84; beat = 60 / bpm; bar = 4 * beat; t0 = 1.0
roots = [43, 41, 48, 43, 43, 41, 50, 43]
fifths = [r + 7 for r in roots]
harp_chords = [
    [55, 59, 62, 67],
    [53, 57, 60, 65],
    [48, 52, 55, 60],
    [55, 59, 62, 67],
    [55, 62, 67, 71],
    [53, 57, 60, 65],
    [50, 53, 57, 62],
    [55, 59, 62, 67],
]
harp_pat_A = [(0.0, 0), (1.0, 1), (2.0, 2), (3.0, 3)]
harp_pat_B = [(0.0, 0), (0.75, 2), (1.5, 1), (2.25, 3), (3.0, 2)]
harp_pat_C = [(0.5, 1), (1.5, 3), (2.5, 2), (3.5, 0)]

k = 0
while True:
    ts = t0 + k * bar
    if ts >= D - 0.35: break
    ci = k % 8
    root, fifth, ch = roots[ci], fifths[ci], harp_chords[ci]
    sec = ('intro' if ts < 3.5 else 'A' if ts < 18 else 'B' if ts < 34
           else 'C' if ts < 48 else 'D' if ts < 64 else 'E' if ts < 94
           else 'F' if ts < 110 else 'outro')
    on = lambda bt: ts + bt * beat
    fade = 1.0
    if sec == 'outro':
        fade = max(0.0, 1 - (ts - 110) / 10)
    if sec == 'intro':
        fade = 0.4 + 0.45 * min(1, k / 2)

    ped_g = 0.30 * fade
    if sec == 'intro': ped_g *= 0.7
    M.add('pedal', on(0), organ_pedal(root, 4.15 * beat, 1.0), ped_g)
    M.add('organum', on(0), organum_voice(fifth, 3.8 * beat, 1.0), 0.16 * fade)
    if sec in ('C', 'D', 'E', 'F') and k % 2 == 0:
        M.add('organum', on(2), organum_voice(root + 19, 1.6 * beat, 0.85), 0.10 * fade, pan=0.15)

    pat = harp_pat_A if sec in ('intro', 'A', 'outro') else harp_pat_B if sec in ('B', 'D', 'F') else harp_pat_C
    for bt, idx in pat:
        note = ch[idx % len(ch)]
        g = 0.20 * fade
        if sec == 'intro': g *= 0.65
        M.add('harp', on(bt), hall_harp(note, 1.05, 1.0), g, pan=(-0.18 + 0.28 * ((idx + k) % 3) / 2))

    if sec in ('A', 'C', 'E') and k % 4 == 0:
        M.add('chime', on(0), hand_chime(ch[2] + 12, 2.6, 1.0), 0.11 * fade, pan=0.22)
    if sec in ('B', 'D', 'F') and k % 4 == 2:
        M.add('chime', on(2), hand_chime(ch[3], 2.2, 0.9), 0.09 * fade, pan=-0.18)

    if sec in ('D', 'E', 'F') and k % 4 == 1:
        M.add('glass', on(0), water_glass(ch[1] + 12, 3.0, 1.0), 0.10 * fade, pan=-0.12)

    if sec not in ('intro',) and k % 2 == 0:
        M.add('timp', on(0), light_timp(0.9), 0.16 * fade)
        if sec in ('E', 'F') and k % 4 == 0:
            M.add('timp', on(2.5), light_timp(0.55), 0.08 * fade)

    k += 1

M.add('glass', E['hero'], water_glass(79, 3.6, 1.0), 0.16)
M.add('chime', E['done'], hand_chime(67, 3.2, 1.0), 0.18)

# ================= SFX cues (aligned to timeline ev) =================
cue(E['ignite'], 'ignite', ignite(1.0), 0.42)
cue(E['pan_heat'][0], 'flame', flame_bed(E['pan_heat'][1] - E['pan_heat'][0], 0.7), 0.16)

# v2: butter BLOCKS — soft land + melt hiss (REMOVED butter_pour / glug)
cue(E['butter']['enter'], 'butter_in', whoosh(0.28, up=True), 0.12)
bd0, bd1 = E['butter']['drop']
for i in range(3):
    ti = bd0 + i * ((bd1 - bd0) / 2)
    cue(ti, 'butter_drop', butter_soft_land(0.9), 0.22, pan=(i - 1) * 0.1)
bm0, bm1 = E['butter']['melt']
cue(bm0 + 0.3, 'butter_melt', butter_melt_hiss(bm1 - bm0 - 0.3, 0.9), 0.18)

def drop_cues(spec, name, g0=0.12):
    for i in range(spec['count']):
        ti = spec['start'] + i * spec['gap'] + spec.get('fall', 0.26) * 0.85
        cue(ti, name, land_thump(0.65), g0 + 0.025 * (i % 3), pan=(i % 5 - 2) * 0.07)

drop_cues(E['onion_drop'], 'onion')
drop_cues(E['garlic_drop'], 'garlic', 0.10)
drop_cues(E['ginger_drop'], 'ginger', 0.10)

for key in ('stir1', 'stir2', 'stir3', 'stir4'):
    st = E[key]
    n_scr = max(1, int((st[1] - st[0]) * 0.9 * 2))
    for i in range(n_scr):
        ti = st[0] + i * ((st[1] - st[0]) / n_scr)
        cue(ti, 'scrape', scrape(0.8, d=0.14), 0.15, pan=np.sin(i * 0.7) * 0.24)

sp = E['spices']
for i in range(sp['count']):
    ti = sp['start'] + i * sp['gap']
    cue(ti, 'spice', sprinkle(0.08, 3, 0.8), 0.10, pan=(i % 5 - 2) * 0.08)

tp = E['tomato']['pour']
cue(E['tomato']['enter'], 'tomato_in', whoosh(0.3, up=True), 0.15)
cue(tp[0], 'tomato_pour', pour(tp[1] - tp[0], lo=340, hi=1900, a=1.0, glug=5), 0.44)

cp = E['cream']['pour']
cue(E['cream']['enter'], 'cream_in', whoosh(0.28, up=True), 0.14)
cue(cp[0], 'cream_pour', pour(cp[1] - cp[0], lo=480, hi=2600, a=1.0, glug=3), 0.40)

cd = E['chicken_drop']
drop_cues(cd, 'chicken', 0.13)
cue(cd['start'] + 0.18, 'sear', sear_sizzle(E['stir4'][1] - cd['start'], 0.85), 0.20)
# gentle simmer bed through cook window
cue(E['simmer'][0], 'simmer', flame_bed(E['simmer'][1] - E['simmer'][0], 0.55), 0.10)

# thermometer insert + safe-temp confirm
Th = E['thermometer']
cue(Th['enter'], 'thermo_in', thermo_click(1.0), 0.28)
cue(Th['read'][0] + (Th['read'][1] - Th['read'][0]) * 0.85, 'thermo_ok', thermo_beep_ok(0.9), 0.16)

cue(E['rice_plate'], 'rice', land_thump(0.85), 0.28)
sb = E['sauce_boat']['pour']
cue(E['sauce_boat']['enter'], 'sauce_in', whoosh(0.26), 0.14)
cue(sb[0], 'sauce_pour', pour(sb[1] - sb[0], lo=360, hi=2000, a=1.0, glug=4), 0.42)
cue(E['chicken_plate'], 'plate_chicken', land_thump(0.7), 0.20)
for i in range(4):
    cue(E['garnish'] + i * 0.08, 'garnish', land_thump(0.4), 0.10, pan=(i - 1.5) * 0.1)

cue(E['card'], 'card', light_timp(0.8), 0.22)

# ---------- mix & write ----------
N = M.N; tA = np.arange(N) / SR
music = (M.get('pedal') + M.get('organum') + M.get('harp')
         + M.get('chime') + M.get('glass') + M.get('timp'))
music = reverb(music, 2.2, .32, lp=6800)
sfx = reverb(M.get('sfx'), .5, .12, lp=9000)
se = np.abs(sfx).mean(1); w = int(.25 * SR)
se = np.convolve(se, np.ones(w) / w, 'same'); se /= se.max() + 1e-9
music *= (1 - .34 * se)[:, None]
music /= np.sqrt((music ** 2).mean()) + 1e-9
sfx /= np.sqrt((sfx ** 2).mean()) + 1e-9
mix = .48 * music + .58 * sfx
fade = np.minimum(1, tA / .3) * np.clip((D - tA) / 2.5, 0, 1)
mix *= fade[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * 1.25; mix = np.tanh(mix) / np.tanh(1.25)
mix *= db(-16) / (np.sqrt((mix ** 2).mean()) + 1e-9)
mix = limiter(mix, db(-3.0))
os.makedirs(os.path.join(here, 'build'), exist_ok=True)
write_wav(os.path.join(here, 'build', 'mix.wav'), mix)
json.dump(sorted(cues), open(os.path.join(here, 'build', 'sfx_cues.json'), 'w'), ensure_ascii=False, indent=0)
print('mix.wav written', D, 's;', len(cues), 'cues')
print('SFX_CHANGES: removed butter_pour/glug; added butter_drop×3, butter_melt hiss, thermo_in, thermo_ok, simmer bed')
