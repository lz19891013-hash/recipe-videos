"""EP18 Mango Pomelo Sago audio — sunny indoor studio pastorale ~94 BPM, G major.
Harp arpeggios + pizzicato strings + clarinet/woodwind + light finger-bell fragments + soft shaker.
Written from scratch for this episode — NOT afrobeat, lo-fi, funk, UI ding, toy-piano,
marimba, Rhodes, indie-pop jangle, Mediterranean nylon+oud/riq, Gershwin foxtrot, disco or chiptune.
"""
import json, sys, os, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../lib'))
from synth import *

here = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(here, 'timeline.json'))); E = TL['ev']
D = TL['duration']; M = Mix(D); seed(20261108); cues = []

def cue(t, name, sig, gain=1.0, pan=0.0, bus='sfx'):
    M.add(bus, t, sig, gain, pan); cues.append((round(t, 3), name))

# ---------- fresh pastorale instruments ----------
def harp_note(m, d=1.35, a=1.0):
    """Open harp pluck: singing fundamental, quickly dying upper partials, nail whisper."""
    f = hz(m); t = tt(d)
    y = np.zeros_like(t)
    for k, w, dec in ((1, 1.00, 1.45), (2, 0.42, 3.2), (3, 0.20, 5.6),
                      (4, 0.11, 8.4), (5, 0.06, 12.0), (7, 0.03, 16.5)):
        y += w * np.sin(2 * np.pi * k * f * t * (1 + 0.00025 * k)) * np.exp(-t * dec)
    click = bandnoise(0.007, 1600, 7200)
    click = click * np.exp(-np.arange(len(click)) / SR * 150)
    y[:len(click)] += 0.16 * click
    return a * y * np.minimum(1, t / 0.003) * np.clip((d - t) / 0.07, 0, 1)

def pizz_note(m, d=0.42, a=1.0):
    """Left-hand pizzicato: wood thump + short singing string, not a guitar nail."""
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7.8)
    y += 0.32 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 13)
    y += 0.10 * np.sin(2 * np.pi * f * 3.02 * t) * np.exp(-t * 19)
    body = bandnoise(0.018, 90, 420)
    body = body * np.exp(-np.arange(len(body)) / SR * 65)
    y[:len(body)] += 0.24 * body
    attack = bandnoise(0.005, 700, 2800)
    attack = attack * np.exp(-np.arange(len(attack)) / SR * 170)
    y[:len(attack)] += 0.14 * attack
    return a * y * np.minimum(1, t / 0.002)

def clarinet_note(m, d=1.9, a=1.0):
    """Soft clarinet: odd-harmonic cylinder + a little breath. Lyrical 4/4, not a minuet."""
    f = hz(m); t = tt(d)
    vib = 1 + 0.0038 * np.sin(2 * np.pi * 5.1 * t) * np.minimum(1, t / 0.35)
    y = np.zeros_like(t)
    for k, w in ((1, 1.0), (3, 0.42), (5, 0.16), (7, 0.07), (2, 0.07), (4, 0.035)):
        y += w * np.sin(2 * np.pi * k * f * vib * t)
    y /= 1.75
    breath = bandnoise(d, 1600, 4600) * 0.035 * (0.55 + 0.45 * np.sin(2 * np.pi * 2.8 * t))
    y = y + breath[:len(y)]
    return a * y * env(len(y), 0.07, 0.16) * np.clip((d - t) / 0.14, 0, 1)

def finger_bell(m, d=1.5, a=1.0):
    """Quiet finger-bell / struck rod — warm, not a sharp UI ding or toy glock."""
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2)
    y += 0.28 * np.sin(2 * np.pi * f * 2.71 * t) * np.exp(-t * 4.1)
    y += 0.09 * np.sin(2 * np.pi * f * 5.15 * t) * np.exp(-t * 6.8)
    return a * 0.62 * y * np.minimum(1, t / 0.003)

def studio_shaker(a=1.0):
    t = tt(0.052)
    return a * bandnoise(0.052, 3200, 8800) * np.exp(-t * 52) * np.minimum(1, t / 0.002)

def sago_plop(a=1.0, f0=340):
    t = tt(0.13)
    y = np.sin(2 * np.pi * f0 * t) * np.exp(-t * 22)
    splash = bandnoise(0.05, 400, 2200)
    splash = splash * np.exp(-np.arange(len(splash)) / SR * 38)
    y[:len(splash)] += 0.35 * splash
    return a * y

