# -*- coding: utf-8 -*-
"""Build Moodle XML files and Markdown keys from bank.json.

Usage:
  python3 build_bank.py bank.json --out DIR
  python3 build_bank.py bank.json --student student.md --key key.json
"""

import argparse
import json
import os
import random
import sys
from collections import OrderedDict
from xml.sax.saxutils import escape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bank_lib as bl  # noqa: E402

LETTERS = "ABCDEFGH"
POS = {1: "100", 2: "50", 3: "33.33333", 4: "25"}
NEG = {1: "-100", 2: "-50", 3: "-33.33333", 4: "-25"}
FEEDBACK = """  <correctfeedback format="html">
    <text>Ответ верный.</text>
  </correctfeedback>
  <partiallycorrectfeedback format="html">
    <text>Ответ частично верный.</text>
  </partiallycorrectfeedback>
  <incorrectfeedback format="html">
    <text>Ответ неверный.</text>
  </incorrectfeedback>"""
MD_LANG = {"python3": "python", "python3_w_input": "python", "php": "php", "nodejs": "javascript",
           "cpp": "cpp", "cpp_function": "cpp", "cpp_program": "cpp", "c": "c",
           "c_function": "c", "c_program": "c"}


# ------------------------------------------------------------------ helpers ---

def cdata(s):
    return "<![CDATA[%s]]>" % s.replace("]]>", "]]]]><![CDATA[>")


def inline_html(s):
    """Escape text and turn `code` spans into <code>."""
    parts = s.split("`")
    return "".join("<code>%s</code>" % escape(p) if i % 2 else escape(p)
                   for i, p in enumerate(parts))


def paragraphs_html(s):
    return "".join("<p>%s</p>" % inline_html(p.strip()) for p in s.split("\n\n") if p.strip())


def question_html(q):
    html = paragraphs_html(q["stem"])
    if q.get("code") and q["type"] != "code":
        html += "<pre><code>%s</code></pre>" % escape(q["code"])
    if q["type"] == "output":
        html += paragraphs_html(bl.ERROR_NOTE)
    return html


def esc_short(a):
    """In Moodle shortanswer an asterisk is a wildcard."""
    return a.replace("*", "\\*")


def head(qid, q, grade="1.0000000", penalty="0.3333333"):
    return ['  <name>',
            '    <text>%s</text>' % escape(qid),
            '  </name>',
            '  <questiontext format="html">',
            '    <text>%s</text>' % cdata(question_html(q)),
            '  </questiontext>',
            '  <generalfeedback format="html">',
            '    <text>%s</text>' % cdata(paragraphs_html(q.get("explanation", ""))),
            '  </generalfeedback>',
            '  <defaultgrade>%s</defaultgrade>' % grade,
            '  <penalty>%s</penalty>' % penalty,
            '  <hidden>0</hidden>']


def mc_answer(fraction, text):
    return ('  <answer fraction="%s" format="markdown">\n'
            '    <text>%s</text>\n'
            '    <feedback format="html"><text></text></feedback>\n'
            '  </answer>' % (fraction, cdata(text)))


def xml_mc(qid, q, single, answers):
    lines = ['<question type="multichoice">'] + head(qid, q)
    lines += ['  <single>%s</single>' % ("true" if single else "false"),
              '  <shuffleanswers>1</shuffleanswers>',
              '  <answernumbering>none</answernumbering>', FEEDBACK]
    return "\n".join(lines + answers + ['</question>'])


# --------------------------------------------------------------- XML per type ---

def xml_single(qid, q):
    answers = [mc_answer("100", q["correct"])] + [mc_answer("0", d) for d in q["distractors"]]
    return xml_mc(qid, q, True, answers)


def xml_multi(qid, q):
    n, m = len(q["correct"]), len(q["wrong"])
    answers = [mc_answer(POS[n], o) for o in q["correct"]] + [mc_answer(NEG[m], o) for o in q["wrong"]]
    return xml_mc(qid, q, False, answers)


