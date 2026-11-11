# -*- coding: utf-8 -*-
"""Lint a question bank, print counts and length statistics, run code questions,
compare agent answers with the key.

Usage:
  python3 check_bank.py bank.json                  # lint + counts + levels + length stats
  python3 check_bank.py bank.json --run-code       # also execute every code question
  python3 check_bank.py bank.json --material chapter.md [previous.md ...]
                                                   # also check source quotes and code names
  python3 check_bank.py bank.json --ids            # list current IDs with first words
  python3 check_bank.py bank.json --compare key.json answers.json [--leak]
  python3 check_bank.py bank.json --xml DIR        # also parse the built XML files
Exit code 1 if there are errors.
"""

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bank_lib as bl  # noqa: E402

FORBIDDEN = [
    (r"лекци", "ссылка на лекцию"),
    (r"\bв материале\b|\bиз материала\b|\bматериалу\b", "ссылка на материал"),
    (r"\bв тексте\b|\bкак было показано\b", "ссылка на текст"),
    (r"[—–]", "длинное тире"),
    (r"Выберите\s+\d", "число верных ответов в формулировке"),
    (r"все перечисленн|ни один из перечисленн", "вариант 'все/ни один из перечисленных'"),
]
errors, warnings = [], []


def err(qid, msg):
    errors.append("%s: %s" % (qid, msg))


def warn(qid, msg):
    warnings.append("%s: %s" % (qid, msg))


ABSOLUTE = re.compile(r"\b(только|всегда|никогда|нельзя|невозможно|обязательно|полностью|"
                      r"любой|любая|любое|любые|любом|любого)\b", re.I)
HEDGE = re.compile(r"\b(может|могут|обычно|иногда|возможно|как правило|в некоторых)\b", re.I)

STOP = set("который которая которые которое этот этого такой такая такие нужно можно если когда чтобы "
           "между после перед через только также более менее всего всех один одна одно один".split())


def content_words(s):
    words = re.findall(r"[A-Za-zА-Яа-яЁё0-9]{5,}", s.lower().replace("`", ""))
    return {w[:6] for w in words if w not in STOP}


def plain_words(s):
    return re.findall(r"[A-Za-zА-Яа-яЁё0-9_$]+", s.lower().replace("`", ""))


def sources_of(q):
    src = q.get("source")
    if src is None or src == "":
        return []
    return [src] if isinstance(src, str) else list(src)


def norm_text(s):
    """Material and quotes compared without Markdown, typographic quotes and case."""
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)          # [text](url) -> text
    s = s.lower().replace("ё", "е")
    s = re.sub(r"[*_`#>|\\«»\"'“”„]", "", s)
    s = re.sub(r"[—–]", "-", s)
    return re.sub(r"\s+", " ", s).strip()


def has_code(q):
    return bool(q.get("code")) or q["type"] in ("output", "output_choice", "code")


def texts_of(q):
    t = [q.get("stem", ""), q.get("explanation", "")]
    t += [q.get("correct", "")] if isinstance(q.get("correct"), str) else list(q.get("correct", []))
    t += list(q.get("distractors", [])) + list(q.get("wrong", [])) + list(q.get("extras", []))
    t += [x for p in q.get("pairs", []) for x in p]
    return [x for x in t if x]


# -------------------------------------------------------------------- lint ---

