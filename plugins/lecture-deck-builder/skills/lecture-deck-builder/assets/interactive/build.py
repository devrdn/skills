#!/usr/bin/env python3
"""Собирает интерактивные презентации темы из src/.

Один источник src/slides.html, два режима:
  пара      - преподаватель показывает на лекции;
  студенты  - самостоятельное изучение, понятно без лектора.

python3 build.py              HTML для пары и студентов + два SCORM-пакета для Moodle
python3 build.py --variant    ещё и второй дизайн (tokens-mine.css, шрифты из Google Fonts)
python3 build.py --artifact   ещё и фрагменты без <html>/<head> для публикации артефактом

Все файлы работают без интернета: шрифты, иконки и фоны встроены в HTML.
"""
import base64, pathlib, re, sys, urllib.parse, zipfile

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

# ---------- настройки темы: поменять для каждой новой лекции ----------
CONFIG = {
    "id": "cc08",                                   # короткий код: ключи localStorage, идентификатор SCORM
    "files": "Cloud_08_Балансировка",                  # префикс имён HTML-файлов
    "scorm": "Cloud_08_Load_Balancing",                  # префикс имён SCORM-пакетов (латиница: Moodle и Windows)
    "title_pair": "Балансировка на паре",              # <title> версии для пары
    "title_student": "Балансировка и Auto Scaling",    # <title> версии для студентов
    "moodle_title": "Лекция 8. Балансировка нагрузки и автоматическое масштабирование",
    "figures": ROOT.parent.parent / "_images" / "08",  # рисунки главы для {{fig:...}}, если нужны
    "mastery": 60,                                   # проходной балл итогового теста в SCORM
    "line_icons": {"git", "gear", "users", "user", "code", "doc", "server", "laptop"},  # контурные: инвертируются в тёмной теме
}
# ----------------------------------------------------------------------

GOOGLE_MINE = "family=Geologica:wght@400;500;600;700;800&family=Golos+Text:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600"


def read(n):
    return (SRC / n).read_text(encoding="utf-8")