def xml_short(qid, q):
    lines = ['<question type="shortanswer">'] + head(qid, q) + ['  <usecase>0</usecase>']
    for a in q["answers"]:
        lines += ['  <answer fraction="100" format="moodle_auto_format">',
                  '    <text>%s</text>' % escape(esc_short(a)),
                  '    <feedback format="html"><text></text></feedback>',
                  '  </answer>']
    return "\n".join(lines + ['</question>'])


def xml_match(qid, q):
    lines = ['<question type="matching">'] + head(qid, q)
    lines += ['  <shuffleanswers>true</shuffleanswers>', FEEDBACK]
    for left, right in q["pairs"]:
        lines += ['  <subquestion format="html">',
                  '    <text>%s</text>' % cdata("<p>%s</p>" % inline_html(left)),
                  '    <answer>', '      <text>%s</text>' % escape(right), '    </answer>',
                  '  </subquestion>']
    for right in q.get("extras", []):
        lines += ['  <subquestion format="html">', '    <text></text>',
                  '    <answer>', '      <text>%s</text>' % escape(right), '    </answer>',
                  '  </subquestion>']
    return "\n".join(lines + ['</question>'])


def xml_output_choice(qid, q):
    answers = [mc_answer("100", q["correct"])] + [mc_answer("0", d) for d in q["distractors"]]
    return xml_mc(qid, q, True, answers)


def xml_code(qid, q):
    allornothing = "1" if q.get("allornothing", True) else "0"
    lines = ['<question type="coderunner">'] + head(qid, q, penalty="0.0000000")
    lines += ['  <coderunnertype>%s</coderunnertype>' % q["coderunnertype"],
              '  <prototypetype>0</prototypetype>',
              '  <allornothing>%s</allornothing>' % allornothing,
              '  <penaltyregime>0, 10, 20, ...</penaltyregime>',
              '  <precheck>0</precheck>',
              '  <showsource>0</showsource>',
              '  <answerboxlines>%d</answerboxlines>' % int(q.get("answerboxlines", 12)),
              '  <answerboxcolumns>90</answerboxcolumns>',
              '  <answerpreload>%s</answerpreload>' % (cdata(q["preload"]) if q.get("preload") else ""),
              '  <useace></useace>', '  <resultcolumns></resultcolumns>', '  <template></template>',
              '  <iscombinatortemplate></iscombinatortemplate>', '  <allowmultiplestdins></allowmultiplestdins>',
              '  <answer>%s</answer>' % cdata(q["solution"]),
              '  <validateonsave>1</validateonsave>',
              '  <testsplitterre></testsplitterre>', '  <language></language>', '  <acelang></acelang>',
              '  <sandbox></sandbox>', '  <grader></grader>', '  <cputimelimitsecs></cputimelimitsecs>',
              '  <memlimitmb></memlimitmb>', '  <sandboxparams></sandboxparams>',
              '  <templateparams></templateparams>', '  <uiplugin></uiplugin>',
              '  <testcases>']
    for t in q["tests"]:
        lines += ['    <testcase testtype="0" useasexample="%d" hiderestiffail="0" mark="1.0000000">'
                  % (1 if t.get("example") else 0),
                  '      <testcode>', '        <text>%s</text>' % escape(t.get("code", "")), '      </testcode>',
                  '      <stdin>', '        <text>%s</text>' % escape(t.get("stdin", "")), '      </stdin>',
                  '      <expected>', '        <text>%s</text>' % escape(t["expected"]), '      </expected>',
                  '      <extra>', '        <text></text>', '      </extra>',
                  '      <display>', '        <text>%s</text>' % ("SHOW" if t.get("show", True) else "HIDE"),
                  '      </display>',
                  '    </testcase>']
    lines += ['  </testcases>', '</question>']
    return "\n".join(lines)