def lint(bank, names):
    patterns = FORBIDDEN + ([(r"\b(%s)\b" % "|".join(map(re.escape, names)), "персонаж из текста")]
                            if names else [])
    stems = defaultdict(list)
    for qid, q in bl.all_ids(bank):
        t = q["type"]
        if t not in bl.TYPE_ORDER:
            err(qid, "неизвестный тип %r" % t)
            continue
        for text in texts_of(q):
            for pat, what in patterns:
                if re.search(pat, text, re.I):
                    err(qid, "%s: %r" % (what, text[:60]))
        if not q.get("explanation"):
            warn(qid, "нет пояснения (explanation)")
        if "level" in q and q["level"] not in (1, 2, 3):
            err(qid, "level должен быть 1, 2 или 3, сейчас %r" % (q["level"],))
        if "source" in q:
            src = sources_of(q)
            if not src or any(not isinstance(x, str) for x in src):
                err(qid, "source должен быть строкой или списком строк")
            elif sum(len(norm_text(x)) for x in src) < 20:
                warn(qid, "цитата source короче 20 знаков: по ней нельзя проверить опору")
        if q.get("code") and t != "code":
            if not q.get("lang"):
                warn(qid, "у кода в вопросе нет lang (json, bash, yaml или язык программирования)")
            if t not in ("output", "output_choice") and q["code"].count("\n") >= 20:
                warn(qid, "код в вопросе длиннее 20 строк")
        code = q.get("code") or ""
        # Комментарий PHP до <?php - это подпись файла, которую PHP выведет как текст.
        # HTML до <?php не трогаем: это часть страницы.
        before = code.split("<?php", 1)[0] if "<?php" in code else ""
        if re.search(r"^\s*(//|#|/\*)", before, re.M):
            warn(qid, "комментарий перед <?php (%r) PHP выведет как текст, а перед namespace это ошибка: "
                 "перенеси подпись файла внутрь, <?php // путь/файл.php" % before.strip()[:30])
        stems[(q["stem"].strip().lower(), q.get("code", ""))].append(qid)
        if t in ("single", "output_choice"):
            if len(q.get("distractors", [])) != 3:
                err(qid, "нужно ровно 3 дистрактора, сейчас %d" % len(q.get("distractors", [])))
            opts = [q["correct"]] + q["distractors"]
            if len(set(o.strip().lower() for o in opts)) != len(opts):
                err(qid, "повторяющиеся варианты")
            lens = [len(o) for o in opts]
            if min(lens) >= 8 and max(lens) > 2 * min(lens):
                warn(qid, "разброс длин вариантов %s" % lens)
            if t == "single":
                hard = [d for d in q["distractors"] if ABSOLUTE.search(d)]
                if not ABSOLUTE.search(q["correct"]) and len(hard) >= 2:
                    warn(qid, "в %d неверных вариантах категоричные слова (%s), в верном их нет: "
                              "верный угадывается как единственный спокойный"
                         % (len(hard), ", ".join(sorted({ABSOLUTE.search(d).group(1).lower() for d in hard}))))
                elif HEDGE.search(q["correct"]) and not any(HEDGE.search(d) for d in q["distractors"]):
                    warn(qid, "только верный вариант осторожный (%r): перенеси оговорку в вопрос"
                         % HEDGE.search(q["correct"]).group(1).lower())
            words = [plain_words(o) for o in opts]
            if all(len(w) >= 4 for w in words):
                if len(set(tuple(w[:2]) for w in words)) == 1:
                    warn(qid, "все варианты начинаются с %r: вынеси общее начало в вопрос"
                         % " ".join(words[0][:2]))
                elif len(set(tuple(w[-2:]) for w in words)) == 1:
                    warn(qid, "все варианты кончаются на %r: вынеси общий хвост в вопрос"
                         % " ".join(words[0][-2:]))
        if t in ("single", "multi", "output_choice"):
            opts = ([q["correct"]] if isinstance(q.get("correct"), str) else list(q.get("correct", []))) \
                + list(q.get("distractors", [])) + list(q.get("wrong", []))
            for o in opts:
                m = re.search(r"\(([A-Za-z][A-Za-z ,-]{2,})\)", o.replace("`", ""))
                if m and not re.search(r"\(([A-Za-z][A-Za-z ,-]{2,})\)", q["stem"]):
                    warn(qid, "расшифровка (%s) стоит в варианте: перенеси её в вопрос" % m.group(1))
                    break
        if t in ("single", "output_choice"):
            stem_words = content_words(q["stem"])
            key_hits = len(stem_words & content_words(q["correct"]))
            other = max(len(stem_words & content_words(d)) for d in q["distractors"]) if q["distractors"] else 0
            if key_hits >= 1 and key_hits > other:
                warn(qid, "только верный вариант повторяет слова из вопроса: %s"
                     % ", ".join(sorted(stem_words & content_words(q["correct"]))))
        if t == "multi":
            n, m = len(q.get("correct", [])), len(q.get("wrong", []))
            if not (4 <= n + m <= 6) or not (2 <= n <= 4):
                err(qid, "множественный выбор: %d верных, %d неверных (нужно 4-6 вариантов, 2-4 верных)" % (n, m))
            if m < 2:
                err(qid, "множественный выбор: меньше двух неверных вариантов")
        if t == "gap":
            if "____" not in q["stem"] and "____" not in q.get("code", "") and not q.get("code"):
                err(qid, "в формулировке нет пропуска ________")
            if not q.get("answers"):
                err(qid, "нет допустимых ответов")
        if t == "output":
            if not q.get("answers"):
                err(qid, "нет ответа")
            elif "\n" in q["answers"][0]:
                err(qid, "ответ должен быть одной строкой")
        if t == "output_choice" and "run_result" not in q:
            warn(qid, "нет run_result: исход нельзя проверить запуском")
        if t == "match":
            rights = [r for _, r in q["pairs"]] + list(q.get("extras", []))
            if len(set(rights)) != len(rights):
                err(qid, "повторяющиеся элементы справа")
            if len(q["pairs"]) != 5:
                warn(qid, "пар %d, обычно 5" % len(q["pairs"]))
            if not q.get("extras"):
                warn(qid, "нет лишнего варианта справа")
            for r in rights:
                if "`" in r or "*" in r:
                    warn(qid, "разметка справа в соединении (выпадающий список покажет её как есть): %r" % r[:40])
                if len(r) > 60:
                    warn(qid, "длинный элемент справа (%d символов): %r" % (len(r), r[:40]))
        if t == "code":
            tests = q.get("tests", [])
            if not (3 <= len(tests) <= 6):
                warn(qid, "тестов %d, нужно 3-6" % len(tests))
            if not any(not tc.get("show", True) for tc in tests):
                warn(qid, "нет скрытого теста")
            if q.get("format") in ("fix", "complete") and not q.get("preload"):
                err(qid, "для формата %s нужна заготовка preload" % q.get("format"))
    for stem, ids in stems.items():
        if len(ids) > 1:
            err(", ".join(ids), "одинаковые формулировки")


