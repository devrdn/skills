#!/usr/bin/env python3
"""PostToolUse hook: lint a Moodle question bank right after Claude edits bank.json.

Runs check_bank.py without running code and passes Claude its errors as
additional context. Warnings are only counted: they are judgement calls the
skill handles at the build step. Never blocks the edit.
"""
import json
import os
import subprocess
import sys

MAX_SHOWN = 15


def emit(lines):
    print(json.dumps(
        {"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "\n".join(lines)}},
        ensure_ascii=False,
    ))


def main():
    try:
        data = json.load(sys.stdin)
    except ValueError:
        return
    path = (data.get("tool_input") or {}).get("file_path") or ""
    if os.path.basename(path) != "bank.json" or not os.path.isfile(path):
        return

    try:
        with open(path, encoding="utf-8") as f:
            json.load(f)
    except ValueError as e:
        emit(["bank.json не разбирается как JSON: %s. Исправь файл, прежде чем собирать банк." % e])
        return

    root = os.environ.get("CLAUDE_PLUGIN_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    script = os.path.join(root, "skills", "moodle-question-bank", "scripts", "check_bank.py")
    try:
        res = subprocess.run([sys.executable, script, path], capture_output=True, text=True, timeout=25)
    except (OSError, subprocess.TimeoutExpired):
        return
    if res.returncode not in (0, 1):
        emit(["check_bank.py не смог проверить bank.json:", (res.stderr or res.stdout).strip()[-800:]])
        return

    errors = [l[len("ОШИБКА "):] for l in res.stdout.splitlines() if l.startswith("ОШИБКА ")]
    n_warn = sum(1 for l in res.stdout.splitlines() if l.startswith("ПРЕДУПРЕЖДЕНИЕ "))
    if not errors:
        return
    lines = ["check_bank.py: ошибки в bank.json (%d), номер вопроса слева:" % len(errors)]
    lines += errors[:MAX_SHOWN]
    if len(errors) > MAX_SHOWN:
        lines.append("...и ещё %d." % (len(errors) - MAX_SHOWN))
    if n_warn:
        lines.append("Предупреждений: %d, их разбери на шаге сборки." % n_warn)
    lines.append("Исправь ошибки в вопросах, которые ты сейчас менял; остальные вопросы без просьбы не переписывай.")
    emit(lines)


if __name__ == "__main__":
    main()
