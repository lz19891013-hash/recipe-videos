"""EP17 French Onion Soup audio — 1920s–30s Gershwin foxtrot / symphonic jazz ~100 BPM.
Clarinet + muted trumpet + stride piano fragments + walking pizz bass + brushes.
Fresh from scratch — NOT afrobeat/lo-fi/funk/UI ding/toy-piano/marimba/Rhodes/indie-pop/Mediterranean."""
import json, sys, os, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../lib'))
from synth import *

here = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(here, 'timeline.json'))); E = TL['ev']
D = TL['duration']; M = Mix(D); seed(20261107); cues = []

def cue(t, name, sig, gain=1.0, pan=0.0, bus='sfx'):
    M.add(bus, t, sig, gain, pan); cues.append((round(t, 3), name))

# ---------- fresh period-jazz instruments ----------
def clarinet(m, d=0.55, a=1.0):
    """Warm clarinet — odd partials + soft chiff attack (not toy/lead)."""
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.8)
    y += 0.55 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t * 3.2)
    y += 0.22 * np.sin(2 * np.pi * f * 5 * t) * np.exp(-t * 5.5)
    y += 0.1 * np.sin(2 * np.pi * f * 7 * t) * np.exp(-t * 8)
    # chiff / breath
    ch = bandnoise(0.03, 1200, 4500) * np.exp(-np.arange(int(0.03 * SR)) / SR * 55)
    y[:len(ch)] += 0.18 * ch
    # gentle vibrato
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t)
    y *= vib
    return a * y * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.06, 0, 1)

def muted_trumpet(m, d=0.45, a=1.0):
    """Muted trumpet wah — brass buzz + low-pass mute colour."""
    f = hz(m); t = tt(d)
    y = saw(f, d, bright=0.55)[:len(t)] * np.exp(-t * 3.5)
    y += 0.35 * square(f * 0.997, d, bright=0.3)[:len(t)] * np.exp(-t * 4.5)
    # mute: dull highs
    y = fft_filter(y, lo=180, hi=2800)
    # wah envelope
    wah = 0.55 + 0.45 * np.sin(2 * np.pi * 2.5 * t)
    y *= wah
    atk = bandnoise(0.015, 800, 3000) * np.exp(-np.arange(int(0.015 * SR)) / SR * 70)
    y[:len(atk)] += 0.2 * atk
    return a * y * np.minimum(1, t / 0.01)

def stride_piano(m, d=0.35, a=1.0):
    """Stride piano fragment — brighter hammer than upright, shorter than Rhodes."""
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5)
    y += 0.45 * np.sin(2 * np.pi * f * 2.003 * t) * np.exp(-t * 9)
    y += 0.18 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 14)
    y += 0.08 * np.sin(2 * np.pi * f * 4.02 * t) * np.exp(-t * 20)
    hammer = bandnoise(0.01, 600, 5000) * np.exp(-np.arange(int(0.01 * SR)) / SR * 100)
    y[:len(hammer)] += 0.35 * hammer
    return a * y * np.minimum(1, t / 0.002)

def pizz_bass(m, d=0.4, a=1.0):
    """Walking pizz bass — woody thump + short decay (not slap/synth)."""
    f = hz(m); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    y += 0.4 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 12)
    thump = bandnoise(0.025, 80, 400) * np.exp(-np.arange(int(0.025 * SR)) / SR * 40)
    y[:len(thump)] += 0.45 * thump
    click = bandnoise(0.008, 900, 3500) * np.exp(-np.arange(int(0.008 * SR)) / SR * 90)
    y[:len(click)] += 0.2 * click
    return a * y * np.minimum(1, t / 0.003)

def jazz_brush(a=1.0, d=0.14):
    """Brush on snare — soft sweep, NOT lo-fi hat or dusty afrobeat."""
    t = tt(d)
    y = bandnoise(d, 1500, 7000) * np.exp(-t * 18)
    y += 0.3 * bandnoise(d, 400, 1800) * np.exp(-t * 12)
    return a * y * np.minimum(1, t / 0.008)

def jazz_brush_swish(a=1.0):
    t = tt(0.22)
    env_ = np.sin(np.pi * np.clip(t / 0.22, 0, 1))
    y = bandnoise(0.22, 2000, 8000) * env_
    return a * y * 0.7

def land_thump(a=1.0):
    t = tt(0.2)
    y = np.sin(2 * np.pi * (90 + 40 * np.exp(-t * 28)) * t) * np.exp(-t * 14)
    click = bandnoise(0.03, 300, 1400) * np.exp(-np.arange(int(0.03 * SR)) / SR * 48)
    y[:len(click)] += 0.28 * click
    return a * y

def knife_chop(a=1.0):
    return chop(a, wood=True)

def stir_scrape(a=1.0):
    return scrape(a, d=0.18)