# ------------------------------------------------------------------- stats ---

def stats(bank):
    grp = bl.groups(bank)
    print("Количество вопросов:")
    for (st, cat), items in grp.items():
        c = Counter(q["type"] for _, q in items)
        print("  %-6s %-3s %3d  (%s)  %s ... %s" % (st, cat or "-", len(items),
              ", ".join("%s %d" % (t, c[t]) for t in bl.TYPE_ORDER if c[t]), items[0][0], items[-1][0]))
    print("Верный вариант самый длинный (одиночный выбор):")
    for (st, cat), items in grp.items():
        sel = [(qid, q) for qid, q in items if q["type"] in ("single", "output_choice")]
        if not sel:
            continue
        longest = [qid for qid, q in sel
                   if len(q["correct"]) > max(len(d) for d in q["distractors"])]
        share = len(longest) / len(sel)
        flag = "  <- больше трети" if share > 0.35 and len(sel) >= 6 else ""
        print("  %-6s %-3s %d из %d (%.0f%%)%s" % (st, cat or "-", len(longest), len(sel), 100 * share, flag))
        if share > 0.35 and len(sel) >= 6:
            warnings.append("%s/%s: верный вариант самый длинный в %d из %d: %s"
                            % (st, cat or "-", len(longest), len(sel), ", ".join(longest)))


# ------------------------------------------------------------------ levels ---

