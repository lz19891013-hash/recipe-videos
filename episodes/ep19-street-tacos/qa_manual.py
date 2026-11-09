"""Extra frame dump from the finished MP4 for visual evidence.
Not an automatic pass. Usage: python3 qa_manual.py <epDir> <mp4>
"""
import os, subprocess, sys
ep, mp4 = sys.argv[1], sys.argv[2]
qa = os.path.join(ep, 'build', 'qa', 'manual')
os.makedirs(qa, exist_ok=True)
times = {
    'meat_raw': 24.0,
    'meat_sear': 28.0,
    'meat_cook': 32.0,
    'meat_brown': 36.0,
    'plate_beef': 76.0,
    'plate_full': 90.0,
    'hero_96': 96.0,
    'hero_98': 98.0,
    'hero_98_5': 98.5,
    'hero_100': 100.0,
    'hero_101': 101.0,
    'card': 104.0,
}
for name, t in times.items():
    out = os.path.join(qa, f'{name}_t{t:06.2f}.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', out], check=True)
    print(out)
print('manual frames', len(times), '->', qa)