def cheese_soft(a=1.0):
    t = tt(0.12)
    y = np.sin(2 * np.pi * 220 * t) * np.exp(-t * 22)
    bn = bandnoise(0.08, 200, 900) * np.exp(-np.arange(int(0.08 * SR)) / SR * 30)
    y[:len(bn)] += 0.4 * bn
    return a * y

# ================= MUSIC: C major foxtrot ~100 BPM =================
bpm = 100; beat = 60 / bpm; bar = 4 * beat; t0 = 1.0
# I – vi – ii – V  (Gershwin-friendly cycle)
chords = [
    [60, 64, 67],       # C
    [57, 60, 64],       # Am
    [62, 65, 69],       # Dm
    [55, 59, 62, 65],   # G7
    [60, 64, 67, 71],   # Cmaj7
    [57, 60, 64, 67],   # Am7
    [53, 57, 60],       # F
    [55, 59, 62, 65],   # G7
]
bass_walk = [36, 40, 41, 43, 36, 33, 29, 31]  # C E F G / C A F G
# stride LH-RH patterns (beat offsets within bar)
stride_lh = [(0.0, 0), (2.0, 0)]
stride_rh = [(0.5, 1), (1.0, 2), (1.5, 1), (2.5, 2), (3.0, 1), (3.5, 0)]
clarinet_licks = [
    [(0.0, 2), (1.0, 1), (2.0, 0), (3.0, 2)],
    [(0.5, 1), (1.5, 2), (2.5, 0), (3.5, 1)],
    [(0.0, 0), (0.75, 1), (1.5, 2), (2.5, 1), (3.25, 0)],
]
trumpet_hits = [(0.0, 2), (2.0, 0)]

k = 0
while True:
    ts = t0 + k * bar
    if ts >= D - 0.4: break
    ci = k % 8; ch = chords[ci]; root = bass_walk[ci]
    sec = ('intro' if ts < 4 else 'A' if ts < 18 else 'B' if ts < 32
           else 'C' if ts < 55 else 'D' if ts < 78 else 'E' if ts < 98
           else 'F' if ts < 105 else 'outro')
    on = lambda bt: ts + bt * beat
    fade = 1.0
    if sec == 'outro':
        fade = max(0.0, 1 - (ts - 105) / 10)
    if sec == 'intro':
        fade = 0.35 + 0.4 * min(1, k / 2)

    # brushes: soft 2+4 (foxtrot), NOT hats
    if sec in ('A', 'B', 'C', 'D', 'E', 'F', 'outro'):
        M.add('brush', on(1), jazz_brush(0.9, 0.12), 0.16 * fade, pan=0.15)
        M.add('brush', on(3), jazz_brush(0.75, 0.11), 0.13 * fade, pan=0.2)
        if sec in ('C', 'D', 'E') and k % 2 == 0:
            M.add('swish', on(2.5), jazz_brush_swish(0.7), 0.08 * fade, pan=-0.15)

    # walking pizz bass on every beat
    if sec != 'intro' or k >= 1:
        walk = [root, root + 4, root + 5, root + 7] if k % 2 == 0 else [root, root + 7, root + 5, root + 4]
        for bi, note in enumerate(walk):
            M.add('bass', on(bi), pizz_bass(note, 0.38, 0.95), 0.26 * fade)

    # stride piano fragments
    if sec in ('A', 'B', 'C', 'D', 'E', 'F'):
        for bt, idx in stride_lh:
            note = ch[0] - 12
            M.add('piano', on(bt), stride_piano(note, 0.45, 1.0), 0.18 * fade, pan=-0.2)
        rh = stride_rh if sec in ('C', 'D', 'E') else stride_rh[::2]
        for bt, idx in rh:
            note = ch[idx % len(ch)] + (12 if sec in ('E', 'F') and idx == 2 else 0)
            M.add('piano', on(bt), stride_piano(note, 0.28, 1.0), 0.14 * fade, pan=0.15)

    # clarinet lead (melody fragments)
    if sec in ('B', 'C', 'D', 'E', 'F') and k % 2 == 0:
        lick = clarinet_licks[k % len(clarinet_licks)]
        for bt, idx in lick:
            note = ch[idx % len(ch)] + 12
            M.add('clarinet', on(bt), clarinet(note, 0.5, 1.0), 0.2 * fade, pan=-0.1)

    # muted trumpet commentary (sparse answers)
    if sec in ('C', 'D', 'E') and k % 4 == 1:
        for bt, idx in trumpet_hits:
            note = ch[idx % len(ch)] + 12
            M.add('trumpet', on(bt + 0.05), muted_trumpet(note, 0.4, 1.0), 0.15 * fade, pan=0.25)

    # soft pad under later (strings-ish via pad, not Rhodes)
    if sec in ('D', 'E', 'F') and k % 2 == 0:
        M.add('pad', on(0), pad(ch, 3.6 * beat, a=0.4, r=0.75, bright=0.18), 0.07 * fade)

    k += 1

# ================= SFX cues =================
cue(E['pot_in'], 'pot_land', land_thump(1.0), 0.48)
cue(E['board_in'], 'board_land', land_thump(0.85), 0.35)

