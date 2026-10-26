# -*- coding: utf-8 -*-
"""Edit bank.json by question IDs as they were last delivered.

Usage:
  python3 edit_bank.py bank.json show 05_06 05c_02
  python3 edit_bank.py bank.json apply --remove 05_06 05_56-05_59 05*_04 --to-extra 05_07 05_22 --to-main 05*_03
  python3 edit_bank.py bank.json fill-run-results

Put everything one user message asks for into ONE apply call: all IDs are resolved
against the numbering the user saw, before anything changes. Two separate calls would
read the second list against the already renumbered bank.
A moved question is appended to the end of its type block in the target set.
Ranges like 05_56-05_59 are expanded inside one category and set.
"""

import argparse
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bank_lib as bl  # noqa: E402


def expand(tokens):
    ids = []
    for tok in tokens:
        tok = tok.strip().rstrip(",")
        if "-" in tok and tok.count("_") == 2:
            a, b = tok.split("-")
            ma, mb = bl.ID_RE.match(a), bl.ID_RE.match(b)
            if not (ma and mb) or ma.group(1, 2, 3) != mb.group(1, 2, 3):
                sys.exit("cannot read range %r" % tok)
            width = len(ma.group(4))
            prefix = a[: a.rindex("_") + 1]
            ids += ["%s%0*d" % (prefix, width, n) for n in range(int(ma.group(4)), int(mb.group(4)) + 1)]
        else:
            ids.append(tok)
    return ids


def resolve(bank, ids):
    table = dict(bl.all_ids(bank))
    missing = [i for i in ids if i not in table]
    if missing:
        sys.exit("no such ID in the current numbering: %s (see check_bank.py --ids)" % ", ".join(missing))
    return [(i, table[i]) for i in ids]


def short(q):
    s = q["stem"].replace("\n", " ")
    if q.get("code"):
        s += " | " + q["code"].replace("\n", " ")[:50]
    return s[:110]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bank")
    ap.add_argument("command", choices=["show", "apply", "fill-run-results"])
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--remove", nargs="*", default=[])
    ap.add_argument("--to-extra", nargs="*", default=[])
    ap.add_argument("--to-main", nargs="*", default=[])
    args = ap.parse_args()
    bank = bl.load(args.bank)

    if args.command == "fill-run-results":
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import check_bank as cb
        n = 0
        with tempfile.TemporaryDirectory() as tmp:
            for qid, q in bl.all_ids(bank):
                if q["type"] == "output_choice" and "run_result" not in q:
                    out, _ = cb.run(q.get("lang", ""), q["code"], tmp=tmp)
                    if out is not None:
                        q["run_result"] = out
                        n += 1
                        print("%-9s run_result = %r" % (qid, out))
        bl.save(bank, args.bank)
        print("filled %d" % n)
        return

    if args.command == "show":
        for qid, q in resolve(bank, expand(args.ids)):
            print("%-9s %-13s %s" % (qid, q["type"], short(q)))
        return

    plan = [("убрать", resolve(bank, expand(args.remove))),
            ("в extra", resolve(bank, expand(args.to_extra))),
            ("в main", resolve(bank, expand(args.to_main)))]
    seen = {}
    for what, items in plan:
        for qid, q in items:
            if id(q) in seen:
                sys.exit("%s is listed twice (%s and %s)" % (qid, seen[id(q)], what))
            seen[id(q)] = what
            print("%-8s %-9s %-13s %s" % (what, qid, q["type"], short(q)))
    removed = {id(q) for _, q in plan[0][1]}
    moving = [(q, "extra") for _, q in plan[1][1]] + [(q, "main") for _, q in plan[2][1]]
    moving_ids = {id(q) for q, _ in moving}
    rest = [q for q in bank["questions"] if id(q) not in removed and id(q) not in moving_ids]
    for q, target in moving:
        q["set"] = target
    bank["questions"] = rest + [q for q, _ in moving]  # moved ones go to the end of their type block
    bl.save(bank, args.bank)
    print("убрано %d, перенесено %d; пересоберите банк, чтобы обновить нумерацию"
          % (len(removed), len(moving)))


if __name__ == "__main__":
    main()