def written_lines(q):
    """How many lines of the reference solution the student has to write."""
    def lines(src):
        out = []
        for ln in (src or "").split("\n"):
            ln = ln.strip()
            if not ln or ln in ("<?php", "?>", "{", "}", "};") or ln.startswith(("//", "#", "/*", "*")):
                continue
            out.append(ln)
        return out
    sol = lines(q.get("solution"))
    if q.get("format") in ("fix", "complete") and q.get("preload"):
        given = Counter(lines(q["preload"]))
        rest = []
        for ln in sol:
            if given[ln] > 0:
                given[ln] -= 1
            else:
                rest.append(ln)
        return len(rest)
    sig = re.compile(r"^(?:(?:public|private|protected|static|final|async|export)\s+)*(?:function|def|class)\b")
    return len([ln for ln in sol if not sig.match(ln)])


def levels(bank):
    grp = bl.groups(bank)
    missing = [qid for qid, q in bl.all_ids(bank) if "level" not in q]
    if missing:
        warnings.append("у %d вопросов нет level (%s%s): распределение по уровням неполное"
                        % (len(missing), ", ".join(missing[:5]), " ..." if len(missing) > 5 else ""))
    for (st, cat), items in grp.items():
        tasks = [(qid, written_lines(q)) for qid, q in items if q["type"] == "code"]
        short = [qid for qid, n in tasks if n <= 2]
        if len(tasks) >= 4 and len(short) > len(tasks) / 2:
            warnings.append("%s/%s: %d из %d задач решаются в одну-две строки (%s)"
                            % (st, cat or "-", len(short), len(tasks), ", ".join(short)))
    if len(missing) == len(bl.all_ids(bank)):
        return
    print("Уровни (1 знает / 2 понимает / 3 применяет):")
    for (st, cat), items in grp.items():
        lv = [q["level"] for _, q in items if q.get("level") in (1, 2, 3)]
        if not lv:
            continue
        c = Counter(lv)
        n = len(lv)
        code_cat = cat in ("c", "u") or all(has_code(q) for _, q in items)
        print("  %-6s %-4s %d / %d / %d  (%.0f%% / %.0f%% / %.0f%%)%s"
              % (st, cat or "-", c[1], c[2], c[3], 100 * c[1] / n, 100 * c[2] / n, 100 * c[3] / n,
                 "  по коду" if code_cat else ""))
        if n < 6:
            continue
        where = "%s/%s" % (st, cat or "-")
        absent = [str(x) for x in (1, 2, 3) if not c[x] and not (x == 1 and code_cat)]
        if absent:
            warnings.append("%s: нет вопросов уровня %s" % (where, ", ".join(absent)))
        max1, min3 = (0.30, 0.25) if code_cat else (0.45, 0.20)
        if c[1] / n > max1:
            warnings.append("%s: уровень 1 у %d из %d вопросов (%.0f%%): замени часть вопросами на понимание и применение"
                            % (where, c[1], n, 100 * c[1] / n))
        if c[3] and c[3] / n < min3:
            warnings.append("%s: уровень 3 только у %d из %d вопросов (%.0f%%)" % (where, c[3], n, 100 * c[3] / n))
    for (st, cat), items in grp.items():
        tasks = [(qid, q, written_lines(q)) for qid, q in items if q["type"] == "code"]
        for qid, q, n in tasks:
            lvl = q.get("level")
            if lvl == 2 and n <= 2:
                warn(qid, "уровень 2, а написать нужно %d стр.: это уровень 1 или задаче нужна вторая конструкция" % n)
            elif lvl == 3 and n <= 5:
                warn(qid, "уровень 3, а написать нужно %d стр.: задача уровня 3 - от 9 строк" % n)
            elif lvl == 1 and n >= 8:
                warn(qid, "уровень 1, а написать нужно %d стр." % n)


# ------------------------------------------------------------------- style ---

