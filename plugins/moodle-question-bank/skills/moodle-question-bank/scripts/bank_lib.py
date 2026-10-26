# -*- coding: utf-8 -*-
"""Shared helpers: loading bank.json, assigning IDs, grouping questions into files."""

import json
import re
from collections import OrderedDict

TYPE_ORDER = ["single", "multi", "gap", "match", "output", "output_choice", "code"]
GROUP_OF = {"single": "choice", "multi": "choice", "gap": "gapfill", "match": "matching",
            "output": "output", "output_choice": "output", "code": "code"}
SETS = ["main", "extra"]
DEFAULT_LABELS = {"": "Основные вопросы", "c": "Что выведет программа", "u": "Написание кода"}
ERROR_NOTE = "Если выполнение программы завершится ошибкой, введите `Error`."
UNIT_DATIVE = {"Лекция": "лекции", "Тема": "теме", "Глава": "главе"}
ID_RE = re.compile(r"^(\d{2,})([a-z]*)(\*?)_(\d+)$")


def load(path):
    with open(path, encoding="utf-8") as f:
        bank = json.load(f)
    bank.setdefault("categories", {})
    for k, v in DEFAULT_LABELS.items():
        bank["categories"].setdefault(k, v)
    bank.setdefault("category_root", "$course$/" + bank.get("course", "Course"))
    bank.setdefault("title", "")
    bank.setdefault("unit", "Лекция")
    for q in bank["questions"]:
        q.setdefault("cat", "")
        q.setdefault("set", "main")
        q.setdefault("explanation", "")
        q.setdefault("section", "")
    return bank


def save(bank, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=1)
        f.write("\n")


def categories_in_order(bank):
    seen = list(bank["categories"].keys())
    for q in bank["questions"]:
        if q["cat"] not in seen:
            seen.append(q["cat"])
    # the category without a suffix always comes first
    return [""] + [c for c in seen if c != ""]


def groups(bank):
    """OrderedDict (set, cat) -> list of (qid, question), numbered without gaps."""
    lec = int(bank["lecture"])
    out = OrderedDict()
    for st in SETS:
        for cat in categories_in_order(bank):
            qs = [q for q in bank["questions"] if q["set"] == st and q["cat"] == cat]
            if not qs:
                continue
            qs = sorted(qs, key=lambda q: TYPE_ORDER.index(q["type"]))  # stable
            width = max(2, len(str(len(qs))))
            star = "*" if st == "extra" else ""
            out[(st, cat)] = [("%02d%s%s_%0*d" % (lec, cat, star, width, i + 1), q)
                              for i, q in enumerate(qs)]
    return out


def all_ids(bank):
    res = []
    for items in groups(bank).values():
        res.extend(items)
    return res


def file_prefix(bank, st, cat):
    return "L%02d%s%s" % (int(bank["lecture"]), cat, "Q" if st == "extra" else "")


def category_path(bank, st, cat):
    tags = ([cat] if cat else []) + (["extra"] if st == "extra" else [])
    name = "%s %d" % (bank.get("unit", "Лекция"), int(bank["lecture"]))
    if tags:
        name += " (%s)" % ", ".join(tags)
    return bank["category_root"].rstrip("/") + "/" + name
