#!/usr/bin/env python3
"""Собирает интерактивные презентации темы из src/.

Один источник src/slides.html, три версии:
  пара       - преподаватель показывает на лекции;
  пара_квиз  - то же и командный квиз в конце (только HTML; собирается, если в слайдах есть data-gen="quiz");
  студенты   - самостоятельное изучение, понятно без лектора.

python3 build.py              HTML трёх версий + два SCORM-пакета для Moodle (пара и студенты)
python3 build.py --variant    ещё и второй дизайн (tokens-mine.css, шрифты из Google Fonts)
python3 build.py --artifact   ещё и фрагменты без <html>/<head> для публикации артефактом

Все файлы работают без интернета: шрифты, иконки и фоны встроены в HTML.
"""
import base64, pathlib, re, sys, urllib.parse, zipfile
import html as html_mod

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
    "line_icons": {"git", "gear", "users", "user", "code", "doc", "server", "laptop", "browser", "buffer", "folder", "package", "layout", "terminal"},  # контурные: инвертируются в тёмной теме
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
    used = set(re.findall(r"\{\{icon:([a-z0-9]+)\}\}", html))
    # иконки, вставленные в разметку классом напрямую: <i class="ic ic-имя">
    used |= {n for n in re.findall(r'class="ic ic-([a-z0-9]+)', html) if (SRC / "icons" / (n + ".svg")).exists()}
    used = sorted(used)
    line = CONFIG["line_icons"]
    html = re.sub(r"\{\{icon:([a-z0-9]+)\}\}",
                  lambda m: f'<i class="ic ic-{m.group(1)}{" ic-line" if m.group(1) in line else ""}" aria-hidden="true"></i>', html)
    css = "".join(f'.ic-{n}{{background-image:url("{svg_uri(SRC / "icons" / (n + ".svg"))}")}}\n' for n in used)
    return html, css


def only(html, mode):
    """Убирает слайды и блоки, помеченные data-only для другого режима.
    data-only="pair quiz" - в нескольких режимах. Режим quiz = версия для пары + командный квиз."""
    keep = {"pair": {"pair"}, "quiz": {"pair", "quiz"}, "student": {"student"}}[mode]
    def drop(m):
        return "" if not (set(m.group(1).split()) & keep) else m.group(0)
    for pat in (r'<section[^>]*data-only="([^"]*)"[^>]*>.*?</section>\s*', r'<div[^>]*data-only="([^"]*)"[^>]*></div>\s*',
                r'<p[^>]*data-only="([^"]*)"[^>]*>.*?</p>\s*', r'<li[^>]*data-only="([^"]*)"[^>]*>.*?</li>\s*'):
        html = re.sub(pat, drop, html, flags=re.S)
    return html


# ---------- блоки кода: <xcode lang="php|tpl|text|bash" cur="1:2-4;2:6" on="..." in="..." bad="3">сырой код</xcode> ----------
KW_PHP = r"\b(?:function|return|require|require_once|echo|if|else|elseif|endif|foreach|endforeach|as|new|use|declare|exit|array|string|int|bool|void|true|false|null)\b"
KW_SH = r"\b(?:aws|docker|git|npm|node|php|python3|composer|kubectl|terraform|require|install|start|run|build|push|pull)\b"
KW_C = r"\b(?:function|return|const|let|var|if|else|for|while|do|switch|case|break|continue|new|class|struct|public|private|protected|static|void|int|double|float|char|bool|auto|true|false|null|nullptr|this|import|export|from|async|await|include|using|namespace|std)\b"
TOK_PHP = re.compile(r"(?P<c>//.*$|#.*$)|(?P<s>'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")|(?P<t><\?php|<\?=|\?>)|(?P<v>\$\w+)|(?P<k>" + KW_PHP + ")")
TOK_TPL = re.compile(r"(?P<c><!--.*?-->|\{#.*?#\})|(?P<t><\?(?:php|=).*?\?>|\{%.*?%\}|\{\{.*?\}\}|\{[/$a-z][^{}]*\})")
TOK_C = re.compile(r"(?P<c>//.*$)|(?P<s>'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`[^`]*`)|(?P<t>#\w+)|(?P<k>" + KW_C + ")")
TOK_SH = re.compile(r"(?P<s>'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")|(?P<k>" + KW_SH + ")")


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def hl_seg(seg, lang):
    rx = {"php": TOK_PHP, "tpl": TOK_TPL, "bash": TOK_SH, "js": TOK_C, "cpp": TOK_C}.get(lang)
    if not rx:
        return esc(seg)
    out, pos = [], 0
    for m in rx.finditer(seg):
        out.append(esc(seg[pos:m.start()]))
        out.append(f'<span class="{m.lastgroup}">{esc(m.group(0))}</span>')
        pos = m.end()
    out.append(esc(seg[pos:]))
    return "".join(out)