def style(bank):
    """Monotony that is visible only across the whole bank."""
    fams = {"single": "выбор", "multi": "выбор", "output_choice": "выбор", "gap": "пропуск", "match": "соответствие"}
    openers, by_fam = defaultdict(list), Counter()
    same_start = []
    below = []
    for qid, q in bl.all_ids(bank):
        fam = fams.get(q["type"])
        if not fam:
            continue
        w = plain_words(q["stem"])
        key = " ".join(w[:2] if fam == "выбор" else w[:1])
        openers[(fam, key)].append(qid)
        by_fam[fam] += 1
        if q["type"] == "single":
            first = [plain_words(o)[:1] for o in [q["correct"]] + q["distractors"]]
            if all(first) and len(set(f[0] for f in first)) == 1 and len(first[0][0]) >= 4:
                same_start.append(qid)
        if q.get("code") and re.search(r"\bниже\b|\bследующ\w+\b|\bпоказанн\w+\b", q["stem"].lower()):
            below.append(qid)
    for (fam, key), ids in sorted(openers.items(), key=lambda kv: -len(kv[1])):
        n = by_fam[fam]
        limit = max(3, n // 5) if fam == "выбор" else max(4, n // 2)
        if n >= 8 and len(ids) > limit and key:
            warnings.append("зачин %r у %d из %d вопросов (%s): спроси по-разному"
                            % (key, len(ids), n, fam))
    gaps = [(qid, q) for qid, q in bl.all_ids(bank) if q["type"] == "gap" and "____" in q["stem"]]
    named = [qid for qid, q in gaps if re.search(r"называ\w+\s+_{4,}", q["stem"].lower())]
    if len(gaps) >= 4 and len(named) > len(gaps) / 2:
        warnings.append("%d из %d пропусков кончаются на 'называется ________': поставь термин туда, "
                        "где он работает в предложении" % (len(named), len(gaps)))
    singles = sum(1 for _, q in bl.all_ids(bank) if q["type"] == "single")
    if singles >= 8 and len(same_start) > singles / 4:
        warnings.append("в %d из %d вопросов с выбором все варианты начинаются с одного слова (%s%s): "
                        "общее начало - в вопрос" % (len(same_start), singles, ", ".join(same_start[:8]),
                                                     " ..." if len(same_start) > 8 else ""))
    with_code = sum(1 for _, q in bl.all_ids(bank) if q.get("code") and q["type"] != "code")
    if with_code >= 4 and len(below) > with_code / 2:
        warnings.append("в %d из %d вопросов с кодом стоит 'ниже', 'следующий' или 'показанный': "
                        "вопрос должен сам подводить к коду" % (len(below), with_code))


# ---------------------------------------------------------------- material ---

KEYWORDS = set("""if elseif else for foreach while do switch case default return function echo print try catch
finally throw def class new async await match fn use list array exit die include require include_once
require_once and or not in is lambda with as from import sizeof typeof instanceof main int float double
char void bool string var let const true false null none""".split())


def code_names(q):
    """Names the answer may depend on: calls, constants, superglobals, CLI flags, config keys, HTML attributes."""
    blocks = [(q.get("lang", ""), q.get("code", ""))]
    if q["type"] == "code":
        lang = q.get("coderunnertype", "")
        blocks += [(lang, q.get("solution", "")), (lang, q.get("preload", ""))]
    inline = " ".join(re.findall(r"`([^`]+)`", " ".join(texts_of(q))))
    blocks.append(("", inline))
    everything = "\n".join(src for _, src in blocks)
    defined = set(re.findall(r"\b(?:function|def|class|interface|const|let|var)\s+([A-Za-z_]\w*)", everything))
    defined |= set(re.findall(r"\b[\w:<>\*&]+\s+([A-Za-z_]\w*)\s*\([^;{)]*\)\s*\{", everything))
    if q["type"] == "code":
        defined |= set(re.findall(r"([A-Za-z_]\w*)\s*\(", " ".join(re.findall(r"`([^`]+)`", q.get("stem", "")))))
    names = set()
    for lang, src in blocks:
        if not src:
            continue
        names |= {n for n in re.findall(r"(?<![\w$])([A-Za-z_]\w*)\s*\(", src) if len(n) >= 3}
        names |= set(re.findall(r"\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b", src))
        names |= set(re.findall(r"__[A-Z]+__", src))
        names |= set(re.findall(r"\$_[A-Z]+", src))
        names |= set(re.findall(r"(?<![\w-])--[a-z][a-z0-9-]+", src))
        if lang in ("json",):
            names |= set(re.findall(r'"([A-Za-z][\w:.-]{2,})"\s*:', src))
        if lang in ("yaml", "yml"):
            names |= set(re.findall(r"^\s*-?\s*([A-Za-z][\w-]{2,}):", src, re.M))
        if lang in ("html", "php"):
            for _tag, attrs in re.findall(r"<([a-z][a-z0-9]*)\b([^<>?]*)>", src):
                attrs = re.sub(r"\"[^\"]*\"|'[^']*'", "", attrs)
                names |= {a for a in re.findall(r"\b([a-z][a-z-]{2,})\b", attrs)}
    return {n for n in names if n not in defined and n.lower() not in KEYWORDS and n.strip("_")}


def check_material(bank, paths):
    raw = ""
    for path in paths:
        with open(path, encoding="utf-8") as f:
            raw += f.read() + "\n"
    flat = norm_text(raw)
    no_source, absent = [], defaultdict(list)
    for qid, q in bl.all_ids(bank):
        src = sources_of(q)
        if not src:
            no_source.append(qid)
        for quote in src:
            if not isinstance(quote, str):
                continue
            for part in re.split(r"\.\.\.|…", quote):
                part = norm_text(part).strip(" .,;:-")
                if len(part) >= 12 and part not in flat:
                    err(qid, "цитаты source нет в материале: %r" % part[:70])
        for name in sorted(code_names(q)):
            if name not in raw:
                absent[name].append(qid)
    print("Материал: %d файл(ов), %d знаков" % (len(paths), len(raw)))
    if no_source:
        warnings.append("у %d вопросов нет source (%s%s): опору на материал проверить нечем"
                        % (len(no_source), ", ".join(no_source[:5]), " ..." if len(no_source) > 5 else ""))
    if absent:
        print("Имена из кода, которых нет в материале. Придумано для вопроса - оставь; "
              "настоящая функция, параметр или поле, которых тема не объясняла, - перестрой вопрос:")
        for name, ids in sorted(absent.items(), key=lambda kv: (-len(kv[1]), kv[0])):
            print("  %-28s %s" % (name, ", ".join(ids)))
        warnings.append("в коде вопросов %d имён, которых нет в материале: см. список выше" % len(absent))


# --------------------------------------------------------------------- code ---

def run(lang, src, stdin="", tmp=None):
    """Return the program's stdout, or 'Error' if it fails to compile or exits non-zero."""
    lang = {"python": "python3", "js": "nodejs", "node": "nodejs", "c++": "cpp"}.get(lang, lang)
    exe = {"python3": "python3", "php": "php", "nodejs": "node", "cpp": "g++", "c": "gcc"}.get(lang)
    if exe is None:
        return None, "unknown language %s" % lang
    if shutil.which(exe) is None:
        return None, "%s is not installed" % exe
    ext = {"python3": "py", "php": "php", "nodejs": "js", "cpp": "cpp", "c": "c"}[lang]
    path = os.path.join(tmp, "prog." + ext)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    try:
        if lang in ("cpp", "c"):
            binp = os.path.join(tmp, "prog")
            std = "-std=c++17" if lang == "cpp" else "-std=c11"
            cp = subprocess.run([exe, std, "-o", binp, path], capture_output=True, text=True, timeout=60)
            if cp.returncode != 0:
                return "Error", "compile: " + cp.stderr.strip()[:200]
            cmd = [binp]
        elif lang == "php":
            cmd = ["php", "-d", "display_errors=stderr", path]
        else:
            cmd = [exe, path]
        r = subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=10)
    except subprocess.TimeoutExpired:
        return "Error", "timeout"
    if r.returncode != 0:
        return "Error", r.stderr.strip()[:200]
    out = "\n".join(line.rstrip() for line in r.stdout.rstrip("\n").split("\n"))
    return out, r.stderr.strip()[:200]


