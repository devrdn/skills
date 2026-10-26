# -*- coding: utf-8 -*-
"""Rebuild bank.json from Moodle XML files produced by build_bank.py.

Usage:
  python3 import_xml.py L05_*.xml L05Q_*.xml L05c*.xml --out bank.json [--title "..."]

Sections are not stored in XML, so imported questions get an empty `section`.
"""

import argparse
import html
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bank_lib as bl  # noqa: E402


def html_to_text(s):
    """Inverse of build_bank.inline_html/paragraphs_html."""
    s = s or ""
    s = re.sub(r"</p>\s*<p>", "\n\n", s)
    s = re.sub(r"<code>(.*?)</code>", lambda m: "`%s`" % m.group(1), s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def guess_lang(code):
    if "<?php" in code:
        return "php"
    if "#include" in code:
        return "cpp" if ("iostream" in code or "std::" in code or "using namespace" in code) else "c"
    if "console.log" in code or re.search(r"\b(let|const|function)\b", code):
        return "nodejs"
    return "python3"


def text_of(el, path):
    node = el.find(path)
    return node.text if node is not None and node.text else ""


def parse_question(q):
    qid = text_of(q, "name/text").strip()
    m = bl.ID_RE.match(qid)
    if not m:
        raise ValueError("unexpected question name %r" % qid)
    lec, cat, star = int(m.group(1)), m.group(2), m.group(3)
    qtext = text_of(q, "questiontext/text")
    code = None
    pre = re.search(r"<pre><code>(.*?)</code></pre>", qtext, flags=re.S)
    if pre:
        code = html.unescape(pre.group(1))
        qtext = qtext[:pre.start()] + qtext[pre.end():]
    stem = html_to_text(qtext).replace(bl.ERROR_NOTE, "").strip()
    item = {"cat": cat, "set": "extra" if star else "main", "section": "", "stem": stem,
            "explanation": html_to_text(text_of(q, "generalfeedback/text"))}
    t = q.get("type")
    if t == "multichoice":
        answers = [(float(a.get("fraction")), (a.findtext("text") or "").strip()) for a in q.findall("answer")]
        single = (q.findtext("single") or "true").strip() == "true"
        if single:
            item["type"] = "output_choice" if code is not None else "single"
            item["correct"] = [x for f, x in answers if f > 0][0]
            item["distractors"] = [x for f, x in answers if f <= 0]
        else:
            item["type"] = "multi"
            item["correct"] = [x for f, x in answers if f > 0]
            item["wrong"] = [x for f, x in answers if f <= 0]
    elif t == "shortanswer":
        item["type"] = "output" if code is not None else "gap"
        item["answers"] = [(a.findtext("text") or "").replace("\\*", "*") for a in q.findall("answer")]
    elif t == "matching":
        item["type"] = "match"
        item["pairs"], item["extras"] = [], []
        for sq in q.findall("subquestion"):
            left = html_to_text(sq.findtext("text") or "")
            right = (sq.findtext("answer/text") or "").strip()
            if left:
                item["pairs"].append([left, right])
            else:
                item["extras"].append(right)
    elif t == "coderunner":
        item["type"] = "code"
        item["coderunnertype"] = (q.findtext("coderunnertype") or "").strip()
        item["preload"] = q.findtext("answerpreload") or ""
        item["format"] = "fix" if item["preload"] else "write"
        item["solution"] = q.findtext("answer") or ""
        item["allornothing"] = (q.findtext("allornothing") or "1").strip() == "1"
        item["tests"] = [{"code": tc.findtext("testcode/text") or "",
                          "stdin": tc.findtext("stdin/text") or "",
                          "expected": tc.findtext("expected/text") or "",
                          "show": (tc.findtext("display/text") or "SHOW").strip() == "SHOW",
                          "example": tc.get("useasexample") == "1"} for tc in q.findall("testcases/testcase")]
    else:
        raise ValueError("unsupported question type %r in %s" % (t, qid))
    if code is not None:
        item["code"] = code
        item["lang"] = guess_lang(code)
    return lec, item, qid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--title", default="")
    ap.add_argument("--md", help="a delivered Markdown key, to recover the topic title")
    args = ap.parse_args()
    bank = {"lecture": None, "course": "", "title": args.title, "categories": {}, "questions": []}
    seen = []
    for path in args.files:
        root = ET.parse(path).getroot()
        for q in root.findall("question"):
            if q.get("type") == "category":
                cat_path = text_of(q, "category/text")
                mu = re.search(r"/([^/]+?) \d+( \(.*\))?$", cat_path)
                if mu:
                    bank["unit"] = mu.group(1)
                bank["category_root"] = re.sub(r"/[^/]+? \d+( \(.*\))?$", "", cat_path)
                bank["course"] = bank["category_root"].replace("$course$/", "")
                continue
            lec, item, qid = parse_question(q)
            bank["lecture"] = lec
            seen.append((qid, item))
    # keep the delivered order: by set, category, then the number in the ID
    def order(pair):
        m = bl.ID_RE.match(pair[0])
        return (m.group(3) == "*", m.group(2), int(m.group(4)))
    bank["questions"] = [item for _, item in sorted(seen, key=order)]
    if args.md and not bank["title"]:
        first = open(args.md, encoding="utf-8").readline()
        m = re.match(r"#\s*(?:Extra-)?[Вв]опросы к \S+ \d+\.\s*(.+)", first)
        if m:
            bank["title"] = m.group(1).strip()
    bl.save(bank, args.out)
    print("imported %d questions into %s" % (len(seen), args.out))
    if any("code" in q for q in bank["questions"]):
        print("note: `lang` of output questions is guessed from the code; check it before --run-code")


if __name__ == "__main__":
    main()
