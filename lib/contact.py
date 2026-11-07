"""Tile JPEGs into a contact sheet PNG via ffmpeg."""
import os, subprocess, tempfile, shutil

def contact(paths, out, cols=3):
    paths = [p for p in paths if p and os.path.exists(p)]
    if not paths:
        raise SystemExit('no frames')
    n = len(paths)
    rows = (n + cols - 1) // cols
    # pad to grid
    tmp = tempfile.mkdtemp(prefix='contact_')
    try:
        pad = paths[:]
        while len(pad) < rows * cols:
            pad.append(paths[-1])
        ins = []
        for i, p in enumerate(pad):
            ins += ['-i', p]
        cells = []
        for r in range(rows):
            for c in range(cols):
                xs = '+'.join(['w0'] * c) if c else '0'
                ys = '+'.join(['h0'] * r) if r else '0'
                cells.append(f'{xs}_{ys}')
        layout = '|'.join(cells)
        splits = ''.join(f'[{i}:v]scale=360:640,setsar=1[v{i}];' for i in range(len(pad)))
        inputs = ''.join(f'[v{i}]' for i in range(len(pad)))
        filt = splits + f"{inputs}xstack=inputs={len(pad)}:layout={layout}[out]"
        cmd = ['ffmpeg','-y', *ins, '-filter_complex', filt, '-map','[out]', out]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(r.stderr[-1500:])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    import sys
    contact(sys.argv[2:], sys.argv[1])
