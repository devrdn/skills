#!/usr/bin/env python3
"""Build open-answer (essay) questions: Markdown rubric for review + Moodle XML.

Usage: python3 build_essay.py essay.json --out DIR [--xml]
Without --xml only the Markdown rubric files are written (for the author's approval).
"""
import argparse, html, json, os, re, sys

LEVELS = {"apply": "применение (Apply)", "analyze": "анализ (Analyze)"}
UNIT_DATIVE = {"Лекция": "лекции", "Тема": "теме", "Глава": "главе"}


def num(x):
    s = ("%.1f" % x).rstrip("0").rstrip(".")
    return s.replace(".", ",")


def inline_html(s):
    parts = s.split("`")
    return "".join("<code>%s</code>" % html.escape(p) if i % 2 else html.escape(p)
                   for i, p in enumerate(parts))


def paras(s):
    return "".join("<p>%s</p>" % inline_html(p.strip()) for p in s.split("\n\n") if p.strip())


def check(b):
    errs = []
    for i, q in enumerate(b["questions"], 1):
        mp = q.get("max_points", b["max_points"])
        total = sum(r["points"] for r in q["rubric"])
        if abs(total - mp) > 1e-9:
            errs.append("вопрос %d: сумма рубрики %s, а максимум %s" % (i, total, mp))
        if any(abs(r["points"] * 2 - round(r["points"] * 2)) > 1e-9 for r in q["rubric"]):
            errs.append("вопрос %d: баллы должны быть кратны 0,5" % i)
        if q["level"] not in LEVELS:
            errs.append("вопрос %d: level должен быть apply или analyze" % i)
        text = json.dumps(q, ensure_ascii=False)
        if re.search("[—–]", text):
            errs.append("вопрос %d: длинное тире" % i)
    return errs


def ids(b, s):
    n, suf = b["lecture"], b["suffix"]
    qs = [q for q in b["questions"] if q.get("set", "main") == s]
    return [("%02d%s%s_%02d" % (n, suf, "*" if s == "extra" else "", k), q) for k, q in enumerate(qs, 1)]


def md(b, s, items):
    unit = b.get("unit", "Лекция")
    out = ["# Вопросы с развёрнутым ответом к %s %d%s. %s" % (
        UNIT_DATIVE.get(unit, unit.lower()), b["lecture"], " (extra)" if s == "extra" else "", b["title"]), "",
        "Категория: `%s`. Максимальный балл за вопрос: %s." % (b["suffix"], num(b["max_points"])), ""]
    for qid, q in items:
        out += ["---", "", "## %s" % qid, "", "*Уровень*: %s" % LEVELS[q["level"]], "", q["stem"], ""]
        if q.get("code"):
            out += ["```%s" % q.get("lang", ""), q["code"].rstrip("\n"), "```", ""]
        out += ["*Максимум*: %s" % num(q.get("max_points", b["max_points"])), "",
                "| Что проверяем | Баллы | Полный балл | Частичный балл |", "| --- | --- | --- | --- |"]
        for r in q["rubric"]:
            out.append("| %s | %s | %s | %s |" % (r["element"], num(r["points"]), r["full"], r.get("partial", "")))
        out.append("")
        if q.get("not_credited"):
            out += ["*Не засчитывается*: " + "; ".join(q["not_credited"]) + ".", ""]
    return "\n".join(out)


def grader_html(q, b):
    rows = "".join("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
        inline_html(r["element"]), num(r["points"]), inline_html(r["full"]), inline_html(r.get("partial", "")))
        for r in q["rubric"])
    h = ("<table border=\"1\"><tr><th>Что проверяем</th><th>Баллы</th><th>Полный балл</th>"
         "<th>Частичный балл</th></tr>%s</table>" % rows)
    if q.get("not_credited"):
        h += "<p><b>Не засчитывается</b>: %s.</p>" % inline_html("; ".join(q["not_credited"]))
    return h


def xml(b, s, items):
    unit = b.get("unit", "Лекция")
    cat = "%s/%s %d (%s%s)" % (b.get("category_root", "$course$/" + b["course"]), unit, b["lecture"],
                                b["suffix"], ", extra" if s == "extra" else "")
    L = ['<?xml version="1.0" encoding="UTF-8"?>', "<quiz>", '  <question type="category">',
         "    <category><text>%s</text></category>" % html.escape(cat), "  </question>"]
    for qid, q in items:
        qt = paras(q["stem"])
        if q.get("code"):
            qt += "<pre><code>%s</code></pre>" % html.escape(q["code"])
        L += ['  <question type="essay">', "    <name><text>%s</text></name>" % qid,
              '    <questiontext format="html"><text><![CDATA[%s]]></text></questiontext>' % qt,
              '    <generalfeedback format="html"><text></text></generalfeedback>',
              "    <defaultgrade>%.7f</defaultgrade>" % q.get("max_points", b["max_points"]),
              "    <penalty>0.0000000</penalty>", "    <hidden>0</hidden>", "    <idnumber></idnumber>",
              "    <responseformat>editor</responseformat>", "    <responserequired>1</responserequired>",
              "    <responsefieldlines>%d</responsefieldlines>" % q.get("lines", 10),
              "    <minwordlimit></minwordlimit>", "    <maxwordlimit></maxwordlimit>",
              "    <attachments>0</attachments>", "    <attachmentsrequired>0</attachmentsrequired>",
              "    <maxbytes>0</maxbytes>", "    <filetypeslist></filetypeslist>",
              '    <graderinfo format="html"><text><![CDATA[%s]]></text></graderinfo>' % grader_html(q, b),
              '    <responsetemplate format="html"><text></text></responsetemplate>', "  </question>"]
    L.append("</quiz>")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bank"); ap.add_argument("--out", default="."); ap.add_argument("--xml", action="store_true")
    a = ap.parse_args()
    b = json.load(open(a.bank, encoding="utf-8"))
    errs = check(b)
    for e in errs:
        print("ОШИБКА", e)
    if errs:
        sys.exit(1)
    os.makedirs(a.out, exist_ok=True)
    tag = "%02d%s" % (b["lecture"], b["suffix"])
    for s, sfx in (("main", ""), ("extra", "Q")):
        items = ids(b, s)
        if not items:
            continue
        p = os.path.join(a.out, "L%s%s_rubric.md" % (tag, sfx))
        open(p, "w", encoding="utf-8").write(md(b, s, items))
        print(p, len(items), "вопросов", items[0][0], "...", items[-1][0])
        if a.xml:
            p = os.path.join(a.out, "L%s%s_essay.xml" % (tag, sfx))
            open(p, "w", encoding="utf-8").write(xml(b, s, items))
            print(p)


if __name__ == "__main__":
    main()
