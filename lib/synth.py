"""Deterministic synth + foley used by episode audio.py. SR=44100 stereo."""
import numpy as np
import wave
import os

SR = 44100
STIR_HZ = 0.55
WHISK_HZ = 2.2
_rng = np.random.RandomState(0)


def seed(s):
    global _rng
    _rng = np.random.RandomState(int(s) & 0xFFFFFFFF)


def db(x):
    return 10.0 ** (x / 20.0)


def nsamp(d):
    return max(1, int(float(d) * SR))

def tt(d):
    return np.arange(nsamp(d), dtype=np.float64) / SR


def hz(m):
    return 440.0 * (2.0 ** ((float(m) - 69.0) / 12.0))


def noise(d):
    return _rng.randn(nsamp(d)).astype(np.float64)


def fft_filter(y, lo=20, hi=18000):
    y = np.asarray(y, dtype=np.float64)
    n = len(y)
    if n < 8:
        return y
    spec = np.fft.rfft(y)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    spec[(freqs < lo) | (freqs > hi)] = 0
    return np.fft.irfft(spec, n)


def bandnoise(d, lo, hi):
    return fft_filter(noise(d), lo, hi)


def saw(f, d, bright=0.5):
    t = tt(d)
    y = np.zeros_like(t)
    n = max(2, int(6 * bright + 2))
    for k in range(1, n + 1):
        y += (1.0 / k) * np.sin(2 * np.pi * f * k * t)
    return y * 0.35


def square(f, d, bright=0.5):
    t = tt(d)
    y = np.zeros_like(t)
    n = max(1, int(5 * bright + 1))
    for k in range(n):
        odd = 2 * k + 1
        y += (1.0 / odd) * np.sin(2 * np.pi * f * odd * t)
    return y * 0.35


def pad(notes, d, a=0.4, r=0.75, bright=0.18):
    t = tt(d)
    y = np.zeros_like(t)
    for m in notes:
        f = hz(m)
        y += np.sin(2 * np.pi * f * t)
        y += bright * np.sin(2 * np.pi * f * 2.003 * t)
    y *= np.minimum(1.0, t / 0.18) * np.clip((d - t) / max(0.05, r), 0, 1)
    return a * y / max(1, len(notes))


def _one_pole(y, a):
    out = np.zeros_like(y)
    acc = 0.0
    aa = float(a)
    for i, v in enumerate(y):
        acc = acc + aa * (v - acc)
        out[i] = acc
    return out


def reverb(x, time=1.4, mix=0.25, lp=8000):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    n = x.shape[0]
    delays = [int(0.029 * SR), int(0.037 * SR), int(0.043 * SR), int(0.053 * SR)]
    wet = np.zeros_like(x)
    for i, dly in enumerate(delays):
        if dly >= n:
            continue
        buf = np.zeros_like(x)
        buf[dly:] = x[:-dly] * (0.55 if i % 2 == 0 else 0.42)
        wet += buf
    # cheap LP
    k = max(2, int(SR / max(lp, 200)))
    ker = np.ones(k) / k
    wet[:, 0] = np.convolve(wet[:, 0], ker, 'same')
    wet[:, 1] = np.convolve(wet[:, 1], ker, 'same')
    decay = np.exp(-np.arange(n) / SR / max(0.05, time) * 2.2)
    wet *= decay[:, None]
    return (1.0 - mix) * x + mix * wet


def whoosh(d=0.3, up=False, a=1.0):
    t = tt(d)
    y = bandnoise(d, 180, 4200)
    env = np.sin(np.pi * np.clip(t / max(d, 1e-6), 0, 1))
    if up:
        y2 = bandnoise(d, 900, 6500)
        fade = np.clip(t / max(d, 1e-6), 0, 1)
        y = y * (1.0 - fade) + y2 * fade
    return a * y * env


def pour(d, lo=400, hi=2500, a=1.0, glug=4):
    t = tt(d)
    g = 0.55 + 0.45 * np.sin(2 * np.pi * glug * t)
    y = bandnoise(d, lo, hi) * g
    y *= np.minimum(1.0, t / 0.05) * np.clip((d - t) / 0.08, 0, 1)
    return a * y


