#!/usr/bin/env python3
"""Проверка PDF: контент не заходит на колонтитул и за правое поле. Печатает подозрительные страницы."""
import sys, subprocess, glob, os, tempfile
from PIL import Image

pdf = sys.argv[1]
d = tempfile.mkdtemp()
subprocess.run(["pdftoppm", "-r", "50", "-png", pdf, os.path.join(d, "p")], check=True)
bad = 0
for f in sorted(glob.glob(os.path.join(d, "p-*.png"))):
    n = int(f.rsplit("-", 1)[1].split(".")[0])
    im = Image.open(f).convert("RGB")
    W, H = im.size
    px = im.load()
    ppi = W / 10.0
    # градиентные слайды пропускаем (тёмный угол)
    r, g, b = px[W // 2, H - 5]
    if r < 200 and b > 150:
        continue
    y_lo = int(5.02 * ppi)   # BOTTOM
    y_hi = int(5.27 * ppi)   # начало колонтитула
    lowest = 0
    for y in range(int(1.0 * ppi), y_hi):
        for x in range(int(0.5 * ppi), int(9.5 * ppi), 2):
            r, g, b = px[x, y]
            if r + g + b < 420:
                lowest = y
                break
    msgs = []
    if lowest > y_lo + 3:
        msgs.append(f"низ {lowest / ppi:.2f}in")
    for y in range(int(0.3 * ppi), y_hi):
        for x in list(range(int(9.42 * ppi), W - 1)) + list(range(0, int(0.55 * ppi))):
            r, g, b = px[x, y]
            if r + g + b < 600:
                msgs.append(f"край x={x / ppi:.2f} y={y / ppi:.2f}")
                break
        if len(msgs) and msgs[-1].startswith("край"):
            break
    if msgs:
        bad += 1
        print(f"стр {n}: " + "; ".join(msgs))
print("проблемных страниц:", bad)