def mango_chop(a=1.0):
    t = tt(0.15)
    thump = np.sin(2 * np.pi * (78 * t + 70 * (1 - np.exp(-t * 28)))) * np.exp(-t * 26)
    click = bandnoise(0.15, 1800, 7500) * np.exp(-t * 140)
    flesh = bandnoise(0.15, 300, 1400) * np.exp(-t * 40)
    return a * (0.7 * thump + 0.45 * click + 0.4 * flesh)

def pomelo_pull(a=1.0):
    t = tt(0.22)
    y = bandnoise(0.22, 500, 2800) * np.sin(np.pi * t / 0.22) ** 1.4
    y += 0.35 * bandnoise(0.22, 1800, 6500) * np.exp(-t * 18)
    return a * y

def cream_pour(d, a=1.0):
    """Thicker than water — lower band, slower glug."""
    return pour(d, lo=220, hi=1600, a=a, glug=3.6)

def ice_clink(a=1.0):
    t = tt(0.35)
    y = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in ((2100, 9), (3450, 13), (4820, 18)))
    return a * y / 3 * np.minimum(1, t / 0.002)

def knife_scrape(a=1.0, d=0.2):
    t = tt(d)
    return a * bandnoise(d, 900, 4200) * np.sin(np.pi * t / d) ** 2 * (0.75 + 0.25 * np.sin(2 * np.pi * 48 * t))

def simmer_bed(d, a=1.0):
    t = tt(d)
    y = 0.55 * bandnoise(d, 80, 350) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.9 * t))
    y += 0.35 * crackle(d, 14)
    return a * y * env(len(t), 0.25, 0.4)

# ---------- score: 94 BPM, G major, 4/4 pastorale ----------
BPM = 94.0
beat = 60.0 / BPM
bar = beat * 4

# Harmony (two-bar cells): G  C  G  D  Em  C  G  D
# MIDI: G3=55/67, B3=71, C4=72, D4=74, E4=76, G4=79, A3=69, F#4=78
CELLS = [
    (55, 67, 71, 74, 79),  # G
    (48, 60, 64, 67, 72),  # C
    (55, 67, 71, 74, 79),  # G
    (50, 62, 66, 69, 74),  # D
    (52, 64, 67, 71, 76),  # Em
    (48, 60, 64, 67, 72),  # C
    (55, 67, 71, 74, 79),  # G
    (50, 62, 66, 69, 74),  # D
]
n_bars = int(np.ceil(D / bar)) + 1

# harp arpeggios every bar (root-3-5-8-5-3)
for i in range(n_bars):
    t0 = i * bar
    if t0 > D - 0.4: break
    cell = CELLS[i % 8]
    pattern = [cell[1], cell[2], cell[3], cell[4], cell[3], cell[2], cell[1], cell[3]]
    # slightly sparser in intro / card
    dens = 1.0
    if t0 < 6: dens = 0.65
    if t0 >= 105: dens = 0.45
    for k, m in enumerate(pattern):
        if dens < 1 and k % 2 == 1 and i % 2 == 0: continue
        tt0 = t0 + k * (beat / 2)
        if tt0 >= D: break
        M.add('harp', tt0, harp_note(m, 1.25 if k < 6 else 1.5, 1.0), 0.22, pan=-0.15 + (k % 3) * 0.1)

# pizzicato bass on beats 1 and 3, extra root on 4 in later sections
for i in range(n_bars):
    t0 = i * bar
    if t0 > D - 0.3: break
    root = CELLS[i % 8][0]
    fifth = CELLS[i % 8][0] + 7
    M.add('pizz', t0, pizz_note(root, 0.5, 1.0), 0.28, pan=-0.05)
    M.add('pizz', t0 + 2 * beat, pizz_note(fifth - 12 if fifth > 60 else fifth, 0.45, 1.0), 0.22, pan=0.05)
    if 24 < t0 < 100:
        M.add('pizz', t0 + 3 * beat, pizz_note(root, 0.32, 0.85), 0.16, pan=0.0)