XML_OF = {"single": xml_single, "multi": xml_multi, "gap": xml_short, "match": xml_match,
          "output": xml_short, "output_choice": xml_output_choice, "code": xml_code}


def xml_document(category, blocks):
    top = ('<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n\n'
           '<question type="category">\n  <category>\n'
           '    <text>%s</text>\n  </category>\n</question>\n' % escape(category))
    return "\n\n".join([top] + blocks + ["</quiz>"]) + "\n"


# ---------------------------------------------------------------- Markdown key ---

def code_block(lang, code):
    return ["```%s" % MD_LANG.get(lang, lang or ""), code.rstrip("\n"), "```"]


def md_question(qid, q, k):
    out = ["### %s" % qid, "", q["stem"], ""]
    t = q["type"]
    if q.get("code") and t != "code":
        out += code_block(q.get("lang", ""), q["code"]) + [""]
    if t == "output":
        out += [bl.ERROR_NOTE, ""]
    if t in ("single", "output_choice"):
        opts = list(q["distractors"])
        pos = k % (len(opts) + 1)
        opts.insert(pos, q["correct"])
        out += ["- %s. %s" % (LETTERS[i], o) for i, o in enumerate(opts)]
        out += ["", "*Ответ*: %s." % LETTERS[pos]]
    elif t == "multi":
        opts, good = [], []
        c, w = list(q["correct"]), list(q["wrong"])
        while c or w:  # interleave so that correct options are not grouped
            if c:
                good.append(len(opts))
                opts.append(c.pop(0))
            if w:
                opts.append(w.pop(0))
        out += ["- %s. %s" % (LETTERS[i], o) for i, o in enumerate(opts)]
        out += ["", "*Ответы*: %s." % ", ".join(LETTERS[i] for i in good)]
    elif t in ("gap", "output"):
        ans = q["answers"]
        line = "*Ответ*: `%s`" % ans[0] if t == "output" else "*Ответ*: %s" % ans[0]
        if len(ans) > 1:
            line += " (также принимается: %s)" % ", ".join(ans[1:])
        out += [line]
    elif t == "match":
        out += ["| Элемент | Соответствие |", "| --- | --- |"]
        out += ["| %s | %s |" % (l, r) for l, r in q["pairs"]]
        if q.get("extras"):
            out += ["", "*Лишний вариант*: %s" % "; ".join(q["extras"])]
    elif t == "code":
        if q.get("preload"):
            out += ["*Заготовка*:", ""] + code_block(q["coderunnertype"], q["preload"]) + [""]
        out += ["*Эталонное решение*:", ""] + code_block(q["coderunnertype"], q["solution"]) + [""]
        out += ["| # | Тест | stdin | Ожидаемый вывод | Показ |", "| --- | --- | --- | --- | --- |"]
        for i, tc in enumerate(q["tests"]):
            cell = lambda s: ("`%s`" % s.replace("\n", "\\n").replace("|", "\\|")) if s else ""
            out += ["| %d | %s | %s | %s | %s |" % (i + 1, cell(tc.get("code", "")), cell(tc.get("stdin", "")),
                                                    cell(tc["expected"]), "SHOW" if tc.get("show", True) else "HIDE")]
    return "\n".join(out) + "\n"


def md_document(bank, st):
    lec = int(bank["lecture"])
    unit = bl.UNIT_DATIVE.get(bank.get("unit", "Лекция"), bank.get("unit", "Лекция").lower())
    title = ("Вопросы к %s %d" if st == "main" else "Extra-вопросы к %s %d") % (unit, lec)
    if bank.get("title"):
        title += ". " + bank["title"]
    parts = ["# %s" % title, ""]
    grp = bl.groups(bank)
    cats = [c for (s, c) in grp if s == st]
    for cat in cats:
        if len(cats) > 1:
            parts += ["## %s" % bank["categories"].get(cat, cat), ""]
        k = 0
        for qid, q in grp[(st, cat)]:
            parts.append(md_question(qid, q, k))
            if q["type"] in ("single", "output_choice"):
                k += 1
    return "\n".join(parts).rstrip() + "\n"


