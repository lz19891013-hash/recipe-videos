"""Geometric evidence from extracted frames. Not a human review pass.
Usage: python3 qa_visual.py <frames_dir>
Looks at named stills for: taco/meat presence, right-edge exit, empty pan.
"""
import os, sys, json
from PIL import Image
import numpy as np

d = sys.argv[1]
W, H = 1080, 1920
SAFE = dict(x0=70, x1=1010, y0=150, y1=1600)

def load(name):
    p = os.path.join(d, name)
    im = Image.open(p).convert('RGB')
    return np.asarray(im)

def mask_yellow(a):
    r, g, b = a[:,:,0].astype(int), a[:,:,1].astype(int), a[:,:,2].astype(int)
    return (r > 160) & (g > 120) & (b < 110) & (r > b + 40) & (g > b + 20)

def mask_meat(a):
    r, g, b = a[:,:,0].astype(int), a[:,:,1].astype(int), a[:,:,2].astype(int)
    return (r > 70) & (r > g + 15) & (r > b + 20) & (g < 140) & (b < 120) & (r < 230)

def bbox(m):
    ys, xs = np.where(m)
    if len(xs) == 0:
        return None
    return dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()),
                cx=int(xs.mean()), cy=int(ys.mean()), px=int(len(xs)))

def edge_touch(bb, margin=12):
    if not bb: return True
    return bb['x0'] <= margin or bb['x1'] >= W - margin

out = {}
files = {
    't24': 't24.00.png', 't28': 't28.00.png', 't32': 't32.00.png', 't36': 't36.00.png',
    't76': 't76.00.png', 't90': 't90.00.png',
    't96': 't96.00.png', 't98': 't98.00.png', 't100': 't100.00.png',
}
# stills use tNN.00.png; manual dumps use other names — accept either
for k, fn in list(files.items()):
    if not os.path.exists(os.path.join(d, fn)):
        # try without extra zeros
        alt = [f for f in os.listdir(d) if f.startswith(k) or f.endswith(fn)]
        if alt:
            files[k] = alt[0]

for k, fn in files.items():
    p = os.path.join(d, fn)
    if not os.path.exists(p):
        out[k] = dict(missing=True); continue
    a = load(fn)
    my, mm = mask_yellow(a), mask_meat(a)
    by, bm = bbox(my), bbox(mm)
    rec = dict(file=fn, yellow=by, meat=bm, meat_px=0 if not bm else bm['px'],
               yellow_px=0 if not by else by['px'],
               meat_touches_edge=edge_touch(bm, 8) if bm else True,
               yellow_touches_edge=edge_touch(by, 8) if by else True,
               empty_center=int(mm[800:1200, 300:780].sum()) < 80)
    out[k] = rec

print(json.dumps(out, indent=2))
fails = []
for k in ('t24', 't28', 't32', 't36'):
    if out.get(k, {}).get('meat_px', 0) < 800: fails.append(f'{k} too little meat')
for k in ('t76', 't90', 't96', 't98', 't100'):
    r = out.get(k, {})
    if r.get('meat_px', 0) < 400: fails.append(f'{k} meat missing')
    if r.get('yellow_px', 0) < 800: fails.append(f'{k} tortilla missing')
    if r.get('yellow_touches_edge') or r.get('meat_touches_edge'): fails.append(f'{k} product at frame edge')
    if r.get('empty_center'): fails.append(f'{k} empty center')
print('visual_flags', fails)