def b64(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def svg_uri(path):
    """SVG как data URI без base64: на треть короче. Комментарии, метаданные и лишние пробелы убираются."""
    s = path.read_text(encoding="utf-8")
    s = re.sub(r"<\?xml.*?\?>|<!--.*?-->|<metadata.*?</metadata>|<title>.*?</title>", "", s, flags=re.S)
    s = re.sub(r">\s+<", "><", s).strip().replace('"', "'")
    return "data:image/svg+xml," + urllib.parse.quote(s, safe=" '=:/;,.-_()")


def figures(html):
    """{{fig:имя|номер|подпись}} - статичный рисунок главы. В интерактивной презентации рисунок обычно
    заменяют живой схемой; статичным оставляют то, что не схема: скриншот консоли, график."""
    def fig(m):
        name, num, cap = m.group(1), m.group(2), m.group(3)
        p = pathlib.Path(CONFIG["figures"]) / (name + ".svg")
        src = svg_uri(p) if p.exists() else b64(p.with_suffix(".png"), "image/png")
        return (f'<figure class="fig deckfig"><div class="plate"><img src="{src}" alt="{cap}" loading="lazy"></div>'
                f'<figcaption><b>{num}</b>{cap}</figcaption></figure>')
    return re.sub(r"\{\{fig:([a-z0-9_]+)\|([\d.]+)\|([^}]+)\}\}", fig, html)


def icons(html):
    """{{icon:имя}} -> <i class="ic ic-имя">. Сама картинка встраивается один раз в CSS,
    а не копией в каждый узел: файл меньше, браузер декодирует каждую иконку один раз."""
    used = sorted(set(re.findall(r"\{\{icon:([a-z0-9]+)\}\}", html)))
    line = CONFIG["line_icons"]
    html = re.sub(r"\{\{icon:([a-z0-9]+)\}\}",
                  lambda m: f'<i class="ic ic-{m.group(1)}{" ic-line" if m.group(1) in line else ""}" aria-hidden="true"></i>', html)
    css = "".join(f'.ic-{n}{{background-image:url("{svg_uri(SRC / "icons" / (n + ".svg"))}")}}\n' for n in used)
    return html, css


def only(html, mode):
    """Убирает слайды и блоки, помеченные data-only для другого режима."""
    other = "student" if mode == "pair" else "pair"
    html = re.sub(r'<section[^>]*data-only="%s"[^>]*>.*?</section>\s*' % other, "", html, flags=re.S)
    html = re.sub(r'<div[^>]*data-only="%s"[^>]*></div>\s*' % other, "", html)
    html = re.sub(r'<p[^>]*data-only="%s"[^>]*>.*?</p>\s*' % other, "", html, flags=re.S)
    return html


def embedded_fonts():
    """@font-face с woff2 из src/fonts (только латиница и кириллица, только нужные начертания) в data URI."""
    css = (SRC / "fonts" / "brand.css").read_text(encoding="utf-8")
    groups = {}
    for block in re.findall(r"@font-face\s*\{[^}]*\}", css):
        fam = re.search(r"font-family: '([^']+)'", block).group(1)
        w = int(re.search(r"font-weight: (\d+)", block).group(1))
        f = re.search(r"FONTFILE:([^)]+)", block).group(1)
        rng = re.search(r"unicode-range: ([^;]+);", block).group(1)
        groups.setdefault((fam, f), {"w": [], "rng": rng})["w"].append(w)
    return "\n".join(
        f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{min(g['w'])} {max(g['w'])};font-display:swap;"
        f"src:url({b64(ROOT / f, 'font/woff2')}) format('woff2');unicode-range:{g['rng']}}}"
        for (fam, f), g in groups.items())


def build(mode, design):
    body, icon_css = icons(figures(only(read("slides.html"), mode)))
    css = read(f"tokens-{design}.css")
    if design == "brand":
        css = embedded_fonts() + "\n" + css
        css += (":root{--grad-full:url(%s);--grad-soft:url(%s)}\n"
                % (b64(SRC / "grad_full.jpg", "image/jpeg"), b64(SRC / "grad_soft.jpg", "image/jpeg")))
    css += read("components.css") + read("deck.css") + icon_css
    body = f'<div class="app">\n{body}\n</div>'
    js = (f'window.DECK={{mode:"{mode}",design:"{design}",id:"{CONFIG["id"]}"}};\n'
          + read("data.js") + "\n" + read("stands.js") + "\n" + read("deck.js"))
    title = CONFIG["title_pair" if mode == "pair" else "title_student"] + ("" if design == "brand" else ", вариант")
    fonts = "" if design == "brand" else f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{GOOGLE_MINE}&display=swap">\n'
    head = f"<title>{title}</title>\n{fonts}<style>\n{css}\n</style>\n"
    tail = f"\n<script>\n{js}\n</script>\n"
    full = ('<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + "</head>\n<body>\n" + body + tail + "</body>\n</html>\n")
    name = f'{CONFIG["files"]}_{"пара" if mode == "pair" else "студенты"}{"" if design == "brand" else "_вариант"}'
    (DIST / f"{name}.html").write_text(full, encoding="utf-8")
    if "--artifact" in sys.argv:
        (DIST / "artifact").mkdir(exist_ok=True)
        (DIST / "artifact" / f"{name}.html").write_text(head + body + tail, encoding="utf-8")
    n = len(re.findall(r'<section class="slide', body))
    kb = len(full.encode()) // 1024
    print(f"{name}.html  {kb} КБ, слайдов в разметке: {n}" + ("  ВНИМАНИЕ: больше 1,5 МБ" if kb > 1536 else ""))
    return full


MANIFEST = """<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="{ident}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-{ident}">
    <organization identifier="ORG-{ident}">
      <title>{title}</title>
      <item identifier="ITEM-{ident}" identifierref="RES-{ident}" isvisible="true">
        <title>{title}</title>{mastery}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-{ident}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
"""


def scorm(mode, html):
    out = DIST / "moodle"
    out.mkdir(parents=True, exist_ok=True)
    ident = f'{CONFIG["id"]}-{mode}'
    title = CONFIG["moodle_title"] + (" (для пары)" if mode == "pair" else "")
    mastery = f'\n        <adlcp:masteryscore>{CONFIG["mastery"]}</adlcp:masteryscore>' if mode == "student" else ""
    z = out / f'{CONFIG["scorm"]}_{"pair" if mode == "pair" else "students"}_SCORM.zip'
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("imsmanifest.xml", MANIFEST.format(ident=ident, title=title, mastery=mastery))
        zf.writestr("index.html", html)
    print(f"moodle/{z.name}  {z.stat().st_size // 1024} КБ")


def main():
    DIST.mkdir(exist_ok=True)
    for mode in ("pair", "student"):
        scorm(mode, build(mode, "brand"))
        if "--variant" in sys.argv:
            build(mode, "mine")


if __name__ == "__main__":
    main()