# clarinet phrases — long lyrical calls, not a courtly minuet tune
CLAR = [
    (4.0, 74, 1.8), (6.2, 76, 1.6), (8.0, 79, 2.2),
    (12.5, 76, 1.5), (14.4, 74, 1.8), (17.0, 71, 2.0),
    (26.0, 79, 1.7), (28.2, 78, 1.3), (30.0, 76, 1.8), (32.5, 74, 2.1),
    (38.0, 72, 1.6), (40.2, 74, 1.5), (42.4, 76, 2.0),
    (48.0, 71, 1.7), (50.2, 72, 1.5), (52.5, 74, 2.2),
    (60.0, 79, 1.8), (62.4, 76, 1.6), (64.5, 74, 1.9),
    (72.0, 76, 1.5), (74.0, 79, 2.0), (77.0, 81, 1.6), (79.2, 79, 2.2),
    (88.0, 76, 1.7), (90.2, 74, 1.6), (92.5, 72, 1.8), (95.0, 71, 2.4),
    (101.0, 74, 2.0), (104.0, 76, 1.8), (107.0, 74, 2.4), (110.0, 67, 3.0),
]
for t0, m, d in CLAR:
    if t0 < D:
        M.add('clar', t0, clarinet_note(m, d, 1.0), 0.20, pan=0.12)

# light finger-bell fragments — phrase ends only, mid-high, warm
BELLS = [8.0, 16.0, 24.0, 33.6, 46.0, 58.2, 74.0, 88.2, 99.2, 105.0]
for i, t0 in enumerate(BELLS):
    if t0 < D:
        M.add('bell', t0, finger_bell(79 if i % 2 == 0 else 76, 1.4, 1.0), 0.14, pan=0.22)
        if i % 3 == 2:
            M.add('bell', t0 + beat, finger_bell(74, 1.1, 0.8), 0.10, pan=0.18)

# soft shaker on 8ths from bar 2, duck under the card
for i in range(int(D / (beat / 2))):
    t0 = 5.0 + i * (beat / 2)
    if t0 >= 104 or t0 >= D: break
    acc = 0.09 if i % 2 == 0 else 0.055
    M.add('shaker', t0, studio_shaker(1.0), acc, pan=-0.08 + (i % 4) * 0.04)

# ---------- foley locked to picture ----------
# kettle in / water into empty pot
cue(E['water']['enter'], 'kettle_in', whoosh(0.4, up=True), 0.16)
cue(E['water']['pour'][0], 'water_pour', pour(E['water']['pour'][1] - E['water']['pour'][0], lo=450, hi=3200, a=1.0, glug=5.2), 0.42)

# sago pearls drop into water
sc = E['sago']
for i in range(sc['count']):
    ti = sc['start'] + i * sc['gap'] + sc['fall'] * 0.85
    cue(ti, 'sago_plop', sago_plop(0.8, 300 + (i % 7) * 18), 0.14, pan=(i % 5 - 2) * 0.08)

# simmer during cook (stir → check → cover)
cue(E['cook'][0], 'simmer', simmer_bed(E['cook'][1] - E['cook'][0] + 0.4, 1.0), 0.22)
st = E['stir']
for i in range(int((st['end'] - st['start']) / 0.28)):
    cue(st['start'] + i * 0.28, 'stir', whisk_stroke(0.85), 0.16, pan=-0.06)
cue(E['check']['start'] + 0.08, 'check_lift', whoosh(0.28, up=True), 0.10)
cue(E['lid']['on'] + 0.05, 'lid_on', clang(0.55), 0.18)
cue(E['lid']['off'] + 0.04, 'lid_off', clang(0.4), 0.12)
cue(E['rinse']['enter'], 'rinse_in', whoosh(0.3), 0.12)
cue(E['rinse']['pour'][0], 'rinse', pour(E['rinse']['pour'][1] - E['rinse']['pour'][0], lo=500, hi=3400, a=0.95, glug=6.0), 0.34)

# mango cuts + scores
for j, ct in enumerate(E['cheek_cuts']):
    cue(ct + 0.28, 'mango_cut', mango_chop(1.0), 0.38, pan=-0.2 + j * 0.15)
    cue(ct + 0.28, 'board_knock', chop(0.7, wood=True), 0.16)
scfg = E['score']
for i in range(scfg['count']):
    cue(scfg['start'] + i * scfg['gap'] + 0.05, 'score', knife_scrape(0.85, 0.16), 0.18, pan=-0.12)
dc = E['dice']
for i in range(min(8, dc['count'])):
    cue(dc['start'] + i * dc['gap'] + 0.05, 'cube', mango_chop(0.7), 0.16, pan=(i % 4 - 1.5) * 0.1)

# pomelo pulls
pc = E['pomelo_pull']
for i in range(pc['count']):
    cue(pc['start'] + i * pc['gap'], 'pomelo', pomelo_pull(0.9), 0.22, pan=-0.18 + (i % 3) * 0.1)

