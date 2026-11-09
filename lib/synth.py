"""Reusable numpy synth + SFX library for recipe videos. All sounds are generated from scratch (no samples)."""
import numpy as np, wave
SR = 48000
_rng = np.random.default_rng(7)

def seed(s):
    global _rng; _rng = np.random.default_rng(s)
def tt(d): return np.arange(int(round(d * SR))) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def db(x): return 10 ** (x / 20)

class Mix:
    def __init__(self, dur): self.N = int(dur * SR); self.bus = {}
    def get(self, name):
        if name not in self.bus: self.bus[name] = np.zeros((self.N, 2))
        return self.bus[name]
    def add(self, name, t, sig, gain=1.0, pan=0.0):
        b = self.get(name); i = int(round(t * SR))
        if i >= self.N: return
        s = np.array(sig, float)
        nf = min(len(s) // 4, int(.001 * SR)); nr = min(len(s) // 4, int(.003 * SR))   # de-click: 1 ms fade-in, 3 ms fade-out
        if nf > 1: s[:nf] *= np.linspace(0, 1, nf)[:, None] if s.ndim == 2 else np.linspace(0, 1, nf)
        if nr > 1: s[-nr:] *= np.linspace(1, 0, nr)[:, None] if s.ndim == 2 else np.linspace(1, 0, nr)
        if s.ndim == 1: s = np.stack([s * np.sqrt(.5 - pan / 2) * 1.414, s * np.sqrt(.5 + pan / 2) * 1.414], 1)
        if i < 0: s = s[-i:]; i = 0
        s = s[:self.N - i]; b[i:i + len(s)] += s * gain

# ---------- filters ----------
def bandnoise(d, lo, hi, soft=.15, rng=None):
    rng = rng or _rng; n = max(8, int(round(d * SR))); x = rng.standard_normal(n)
    F = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR)
    m = 1 / (1 + np.exp(-(np.log2(f + 1) - np.log2(lo)) / soft)) * (1 / (1 + np.exp((np.log2(f + 1) - np.log2(hi)) / soft)))
    y = np.fft.irfft(F * m, n); return y / (np.abs(y).max() + 1e-9)
def fft_filter(x, lo=0, hi=SR / 2):
    n = len(x); F = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(n, 1 / SR); m = ((f >= lo) & (f <= hi)).astype(float)
    if x.ndim == 2: m = m[:, None]
    return np.fft.irfft(F * m, n, axis=0)
