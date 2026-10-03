#!/usr/bin/env python3
"""Generate LumaCut PWA icons: 192/512, maskable 192/512, apple-touch 180."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (11, 11, 13)      # #0b0b0d
LIME = (217, 255, 67)  # #D9FF43

def film_mark(size, pad_ratio=0.0):
    """Lime rounded-square film mark on dark bg. pad_ratio adds safe-zone padding (maskable)."""
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    m = int(size * pad_ratio)
    box = [m, m, size - m, size - m]
    # lime rounded square centered, sized to fit inside padding
    s = (size - 2 * m)
    side = int(s * 0.62)
    x0 = (size - side) // 2
    d.rounded_rectangle([x0, x0, x0 + side, x0 + side], radius=int(side * 0.24), fill=LIME)
    # dark film strip
    fw, fh = int(side * 0.60), int(side * 0.42)
    fx0, fy0 = (size - fw) // 2, (size - fh) // 2
    d.rounded_rectangle([fx0, fy0, fx0 + fw, fy0 + fh], radius=int(fh * 0.16), fill=BG)
    # sprocket holes (lime)
    hole = max(2, int(side * 0.062))
    for yy in (fy0 + int(fh * 0.16), fy0 + fh - int(fh * 0.16) - hole):
        x = fx0 + int(fw * 0.12)
        while x + hole <= fx0 + fw - int(fw * 0.10):
            d.rectangle([x, yy, x + hole, yy + hole], fill=LIME)
            x += int(hole * 1.55)
    return img

specs = [
    ("icon-192.png", 192, 0.0),
    ("icon-512.png", 512, 0.0),
    ("maskable-192.png", 192, 0.18),
    ("maskable-512.png", 512, 0.18),
    ("apple-touch-icon.png", 180, 0.0),
]
for name, size, pad in specs:
    film_mark(size, pad).save(os.path.join(OUT, name))
    print("wrote", name)