# ------------------------------------------------------ keyless student version ---

def student_version(bank):
    lines, key = ["# Тест", ""], OrderedDict()
    for qid, q in bl.all_ids(bank):
        rnd = random.Random(qid)
        t = q["type"]
        lines += ["### %s" % qid, "", q["stem"], ""]
        if q.get("code") and t != "code":
            lines += code_block(q.get("lang", ""), q["code"]) + [""]
        if t == "output":
            lines += [bl.ERROR_NOTE, "", "Ответ: ________", ""]
            key[qid] = {"type": t, "answer": q["answers"]}
        elif t in ("single", "output_choice"):
            opts = [q["correct"]] + list(q["distractors"])
            rnd.shuffle(opts)
            lines += ["%s. %s" % (LETTERS[i], o) for i, o in enumerate(opts)] + [""]
            key[qid] = {"type": t, "answer": LETTERS[opts.index(q["correct"])]}
        elif t == "multi":
            opts = list(q["correct"]) + list(q["wrong"])
            rnd.shuffle(opts)
            lines += ["(несколько верных ответов)", ""]
            lines += ["%s. %s" % (LETTERS[i], o) for i, o in enumerate(opts)] + [""]
            key[qid] = {"type": t, "answer": sorted(LETTERS[opts.index(o)] for o in q["correct"])}
        elif t == "gap":
            lines += ["Ответ: ________", ""]
            key[qid] = {"type": t, "answer": q["answers"]}
        elif t == "match":
            rights = [r for _, r in q["pairs"]] + list(q.get("extras", []))
            rnd.shuffle(rights)
            lines += ["%d. %s" % (i + 1, l) for i, (l, _) in enumerate(q["pairs"])] + [""]
            lines += ["%s. %s" % (LETTERS[i], r) for i, r in enumerate(rights)] + [""]
            key[qid] = {"type": t, "answer": {str(i + 1): LETTERS[rights.index(r)]
                                              for i, (_, r) in enumerate(q["pairs"])}}
        elif t == "code":
            if q.get("preload"):
                lines += code_block(q["coderunnertype"], q["preload"]) + [""]
            lines += ["(задание на код, ответ не требуется)", ""]
    return "\n".join(lines).rstrip() + "\n", key


# --------------------------------------------------------------------- main ---

def build(bank, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for (st, cat), items in bl.groups(bank).items():
        by_group = OrderedDict()
        for qid, q in items:
            by_group.setdefault(bl.GROUP_OF[q["type"]], []).append(XML_OF[q["type"]](qid, q))
        for group, blocks in by_group.items():
            name = "%s_%s.xml" % (bl.file_prefix(bank, st, cat), group)
            with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
                f.write(xml_document(bl.category_path(bank, st, cat), blocks))
            written.append((name, len(blocks)))
    for st in bl.SETS:
        if any(s == st for s, _ in bl.groups(bank)):
            name = "L%02d%s_questions.md" % (int(bank["lecture"]), "Q" if st == "extra" else "")
            with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
                f.write(md_document(bank, st))
            written.append((name, None))
    return written


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bank")
    ap.add_argument("--out")
    ap.add_argument("--student")
    ap.add_argument("--key")
    args = ap.parse_args()
    bank = bl.load(args.bank)
    if args.out:
        for name, n in build(bank, args.out):
            print("%-28s %s" % (name, "" if n is None else "%d вопросов" % n))
    if args.student:
        text, key = student_version(bank)
        with open(args.student, "w", encoding="utf-8") as f:
            f.write(text)
        if args.key:
            with open(args.key, "w", encoding="utf-8") as f:
                json.dump(key, f, ensure_ascii=False, indent=1)
        print("student version:", args.student, "| questions with key:", len(key))
    if not (args.out or args.student):
        ap.error("nothing to do: give --out and/or --student")


if __name__ == "__main__":
    main()