def sweepnoise(d, f0, f1, width=1.2, frames=24):
    """noise whose band center sweeps f0->f1 (log), overlap-add of filtered chunks"""
    n = int(round(d * SR)); hop = max(64, n // frames); out = np.zeros(n + 2 * hop); w = np.hanning(2 * hop)
    for k in range(frames + 1):
        c = f0 * (f1 / f0) ** (k / frames); seg_ = bandnoise(2 * hop / SR, c / 2 ** (width / 2), c * 2 ** (width / 2)) * w
        out[k * hop:k * hop + 2 * hop] += seg_[:len(out[k * hop:k * hop + 2 * hop])]
    return out[:n] / (np.abs(out[:n]).max() + 1e-9)
def env(n, a=.005, r=.1, hold=None):
    t = np.arange(n) / SR; d = n / SR; e = np.minimum(1, t / max(a, 1e-4))
    return e * np.clip((d - t) / max(r, 1e-4), 0, 1)
def expd(n, k): return np.exp(-np.arange(n) / SR * k)
def reverb(x, rt=1.6, mix=.25, pre=.012, lp=7000, seed_=3):
    rng = np.random.default_rng(seed_); n = int(rt * SR); t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-t * 6.9 / rt)[:, None]
    ir = fft_filter(ir, 80, lp); ir[:int(pre * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
    L = len(x) + n; nf = 1 << int(np.ceil(np.log2(L)))
    wet = np.fft.irfft(np.fft.rfft(x, nf, axis=0) * np.fft.rfft(ir, nf, axis=0), nf, axis=0)[:len(x)]
    return x * (1 - mix) + wet * mix * 3

# ---------- oscillators / instruments ----------
def saw(f, d, bright=1.0, detune=0.0, decay_h=0.0):
    t = tt(d); K = int(min(60, 14000 / f) * bright) or 1; y = np.zeros_like(t)
    for k in range(1, K + 1):
        a = 1 / k * (np.exp(-t * decay_h * k) if decay_h else 1)
        y += a * (np.sin(2 * np.pi * k * f * t) + (np.sin(2 * np.pi * k * f * (1 + detune) * t + k) if detune else 0))
    return y / (2 if detune else 1)
def square(f, d, bright=1.0):
    t = tt(d); K = int(min(40, 12000 / f) * bright) or 1; y = np.zeros_like(t)
    for k in range(1, K + 1, 2): y += np.sin(2 * np.pi * k * f * t) / k
    return y
def pad(notes, d, a=.6, r=.8, bright=.35):
    y = sum(saw(hz(m), d, bright, .004) for m in notes) / len(notes); n = len(y); t = np.arange(n) / SR
    return y * np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1)
def pluck(m, d=.35, bright=.8):
    f = hz(m); y = saw(f, d, bright, 0, decay_h=2.2); return y * expd(len(y), 9) * env(len(y), .002, .05)
def bass(m, d):
    f = hz(m); y = saw(f, d, .5, 0, decay_h=1.0) * .6 + np.sin(2 * np.pi * f * tt(d)) * .8; return y * env(len(y), .004, .05) * (.55 + .45 * expd(len(y), 6))
def lead(m, d, vib=5.5):
    t = tt(d); f = hz(m) * (1 + .006 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / .25)); ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(k * ph) / k for k in range(1, 12)) ; return y * env(len(y), .02, .12) * (.7 + .3 * expd(len(y), 3))
def bell(f, d=2.0, a=.3):
    t = tt(d); y = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * (2 + 2 * i)) * w for i, (r, w) in enumerate([(1, 1), (2.76, .5), (5.4, .25), (8.93, .12)]))
    return a * y * np.minimum(1, t / .002)
def kick(a=1.0):
    t = tt(.45); y = np.sin(2 * np.pi * (45 * t + 110 / 28 * (1 - np.exp(-t * 28)))) * np.exp(-t * 7)
    return a * (y + .25 * bandnoise(.45, 1500, 6000) * np.exp(-t * 120))
def snare(a=1.0):
    t = tt(.35); return a * (.7 * bandnoise(.35, 1200, 9000) * np.exp(-t * 16) + .5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25))
def hat(a=1.0, open_=False):
    t = tt(.3 if open_ else .06); return a * bandnoise(len(t) / SR, 7000, 15000) * np.exp(-t * (14 if open_ else 70))

# ---------- foley-style SFX (all synthetic) ----------
def crack(a=1.0):
    t = tt(.12); y = bandnoise(.12, 1200, 7000) * np.exp(-t * 60); y[:int(.002 * SR)] *= 1.6
    y2 = np.zeros_like(y); j = int(.018 * SR); y2[j:] = bandnoise(.12, 2000, 9000)[:len(y) - j] * np.exp(-t[:len(y) - j] * 120) * .7
    return a * (y + y2) / 2
def bloop(f0=500, f1=160, d=.18, a=1.0):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 22); return a * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * np.minimum(1, t / .003)
def chop(a=1.0, wood=True):
    t = tt(.16); thump = np.sin(2 * np.pi * (70 * t + 90 / 30 * (1 - np.exp(-t * 30)))) * np.exp(-t * 30)
    click = bandnoise(.16, 2500, 9000) * np.exp(-t * 160); knock = bandnoise(.16, 400, 1600) * np.exp(-t * 45)
    return a * (.8 * thump + .5 * click + (.4 * knock if wood else 0))