def sizzle(d, a=0.7, crack_rate=40):
    n = nsamp(d)
    y = bandnoise(d, 1800, 11000) * 0.28
    n_cr = max(1, int(d * crack_rate))
    for i in range(n_cr):
        p = int(_rng.rand() * (n - 80))
        cr = bandnoise(0.012, 3000, 12000) * np.exp(-tt(0.012) * 90)
        sl = slice(p, min(n, p + len(cr)))
        y[sl] += cr[: sl.stop - sl.start] * (0.4 + 0.6 * _rng.rand())
    return a * y


def chop(a=1.0, wood=True):
    t = tt(0.14)
    y = np.sin(2 * np.pi * (160 + 40 * np.exp(-t * 40)) * t) * np.exp(-t * 28)
    y += 0.55 * bandnoise(0.14, 700, 6500)[: len(t)] * np.exp(-t * 42)
    if wood:
        y += 0.25 * bandnoise(0.14, 200, 900)[: len(t)] * np.exp(-t * 22)
    return a * y


def scrape(a=1.0, d=0.18):
    t = tt(d)
    y = bandnoise(d, 350, 3800) * np.sin(np.pi * np.clip(t / d, 0, 1))
    return a * y


def sprinkle(d, n, a=1.0):
    N = nsamp(d)
    y = np.zeros(N)
    for i in range(int(n)):
        p = int((i + 0.15 * _rng.rand()) / max(1, n) * (N - 60))
        grain = bandnoise(0.018, 2000, 9000) * np.exp(-tt(0.018) * 70)
        sl = slice(p, min(N, p + len(grain)))
        y[sl] += grain[: sl.stop - sl.start]
    return a * y * 0.8


def flame_bed(d, a=0.5):
    y = 0.55 * bandnoise(d, 80, 600) + 0.2 * bandnoise(d, 1800, 7000)
    t = tt(d)
    y *= 0.7 + 0.3 * np.sin(2 * np.pi * 3.2 * t)
    return a * y


def bell(f, d, a=0.45):
    t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.8)
    y += 0.4 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 2.8)
    y += 0.15 * np.sin(2 * np.pi * f * 3.02 * t) * np.exp(-t * 4.0)
    y *= np.minimum(1.0, t / 0.01)
    return a * y


def limiter(x, thresh):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    peak = np.max(np.abs(x), axis=1, keepdims=True)
    g = np.where(peak > thresh, thresh / (peak + 1e-12), 1.0)
    # 3ms smooth
    k = max(1, int(0.003 * SR))
    ker = np.ones(k) / k
    gs = np.convolve(g[:, 0], ker, 'same')[:, None]
    return x * gs


class Mix:
    def __init__(self, duration):
        self.N = int(round(float(duration) * SR))
        self.buses = {}

    def add(self, bus, t0, sig, gain=1.0, pan=0.0):
        if bus not in self.buses:
            self.buses[bus] = np.zeros((self.N, 2), dtype=np.float64)
        y = np.asarray(sig, dtype=np.float64)
        if y.ndim == 2:
            stereo = y * float(gain)
        else:
            pan = float(np.clip(pan, -1, 1))
            l = np.sqrt(0.5 * (1.0 - pan))
            r = np.sqrt(0.5 * (1.0 + pan))
            stereo = np.stack([y * l, y * r], 1) * float(gain)
        i0 = int(round(float(t0) * SR))
        if i0 >= self.N:
            return
        if i0 < 0:
            stereo = stereo[-i0:]
            i0 = 0
        n = min(len(stereo), self.N - i0)
        if n > 0:
            self.buses[bus][i0:i0 + n] += stereo[:n]

    def get(self, bus):
        if bus not in self.buses:
            return np.zeros((self.N, 2), dtype=np.float64)
        return self.buses[bus]


def write_wav(path, mix):
    x = np.asarray(mix, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767.0).astype('<i2')
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
