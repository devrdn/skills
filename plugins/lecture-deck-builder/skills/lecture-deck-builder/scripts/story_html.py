#!/usr/bin/env python3
"""Текст собранной динамической презентации для рецензентов (аналог story.js обычного режима).

Запуск из папки presentation/ после сборки:
    python3 <skill>/scripts/story_html.py dist/<Курс>_<NN>_<Тема>_студенты.html > story.md
    python3 <skill>/scripts/story_html.py dist/<...>_пара_квиз.html src/data.js > story_pair.md

Второй аргумент - путь к data.js (по умолчанию src/data.js рядом с dist/). Нужен node: data.js читается
как JavaScript. Слайды нумеруются по порядку, как в собранной версии; вопросы, типичные ошибки, итоговый
тест и командный квиз разворачиваются из data.js вместе с ответами.
"""
import html, json, pathlib, re, subprocess, sys

if len(sys.argv) < 2:
    sys.exit("использование: story_html.py <собранный.html> [src/data.js] > story.md")
page = pathlib.Path(sys.argv[1])
data_js = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else page.resolve().parent.parent / "src" / "data.js"
if not page.exists() or not data_js.exists():
    sys.exit(f"нет файла: {page if not page.exists() else data_js}")

body = page.read_text(encoding="utf-8")
try:
    body = body[body.index('<div class="viewport">'):body.index('<nav class="navbar"')]
except ValueError:
    sys.exit("страница собрана не из заготовки assets/interactive: нет блока viewport")
try:
    data = json.loads(subprocess.check_output(["node", "-e", data_js.read_text(encoding="utf-8") + ";console.log(JSON.stringify(DATA))"]))
except (OSError, subprocess.CalledProcessError) as e:
    sys.exit(f"не удалось прочитать data.js через node: {e}")
L = "АБВГДЕ"


def text(h):
    h = re.sub(r'<pre class="code[^"]*"[^>]*>(.*?)</pre>', lambda m: "\n```\n" + "\n".join(
        re.sub(r"<[^>]+>", "", x) for x in re.findall(r'<span class="ln[^"]*"[^>]*>(.*?)</span>(?=<span class="ln|$)', m.group(1))) + "\n```\n", h, flags=re.S)
    h = re.sub(r'<div class="caps">', "\nПодписи к шагам:\n", h)
    h = re.sub(r"</?(code|mark|b)( [^>]*)?>", "", h)
    h = re.sub(r"<(p|div|li|h2|h1|tr|section)[^>]*>", "\n", h)
    h = re.sub(r"<[^>]+>", " ", h)
    h = html.unescape(h)
    return "\n".join(l.strip() for l in h.split("\n") if l.strip())


def question(d, head):
    s = f"{head}\n{d['q']}"
    if d.get("code"):
        s += "\n```\n" + d["code"] + "\n```"
    s += "\n" + "\n".join(f"  {L[i]}) {o}" for i, o in enumerate(d["opts"]))
    return s + f"\nОтвет: {L[d['a']]}. {d['exp']}"


n, out = 0, []
for m in re.finditer(r'<section class="slide([^"]*)"([^>]*)>(.*?)</section>|<div data-gen="(\w+)"', body, flags=re.S):
    gen = m.group(4)
    if gen == "mistakes":
        for i, d in enumerate(data.get("mistakes", [])):
            n += 1
            out.append(f"[{n}] Ошибка {i + 1}: {d['t']}\n{d['q']}\n```\n{d.get('code', '')}\n```\nОтвет: {d['a']}")
        continue
    if gen == "final":
        for k in sorted((k for k in data["q"] if re.fullmatch(r"f\d+", k)), key=lambda k: int(k[1:])):
            n += 1
            out.append(f"[{n}] " + question(data["q"][k], f"ВОПРОС (итоговый тест {k[1:]})"))
        continue
    if gen == "quiz":
        for i, d in enumerate(data.get("quiz", [])):
            n += 1
            pts = f", {d['pts']} балла" if d.get("pts", 1) > 1 else ""
            out.append(f"[{n}] " + question(d, f"КВИЗ {i + 1}{pts}: {d['t']}"))
        continue
    if gen:
        continue  # series и другие генераторы раскрываются в своих слайдах
    cls, attrs, inner = m.group(1), m.group(2), m.group(3)
    n += 1
    if "s-q" in cls:
        a = dict(re.findall(r'data-([\w-]+)="([^"]*)"', attrs))
        kick = f" ({a['kick']})" if a.get("kick") else ""
        out.append(f"[{n}] " + question(data["q"][a["q"]], f"ВОПРОС{kick}: {a.get('t', '')}"))
    else:
        out.append(f"[{n}]{' РАЗДЕЛ' if 's-div' in cls else ''}\n" + text(inner))
print("\n\n".join(out))
