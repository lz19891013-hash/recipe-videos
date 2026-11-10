# usage: python3 contact.py out.png img1 img2 ...   -> grid contact sheet with filename labels
import sys
from PIL import Image, ImageDraw, ImageFont
out, files = sys.argv[1], sys.argv[2:]
cols = int(__import__('os').environ.get('COLS', 5)); tw, th = 360, 640
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 30)), (20, 20, 20)); d = ImageDraw.Draw(sheet)
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception: f = None
for i, p in enumerate(files):
    im = Image.open(p).convert('RGB').resize((tw, th)); x, y = (i % cols) * tw, (i // cols) * (th + 30)
    sheet.paste(im, (x, y + 30)); d.text((x + 8, y + 4), p.split('/')[-1], fill=(255, 255, 0), font=f)
sheet.save(out); print(out)