def hl_line(line, lang):
    """Помеченные куски строки: ⟪текст⟫ - выделение всегда, ⟪k|текст⟫ - выделение с шага k."""
    out, pos = [], 0
    for m in re.finditer(r"⟪(?:(\d+)\|)?(.*?)⟫", line):
        out.append(hl_seg(line[pos:m.start()], lang))
        attr = f' data-on="{m.group(1)}"' if m.group(1) else ' class="on"'
        out.append(f"<mark{attr}>{hl_seg(m.group(2), lang)}</mark>")
        pos = m.end()
    out.append(hl_seg(line[pos:], lang))
    return "".join(out) or " "


def line_steps(spec):
    """"1:2-4;2:6" -> {2: '1', 3: '1', 4: '1', 6: '2'}"""
    res = {}
    for part in filter(None, (spec or "").split(";")):
        k, rng = part.split(":")
        for r in rng.split(","):
            a, _, b = r.partition("-")
            for n in range(int(a), int(b or a) + 1):
                res[n] = k
    return res


def codeblocks(html):
    def blk(m):
        if m.group(0).startswith("<!--"):
            return m.group(0)  # комментарий с примером разметки не трогаем
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        lang = attrs.get("lang", "php")
        lines = html_mod.unescape(m.group(2)).strip("\n").split("\n")
        cur, on, inn = line_steps(attrs.get("cur")), line_steps(attrs.get("on")), line_steps(attrs.get("in"))
        bad = {int(x) for x in attrs.get("bad", "").split(",") if x}
        cls = "code" + (" plain" if lang == "text" else "") + (" " + attrs["class"] if "class" in attrs else "")
        style = f' style="{attrs["style"]}"' if "style" in attrs else ""
        rows = []
        for i, ln in enumerate(lines, 1):
            a = ""
            if i in cur: a += f' data-cur="{cur[i]}"'
            if i in on: a += f' data-on="{on[i]}"'
            if i in inn: a += f' data-in="{inn[i]}"'
            rows.append(f'<span class="ln{" bad" if i in bad else ""}"{a}>{hl_line(ln, lang)}</span>')
        return f'<pre class="{cls}"{style}>' + "".join(rows) + "</pre>"
    return re.sub(r"<!--.*?-->|<xcode([^>]*)>(.*?)</xcode>", blk, html, flags=re.S)


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


def quiz_data(mode):
    """data.js; вопросы командного квиза попадают только в версию quiz, чтобы студенты не видели их в коде страницы."""
    d = read("data.js")
    return d if mode == "quiz" else re.sub(r"\nquiz: \[.*?\n\],\n", "\n", d, count=1, flags=re.S)


def build(mode, design):
    body, icon_css = icons(figures(codeblocks(only(read("slides.html"), mode))))
    css = read(f"tokens-{design}.css")
    if design == "brand":
        css = embedded_fonts() + "\n" + css
        css += (":root{--grad-full:url(%s);--grad-soft:url(%s)}\n"
                % (b64(SRC / "grad_full.jpg", "image/jpeg"), b64(SRC / "grad_soft.jpg", "image/jpeg")))
    css += read("components.css") + read("deck.css") + read("mechanics.css") + read("topic.css") + icon_css
    body = f'<div class="app">\n{body}\n</div>'
    js = (f'window.DECK={{mode:"{mode}",design:"{design}",id:"{CONFIG["id"]}"}};\n'
          + quiz_data(mode) + "\n" + read("stands.js") + "\n" + read("deck.js")).replace("</script", "<\\/script")
    title = CONFIG["title_student" if mode == "student" else "title_pair"] + (", квиз" if mode == "quiz" else "") + ("" if design == "brand" else ", вариант")
    fonts = "" if design == "brand" else f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{GOOGLE_MINE}&display=swap">\n'
    head = f"<title>{title}</title>\n{fonts}<style>\n{css}\n</style>\n"
    tail = f"\n<script>\n{js}\n</script>\n"
    full = ('<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + "</head>\n<body>\n" + body + tail + "</body>\n</html>\n")
    name = f'{CONFIG["files"]}_{ {"pair": "пара", "quiz": "пара_квиз", "student": "студенты"}[mode] }{"" if design == "brand" else "_вариант"}'
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
    if 'data-gen="quiz"' in read("slides.html"):
        build("quiz", "brand")  # версия для пары с командным квизом, только HTML


if __name__ == "__main__":
    main()