def coderunner_source(crt, solution, testcode):
    if crt in ("python3", "python3_w_input"):
        return "python3", solution + "\n" + testcode + "\n"
    if crt == "php":
        sol = re.sub(r"^\s*<\?php", "", solution)
        tc = re.sub(r"^\s*<\?php", "", testcode)
        return "php", "<?php\n" + sol + "\n" + tc + "\n"
    if crt == "nodejs":
        return "nodejs", solution + "\n" + testcode + "\n"
    if crt == "cpp_function":
        return "cpp", "#include <bits/stdc++.h>\nusing namespace std;\n" + solution + \
            "\nint main() {\n" + testcode + "\nreturn 0;\n}\n"
    if crt == "c_function":
        return "c", "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <math.h>\n" + \
            solution + "\nint main() {\n" + testcode + "\nreturn 0;\n}\n"
    if crt == "cpp_program":
        return "cpp", solution
    if crt == "c_program":
        return "c", solution
    return None, None


def run_code(bank):
    print("Запуск кода:")
    n_ok = n_skip = 0
    with tempfile.TemporaryDirectory() as tmp:
        for qid, q in bl.all_ids(bank):
            t = q["type"]
            if t in ("output", "output_choice"):
                out, info = run(q.get("lang", ""), q["code"], tmp=tmp)
                if out is None:
                    n_skip += 1
                    warn(qid, "код не проверен: %s" % info)
                    continue
                if t == "output":
                    key = q["answers"][0]
                    if out != key:
                        err(qid, "ключ %r, а программа выводит %r %s" % (key, out, info))
                        continue
                    if "\n" in out:
                        err(qid, "вывод многострочный, ответ вводом невозможен")
                else:
                    rr = q.get("run_result")
                    actual = out
                    if out == "Error" and rr in ("CompileError", "RuntimeError"):
                        actual = "CompileError" if info.startswith("compile:") else "RuntimeError"
                    if rr is not None and actual != rr:
                        err(qid, "run_result %r, а программа выводит %r %s" % (rr, actual, info))
                        continue
                if out != "Error" and info:
                    warn(qid, "программа пишет в stderr: %s" % info)
                n_ok += 1
            elif t == "code":
                lang, _ = coderunner_source(q["coderunnertype"], "", "")
                if lang is None:
                    n_skip += 1
                    warn(qid, "тип CodeRunner %s не проверяется локально" % q["coderunnertype"])
                    continue
                failed = 0
                for i, tc in enumerate(q["tests"]):
                    lang, src = coderunner_source(q["coderunnertype"], q["solution"], tc.get("code", ""))
                    out, info = run(lang, src, tc.get("stdin", ""), tmp=tmp)
                    if out is None:
                        n_skip += 1
                        warn(qid, "код не проверен: %s" % info)
                        failed = -1
                        break
                    if out != tc["expected"].rstrip("\n"):
                        failed += 1
                        err(qid, "тест %d: ожидается %r, эталон выводит %r %s" % (i + 1, tc["expected"], out, info))
                if failed == 0:
                    n_ok += 1
                if failed == 0 and q.get("format") == "fix" and q.get("preload"):
                    broken = 0
                    for tc in q["tests"]:
                        lang, src = coderunner_source(q["coderunnertype"], q["preload"], tc.get("code", ""))
                        out, _ = run(lang, src, tc.get("stdin", ""), tmp=tmp)
                        broken += out != tc["expected"].rstrip("\n")
                    if broken == 0:
                        err(qid, "заготовка с ошибкой проходит все тесты: тесты не ловят ошибку")
    print("  проверено %d, не проверено %d" % (n_ok, n_skip))