# coconut / evap / sugar into pitcher
cue(E['coco']['enter'], 'coco_in', whoosh(0.32, up=True), 0.14)
cue(E['coco']['pour'][0], 'coco_pour', cream_pour(E['coco']['pour'][1] - E['coco']['pour'][0], 1.0), 0.46)
cue(E['evap']['enter'], 'evap_in', whoosh(0.28), 0.12)
cue(E['evap']['pour'][0], 'evap_pour', pour(E['evap']['pour'][1] - E['evap']['pour'][0], lo=280, hi=1900, a=1.0, glug=4.2), 0.38)
sg = E['sugar']
cue(sg['start'], 'sugar', sprinkle(sg['count'] * sg['gap'] + 0.25, sg['count'], a=1.0), 0.32)
for i in range(sg['count']):
    cue(sg['start'] + i * sg['gap'] + sg['fall'] * 0.8, 'sugar_hit', tick(0.5, 2400 + i * 80), 0.08)

# assemble transfers
for i in range(0, E['sago_to_glass']['count'], 3):
    ti = E['sago_to_glass']['start'] + i * E['sago_to_glass']['gap'] + E['sago_to_glass']['fly'] * 0.85
    cue(ti, 'sago_land', sago_plop(0.55, 380 + i), 0.10, pan=0.15)
for i in range(E['mango_to_glass']['count']):
    ti = E['mango_to_glass']['start'] + i * E['mango_to_glass']['gap'] + E['mango_to_glass']['fly'] * 0.9
    cue(ti, 'mango_land', mango_chop(0.45), 0.14, pan=0.18)
for i in range(E['pomelo_to_glass']['count']):
    ti = E['pomelo_to_glass']['start'] + i * E['pomelo_to_glass']['gap'] + E['pomelo_to_glass']['fly'] * 0.85
    cue(ti, 'pomelo_land', pomelo_pull(0.55), 0.12, pan=0.16)

# milk from pitcher into glass
cue(E['milk_pour']['enter'], 'pitcher_in', whoosh(0.35), 0.14)
cue(E['milk_pour']['pour'][0], 'milk_pour', cream_pour(E['milk_pour']['pour'][1] - E['milk_pour']['pour'][0], 1.0), 0.5)

# ice
ic = E['ice']
for i in range(ic['count']):
    cue(ic['start'] + i * ic['gap'] + ic['fall'] * 0.88, 'ice', ice_clink(0.9), 0.28, pan=0.1 * i)

# paint-over scrapes at step boundaries
for tw in (24.0, 46.0, 58.0, 74.0, 96.0):
    cue(tw, 'paint_scrape', knife_scrape(1.0, 0.28), 0.2)

cue(E['done'], 'done', finger_bell(79, 1.8, 1.0), 0.22)
cue(E['hero'], 'hero', harp_note(79, 1.6, 1.0), 0.2)
cue(E['card'], 'card', pizz_note(55, 0.6, 1.0), 0.24)

# ---------- mix ----------
N = M.N; tA = np.arange(N) / SR
music = (M.get('harp') + M.get('pizz') + M.get('clar') + M.get('bell') + M.get('shaker'))
music = reverb(music, 1.7, .26, lp=7600)
sfx = reverb(M.get('sfx'), .45, .10, lp=8800)
se = np.abs(sfx).mean(1); w = int(.25 * SR)
se = np.convolve(se, np.ones(w) / w, 'same'); se /= se.max() + 1e-9
music *= (1 - .32 * se)[:, None]
music /= np.sqrt((music ** 2).mean()) + 1e-9
sfx /= np.sqrt((sfx ** 2).mean()) + 1e-9
mix = .50 * music + .60 * sfx
fade = np.minimum(1, tA / .3) * np.clip((D - tA) / 2.5, 0, 1)
mix *= fade[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * 1.22
mix = np.tanh(mix) / np.tanh(1.22)
mix *= db(-16) / (np.sqrt((mix ** 2).mean()) + 1e-9)
mix = limiter(mix, db(-3.0))
os.makedirs(os.path.join(here, 'build'), exist_ok=True)
write_wav(os.path.join(here, 'build', 'mix.wav'), mix)
json.dump(sorted(cues), open(os.path.join(here, 'build', 'sfx_cues.json'), 'w'), ensure_ascii=False, indent=0)
print('mix.wav written', D, 's;', len(cues), 'cues')
