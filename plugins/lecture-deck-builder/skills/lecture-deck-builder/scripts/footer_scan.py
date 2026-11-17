#!/usr/bin/env python3
"""Finds dark text that dropped into the footer zone (below 5.12 in).
check_all.py misses muted text, so this check complements it.
Grey source lines and the page number are ignored."""
import sys
import pdfplumber

IGNORE = {(0.6, 0.63, 0.67), (0.31, 0.27, 0.9)}   # muted grey and the indigo page number
LIMIT = 5.12
pdf = sys.argv[1]
bad = {}
with pdfplumber.open(pdf) as d:
    for i, pg in enumerate(d.pages):
        for ch in pg.chars:
            col = tuple(round(c, 2) for c in (ch.get("non_stroking_color") or (0,)))
            if col in IGNORE or not ch["text"].strip():
                continue
            if ch["bottom"] / 72 > LIMIT:
                bad.setdefault(i + 1, []).append(ch["text"])
for n, t in bad.items():
    print(f"footer overlap, page {n}: {''.join(t)[:60]}")
print("footer overlaps:", len(bad))