# ------------------------------------------------------------------ compare ---

def norm(s):
    return re.sub(r"\s+", " ", str(s)).strip().lower()


def compare(bank, key_path, ans_path, leak):
    key = json.load(open(key_path, encoding="utf-8"))
    ans = json.load(open(ans_path, encoding="utf-8"))
    hits, total, rows = 0, 0, []
    has_evidence = any(isinstance(a, dict) and "evidence" in a for a in ans.values())
    for qid, k in key.items():
        if leak and k["type"] not in ("single", "multi", "output_choice"):
            continue
        a = ans.get(qid)
        if a is None:
            rows.append((qid, "нет ответа", ""))
            continue
        given = a.get("answer") if isinstance(a, dict) else a
        if k["type"] in ("gap", "output"):
            ok = norm(given) in [norm(x) for x in k["answer"]]
        elif k["type"] == "multi":
            ok = sorted(given or []) == k["answer"]
        elif k["type"] == "match":
            ok = {str(x): y for x, y in (given or {}).items()} == k["answer"]
        else:
            ok = given == k["answer"]
        total += 1
        hits += ok
        note = a.get("cue" if leak else "note", "") if isinstance(a, dict) else ""
        conf = a.get("confidence", "") if isinstance(a, dict) else ""
        if leak and ok and note and note != "none":
            rows.append((qid, "угадан по форме", note))
        elif not leak and not ok:
            rows.append((qid, "не совпал с ключом (%s, %s)" % (given, conf), note))
        elif not leak and has_evidence and not str(a.get("evidence", "")).strip():
            rows.append((qid, "верно, но без опоры на материал (%s)" % conf, note))
        elif not leak and note:
            rows.append((qid, "замечание", note))
    if not leak:
        for qid, a in ans.items():
            if qid not in key and isinstance(a, dict) and a.get("note"):
                rows.append((qid, "замечание к задаче", a["note"]))
    if leak:
        print("Детектор подсказок угадал %d из %d (%.0f%%; случайный выбор около 25%%)"
              % (hits, total, 100.0 * hits / max(total, 1)))
    else:
        print("Студент ответил верно на %d из %d" % (hits, total))
    for qid, what, note in rows:
        print("  %-8s %s%s" % (qid, what, (" | " + note) if note else ""))