def shake(a=1.0):
    t = tt(.09); return a * bandnoise(.09, 4500, 14000) * np.sin(np.pi * t / .09) ** 2
def whoosh(d=.7, up=False, a=1.0):
    y = sweepnoise(d, 300 if up else 3000, 3000 if up else 300, 1.5); t = tt(d)[:len(y)]
    return a * y * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
def riser(d=3.5, a=1.0):
    y = sweepnoise(d, 200, 7000, 1.2); t = tt(d)[:len(y)]; return a * y * (t / d) ** 2
def ignite(a=1.0):
    t = tt(1.0); y = bandnoise(1.0, 80, 1800) * np.minimum(1, t / .04) * np.exp(-t * 3.5); c = bandnoise(1.0, 3000, 9000) * np.exp(-t * 80)
    return a * (y + .5 * c)
def flame_bed(d, a=1.0):
    t = tt(d); y = bandnoise(d, 70, 400) * (0.8 + .2 * np.sin(2 * np.pi * .7 * t)) + .25 * bandnoise(d, 800, 2500)
    return a * y * env(len(t), .4, .5)
def crackle(d, rate, rng=None):
    rng = rng or _rng; n = int(round(d * SR)); y = np.zeros(n); k = rng.poisson(rate * d)
    pos = rng.integers(0, max(1, n - 400), k); amp = rng.uniform(.2, 1, k) * rng.choice([-1, 1], k)
    pop = bandnoise(.006, 2500, 12000) * expd(int(.006 * SR), 900)
    for p, A in zip(pos, amp): y[p:p + len(pop)] += A * pop[:n - p]
    return y
def sizzle(d, a=1.0, crack_rate=180):
    t = tt(d); hiss = bandnoise(d, 3000, 13000) * (0.75 + .25 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * .43 * t))
    y = .55 * hiss + .9 * crackle(d, crack_rate)
    return a * y * env(len(t), .06, .35)
def pour(d, lo=400, hi=3500, a=1.0, glug=7.0):
    y = bandnoise(d, lo, hi); t = tt(d)[:len(y)]
    am = .7 + .3 * np.sin(2 * np.pi * glug * t + 2 * np.sin(2 * np.pi * 1.3 * t))
    return a * y * am * env(len(y), .12, .22)
def scrape(a=1.0, d=.22):
    t = tt(d); return a * bandnoise(d, 1200, 6000) * np.sin(np.pi * t / d) ** 2 * (.8 + .2 * np.sin(2 * np.pi * 60 * t))
def whisk_stroke(a=1.0):
    d = .14; t = tt(d); return a * (.6 * bandnoise(d, 2500, 9000) * np.sin(np.pi * t / d) ** 3 + .5 * bandnoise(d, 300, 1200) * np.sin(np.pi * t / d) ** 2)
def tick(a=1.0, f=2600):
    t = tt(.03); return a * np.sin(2 * np.pi * f * t) * np.exp(-t * 300)
def clock_tick(a=1.0, accent=False):
    t = tt(.06); f = 1800 if accent else 1350
    return a * (np.sin(2 * np.pi * f * t) * np.exp(-t * 90) + .5 * bandnoise(.06, 3000, 9000) * np.exp(-t * 200))
def limiter(x, ceiling=db(-2.5), look=.005, release=.08):
    """look-ahead brickwall (sample peak) limiter: min-filter of required gain + moving-average smoothing"""
    pk = np.abs(x).max(1) if x.ndim == 2 else np.abs(x); need = np.minimum(1, ceiling / (pk + 1e-12)); L = max(2, int(look * SR))
    pad = np.concatenate([need, np.ones(L)]); idx = np.arange(len(need))
    from numpy.lib.stride_tricks import sliding_window_view as swv
    g = swv(pad, L).min(1)[:len(need)]
    g = np.convolve(np.concatenate([np.ones(L - 1), g]), np.ones(L) / L, 'valid')[:len(need)]
    # release smoothing (one-pole, done blockwise for speed)
    rb = int(.002 * SR); gb = np.minimum.reduceat(g, np.arange(0, len(g), rb)); k = np.exp(-rb / SR / release); out = np.empty_like(gb); cur = 1.0
    for i, v in enumerate(gb): cur = v if v < cur else v + (cur - v) * k; out[i] = cur
    gr = np.minimum(g, np.repeat(out, rb)[:len(g)])
    return x * (gr[:, None] if x.ndim == 2 else gr)
