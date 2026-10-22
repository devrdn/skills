#!/usr/bin/env python3
"""Lint a course chapter.
  python3 check_topic.py terms <prev_ch1.md> [<prev_ch2.md> ...] > known.txt   # terms + acronyms already introduced
  python3 check_topic.py check <chapter.md> [--chapter N] [--known known.txt] [--plain-captions]
Term and acronym findings are candidates to review, not verdicts."""
import re, sys

PREVIEW = ("содержание", "вопросы для самопроверки", "результаты обучения")
BOLD = re.compile(r"\*\*([^*]+?)\*\*")
ACR = re.compile(r"(?<![\w`/.-])([A-Z][A-Z0-9]{1,5})(?![\w`])")
STOP = {"NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION", "OK", "II", "III", "IV", "VI"}

def body_lines(text):
    out, code, story, prev = [], False, False, False
    for i, line in enumerate(text.splitlines(), 1):
        s = line.strip()
        if s.startswith("```"):
            code = not code; out.append((i, line, "code")); continue
        if s.startswith("<i>"): story = True
        if code: out.append((i, line, "code")); continue
        if story:
            out.append((i, line, "story")); story = "</i>" not in s; continue
        if s.startswith("#"):
            prev = s.lstrip("#").strip().lower() in PREVIEW
            out.append((i, line, "heading")); continue
        out.append((i, line, "preview" if prev else "text"))
    return out

def stem(w):
    w = w.lower()
    return w[:-2] if len(w) > 6 else (w[:-1] if len(w) > 4 else w)

def keys(raw):
    m = re.match(r"\s*([^(]+?)\s*(?:\(([^)]+)\))?\s*$", raw.replace("`", ""))
    ru, en = (m.group(1), m.group(2)) if m else (raw, None)
    k = [" ".join(stem(w) for w in ru.split()[:3])] + ([en.lower().strip()] if en else [])
    return [x for x in k if len(x) >= 3]

def defined(text):
    return [(n, m.group(1).strip()) for n, l, k in body_lines(text) if k == "text" for m in BOLD.finditer(l)]

def cmd_terms(paths):
    acr = set()
    for p in paths:
        text = open(p, encoding="utf-8").read()
        for _, t in defined(text): print(t)
        for _, l, k in body_lines(text):
            if k == "text": acr.update(ACR.findall(re.sub(r"`[^`]*`", "", l)))
    print("\n".join(sorted(acr - STOP)))

def cmd_check(path, chapter=None, known_path=None, plain=False):
    text = open(path, encoding="utf-8").read()
    lines, known, kacr, issues = body_lines(text), set(), set(), []
    if known_path:
        raw = open(known_path, encoding="utf-8").read()
        for t in raw.splitlines(): known.update(keys(t.strip()))
        kacr = set(ACR.findall(raw))
    add = lambda n, msg: issues.append((n, msg))
    lvl, figs, used, defs, blk, refs, summ, insum = 0, [], [], [], False, [], 0, False
    for n, line, kind in lines:
        if kind == "code":
            if line.strip().startswith("```"):
                if line.strip() == "```" and not blk: add(n, "code block without a language")
                blk = not blk
            continue
        if kind == "story": continue
        if re.search("[\u2014\u2013]", line): add(n, "em/en dash: use a plain hyphen -")
        if "«" in line or "»" in line: add(n, "«» quotes: check the subject profile")
        if re.search(r"(?<![*\w])\*(?!\*)[^*\n]+\*(?!\*)", line): add(n, "*italic*: use _italic_")
        if kind == "heading":
            l = len(line) - len(line.lstrip("#"))
            if lvl and l > lvl + 1: add(n, f"skipped heading level (h{lvl} -> h{l})")
            if re.match(r"#+\s*Библиограф", line): add(n, "no \"Библиография\" heading: footnotes follow the summary directly")
            insum = line.lstrip("#").strip().lower() == "резюме"
            lvl = l; continue
        if re.search(r"\bлекци", line, re.I): add(n, "word \"лекция\": chapters refer to themselves as \"глава\"")
        for m in BOLD.finditer(line):
            if not re.match(r"\s*(\([^)]*\)\s*)?-\s", line[m.end():m.end() + 60]) and not line.lstrip().startswith(("|", ">")):
                add(n, f"bold \"{m.group(1)}\" is not a definition (**Term (term)** - ...)")
        figs += [(n, a, b) for a, b in re.findall(r"^_(?:Рисунок )?(\d+)\.(\d+)\.\s", line.strip())]
        if not plain and re.match(r"^_\d+\.\d+\.\s", line.strip()): add(n, "figure caption must be _Рисунок X.Y. ..._")
        if not line.strip().startswith(("_", "!")): refs += [(n, a, b) for a, b in re.findall(r"рисун\w*\s+(\d+)\.(\d+)", line, re.I)]
        if insum and re.match(r"\s*(?:-|\d+\.)\s", line): summ += 1
        d = re.match(r"\s*\[\^([\w-]+)\]:", line)
        if d: defs.append(d.group(1))
        used += [(n, r) for r in re.findall(r"\[\^([\w-]+)\]", line[d.end() if d else 0:])]
    for n, a, b in figs:
        if chapter and int(a) != chapter: add(n, f"figure {a}.{b}: chapter number should be {chapter}")
    for n, a, b in refs:
        if (a, b) not in {(x, y) for _, x, y in figs}: add(n, f"reference to figure {a}.{b}, but no such caption")
    if summ > 8: add(0, f"summary has {summ} points: at most 8")
    nums = [int(b) for _, _, b in figs]
    if nums != list(range(1, len(nums) + 1)): add(0, f"figures not numbered consecutively: {nums}")
    for n, r in used:
        if r not in defs: add(n, f"footnote [^{r}] has no definition")
    for r in set(defs) - {r for _, r in used}: add(0, f"source [^{r}] is never cited")
    order = list(dict.fromkeys(r for _, r in used))
    if all(r.isdigit() for r in order) and [int(r) for r in order] != list(range(1, len(order) + 1)):
        add(0, f"footnotes not numbered in order of first use: {order}")
    body = [(n, re.sub(r"\*\*[^*]+\*\*", "", l.lower())) for n, l, k in lines if k == "text"]
    for dn, term in defined(text):
        for key in keys(term):
            if key in known: continue
            first = next((n for n, l in body if n < dn and key in l), None)
            if first and dn - first > 5: add(first, f"term \"{term}\" appears before its definition (line {dn})")
    seen = set()
    for n, l, k in lines:
        if k != "text" or l.lstrip().startswith("[^"): continue
        for a in ACR.findall(re.sub(r"`[^`]*`|\[[^\]]*\]\([^)]*\)", "", l)):
            if a in seen or a in STOP or a in kacr or a.lower() in known: continue
            seen.add(a); add(n, f"first use of {a}: known to students or expanded here?")
    words = len(re.findall(r"\w+", "\n".join(l for _, l, k in lines if k != "code")))
    for n, msg in sorted(issues): print(f"{n:>5}: {msg}" if n else f"    -: {msg}")
    print(f"\nWords outside code: {words}. Findings: {len(issues)}.")

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    opt = lambda k: a[a.index(k) + 1] if k in a else None
    if a[0] == "terms": cmd_terms(a[1:])
    else: cmd_check(a[1], int(opt("--chapter")) if opt("--chapter") else None, opt("--known"), "--plain-captions" in a)