# -------------------------------------------------------------------- xml ---

def check_xml(dirpath):
    import xml.etree.ElementTree as ET
    for f in sorted(glob.glob(os.path.join(dirpath, "*.xml"))):
        try:
            root = ET.parse(f).getroot()
        except ET.ParseError as e:
            errors.append("%s: XML не разбирается: %s" % (os.path.basename(f), e))
            continue
        qs = [q for q in root.findall("question") if q.get("type") != "category"]
        for q in qs:
            if q.get("type") == "multichoice":
                fr = [float(a.get("fraction")) for a in q.findall("answer")]
                if fr[0] <= 0 or abs(sum(x for x in fr if x > 0) - 100) > 0.01 or sum(x for x in fr if x < 0) < -100.01:
                    errors.append("%s %s: неверные доли" % (os.path.basename(f), q.find("name/text").text))
        print("  %-26s %3d  %s ... %s" % (os.path.basename(f), len(qs),
              qs[0].find("name/text").text if qs else "", qs[-1].find("name/text").text if qs else ""))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bank")
    ap.add_argument("--run-code", action="store_true")
    ap.add_argument("--ids", action="store_true")
    ap.add_argument("--compare", nargs=2, metavar=("KEY", "ANSWERS"))
    ap.add_argument("--leak", action="store_true")
    ap.add_argument("--xml", metavar="DIR")
    ap.add_argument("--material", nargs="+", metavar="FILE",
                    help="chapter file first, then previous chapters: check source quotes and code names")
    ap.add_argument("--names", default="Эмма,Джон", help="story characters that must not appear")
    args = ap.parse_args()
    bank = bl.load(args.bank)
    if args.ids:
        for qid, q in bl.all_ids(bank):
            print("%-9s %-13s %s" % (qid, q["type"], q["stem"].replace("\n", " ")[:80]))
        return
    if args.compare:
        compare(bank, args.compare[0], args.compare[1], args.leak)
        return
    lint(bank, [n for n in args.names.split(",") if n])
    stats(bank)
    levels(bank)
    style(bank)
    if args.material:
        check_material(bank, args.material)
    if args.run_code:
        run_code(bank)
    if args.xml:
        print("XML:")
        check_xml(args.xml)
    for w in warnings:
        print("ПРЕДУПРЕЖДЕНИЕ", w)
    for e in errors:
        print("ОШИБКА", e)
    print("Ошибок: %d, предупреждений: %d" % (len(errors), len(warnings)))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