# knife chops
oc = E['onion_cut']
for i in range(oc['count']):
    ti = oc['start'] + i * oc['gap'] + oc['stroke'] * 0.55
    cue(ti, 'chop', knife_chop(0.85), 0.28, pan=(i % 5 - 2) * 0.08)

# butter pour tip-lock
bp = E['butter']['pour']
cue(E['butter']['enter'], 'butter_in', whoosh(0.35, up=True), 0.16)
cue(bp[0], 'butter_pour', pour(bp[1] - bp[0], lo=350, hi=2200, a=1.0, glug=4), 0.4)
cue(bp[0] + 0.3, 'butter_sizzle', sizzle(bp[1] - bp[0] - 0.2, a=0.7, crack_rate=40), 0.18)

# onion drop
od = E['onion_drop']
for i in range(od['count']):
    ti = od['start'] + i * od['gap'] + od['fall'] * 0.85
    cue(ti, 'onion', land_thump(0.55), 0.12 + 0.02 * (i % 3), pan=(i % 5 - 2) * 0.08)

# stir scrapes
s1 = E['stir1']
n_stir = int((s1[1] - s1[0]) * STIR_HZ * 2) if False else int((s1[1] - s1[0]) * 1.1)
# STIR_HZ mirrored from scene (~0.55)
for i in range(max(1, int((s1[1] - s1[0]) * 1.1))):
    ti = s1[0] + i * ((s1[1] - s1[0]) / max(1, int((s1[1] - s1[0]) * 1.1)))
    cue(ti, 'stir', stir_scrape(0.8), 0.16, pan=np.sin(i * 0.8) * 0.22)
cue(s1[0], 'sizzle_bed', sizzle(s1[1] - s1[0], a=0.55, crack_rate=60), 0.12)

# salt
sc = E['salt']
cue(sc['start'], 'salt', sprinkle(sc['count'] * sc['gap'] + 0.2, sc['count'], a=1.0), 0.32)

# wine pour
wp = E['wine']['pour']
cue(E['wine']['enter'], 'wine_in', whoosh(0.3), 0.15)
cue(wp[0], 'wine_pour', pour(wp[1] - wp[0], lo=500, hi=3200, a=1.0, glug=5.5), 0.42)

# broth pour
brp = E['broth']['pour']
cue(E['broth']['enter'], 'broth_in', whoosh(0.32), 0.15)
cue(brp[0], 'broth_pour', pour(brp[1] - brp[0], lo=280, hi=1800, a=1.0, glug=4), 0.48)

# ladle
cue(E['ladle'][0], 'ladle', whoosh(0.4), 0.18)
cue(E['ladle'][0] + 0.5, 'ladle_pour', pour(2.5, lo=300, hi=1600, a=0.9, glug=3), 0.3)

# baguette
bg = E['baguette']
for i in range(bg['count']):
    ti = bg['start'] + i * bg['gap'] + bg['fall'] * 0.9
    cue(ti, 'baguette', land_thump(0.8), 0.28, pan=(i - 1.5) * 0.12)
    cue(bg['start'] + i * bg['gap'], 'bag_whoosh', whoosh(0.25), 0.12)

# cheese
ch = E['cheese']
for i in range(ch['count']):
    ti = ch['start'] + i * ch['gap'] + ch['fall'] * 0.85
    cue(ti, 'cheese', cheese_soft(0.8), 0.14, pan=(i % 5 - 2) * 0.1)

# broil / melt
cue(E['broil'][0], 'broil', sizzle(E['broil'][1] - E['broil'][0], a=0.7, crack_rate=90), 0.2)
cue(E['broil'][0] + 0.5, 'melt', flame_bed(E['broil'][1] - E['broil'][0] - 0.5, a=0.5), 0.12)

# thyme
th = E['thyme']
for i in range(th['count']):
    ti = th['start'] + i * th['gap'] + th['fall'] * 0.85
    cue(ti, 'thyme', cheese_soft(0.5), 0.1, pan=(i % 5 - 2) * 0.1)

cue(E['done'], 'done', bell(hz(72), 2.2, a=0.45), 0.3)
cue(E['hero'], 'hero', clarinet(72, 1.0, 1.0), 0.22)
cue(E['card'], 'card', land_thump(0.7), 0.26)

# ---------- mix & write ----------
N = M.N; tA = np.arange(N) / SR
music = (M.get('clarinet') + M.get('trumpet') + M.get('piano') + M.get('bass')
         + M.get('pad') + M.get('brush') + M.get('swish'))
music = reverb(music, 1.6, .26, lp=7500)
sfx = reverb(M.get('sfx'), .5, .11, lp=9000)
se = np.abs(sfx).mean(1); w = int(.25 * SR)
se = np.convolve(se, np.ones(w) / w, 'same'); se /= se.max() + 1e-9
music *= (1 - .3 * se)[:, None]
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
