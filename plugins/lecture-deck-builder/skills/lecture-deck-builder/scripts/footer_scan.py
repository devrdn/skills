#!/usr/bin/env python3
"""Находит тёмный текст, который попал в зону нижнего колонтитула (ниже 5,12 дюйма).
check_all.py не замечает приглушённый текст, поэтому эта проверка его дополняет.
Серые строки источника и номер страницы не учитываются."""
import sys
import pdfplumber

IGNORE = {(0.6, 0.63, 0.67), (0.31, 0.27, 0.9)}   # приглушённый серый и индиговый номер страницы
LIMIT = 5.12
if len(sys.argv) < 2:
    sys.exit("Запуск: python3 footer_scan.py <Name>.pdf")
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
    print(f"наложение на колонтитул, стр {n}: {''.join(t)[:60]}")
print("наложений на колонтитул:", len(bad))