def clang(a=1.0):
    t = tt(1.2); y = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(420, 5), (1130, 7), (2210, 10), (3480, 14)]); return a * y / 3 * np.minimum(1, t / .002)
def sprinkle(d, n, a=1.0):
    y = np.zeros(int(round(d * SR))); r = np.random.default_rng(11)
    for _ in range(n):
        p = r.integers(0, max(1, len(y) - 2000)); s = tick(r.uniform(.2, .6), r.uniform(3000, 7000)); y[p:p + len(s)] += s
    return a * y
def squeeze(d, a=1.0):
    t = tt(d); f = 140 + 60 * np.sin(2 * np.pi * 9 * t) + 30 * np.sin(2 * np.pi * 23 * t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR); y = .5 * tone * (0.5 + .5 * np.sin(2 * np.pi * 17 * t) ** 2) + .5 * bandnoise(d, 250, 1400)
    return a * y * env(len(t), .05, .15)
def neon_buzz(d, a=1.0):
    t = tt(d); y = sum(np.sin(2 * np.pi * 120 * k * t) / k for k in range(1, 9)); g = np.clip((np.sin(2 * np.pi * 7 * t) + .3) * 4, 0, 1); return a * y * g
def blip(m=84, a=1.0):
    y = square(hz(m), .12, .6) * expd(int(.12 * SR), 30); return a * y * env(len(y), .002, .03)

def write_wav(path, x, bits=24):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(bits // 8); w.setframerate(SR)
        if bits == 16: w.writeframes((x * 32767).astype('<i2').tobytes())
        else:
            v = (x * (2 ** 23 - 1)).astype('<i4').reshape(-1); b = v.view(np.uint8).reshape(-1, 4)[:, :3]; w.writeframes(b.tobytes())

def S(*sigs):
    """sum signals of different lengths (zero-padded)"""
    n = max(len(s) for s in sigs); out = np.zeros(n)
    for s in sigs: out[:len(s)] += s
    return out

# ---------- acoustic-ish instruments (bossa / jazz palette) ----------
def nylon(m, d=1.2, a=1.0):
    """nylon-string guitar-like pluck: additive partials with frequency-dependent decay"""
    f = hz(m); t = tt(d); y = np.zeros_like(t)
    for k in range(1, int(min(18, 9000 / f)) + 1):
        y += np.sin(2 * np.pi * k * f * t * (1 + .0004 * k * k)) / k ** 1.25 * np.exp(-t * (1.8 + .9 * k))
    return a * y * np.minimum(1, t / .003)
def epiano(m, d=1.5, a=1.0):
    """Rhodes-style electric piano: 2-op FM with decaying modulation index"""
    f = hz(m); t = tt(d); idx = 1.6 * np.exp(-t * 6) + .2
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) * np.exp(-t * 1.6) + .25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 4)
    return a * y * np.minimum(1, t / .004) * np.clip((d - t) / .08, 0, 1)
def upright(m, d=.6, a=1.0):
    f = hz(m); t = tt(d); y = np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + .15 * np.sin(6 * np.pi * f * t) * np.exp(-t * 9)
    return a * y * np.minimum(1, t / .008) * np.exp(-t * 2.2) * np.clip((d - t) / .05, 0, 1)
def rim(a=1.0):
    t = tt(.07); return a * (np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 90) + .6 * bandnoise(.07, 2000, 7000) * np.exp(-t * 150))
def brush(a=1.0, d=.12):
    t = tt(d); return a * bandnoise(d, 3000, 12000) * np.sin(np.pi * t / d) ** 1.5
