"""Extra frame dump from the finished MP4 for manual visual QA.
Not an automatic pass. Usage: python3 qa_manual.py <epDir> <mp4>
"""
import json, os, subprocess, sys
ep, mp4 = sys.argv[1], sys.argv[2]
TL = json.load(open(os.path.join(ep, 'timeline.json')))
E = TL['ev']
qa = os.path.join(ep, 'build', 'qa', 'manual')
os.makedirs(qa, exist_ok=True)
times = {
    'stir': 16.8,
    'check': 18.9,
    'lid': 20.6,
    'rinse': 22.9,
    'cut1': E['cheek_cuts'][0] + 0.35,
    'cheek_open': E['cheek_cuts'][0] + 1.8,
    'cut2': E['cheek_cuts'][1] + 0.25,
    'pit': E['pit_reveal'] + 0.25,
    'score': E['score']['start'] + 0.8,
    'sugar_drop': 59.4,
    'sugar_melt': 61.2,
    'sugar_cool': 63.4,
    'coco': E['coco']['pour'][0] + 0.6,
    'milk_start': E['milk_pour']['pour'][0] + 0.25,
    'milk_mid': (E['milk_pour']['pour'][0] + E['milk_pour']['pour'][1]) / 2,
    'card': E['card'] + 3.2,
}
for name, t in times.items():
    out = os.path.join(qa, f'{name}_t{t:06.2f}.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', out], check=True)
    print(out)
print('manual frames', len(times), '->', qa)
