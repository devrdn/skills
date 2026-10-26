#!/usr/bin/env python3
"""PostToolUse hook: lint a course chapter right after Claude edits it.

Runs only for chapter files (NN_Name/readme.md) and passes Claude the reliable
findings of check_topic.py as additional context. Never blocks the edit.
"""
import json
import os
import re
import subprocess
import sys

CHAPTER = re.compile(r"(?:^|/)(\d{2})_[^/]+/readme\.md$", re.I)
# Findings worth acting on. Term, acronym and bold findings are only candidates
# and would flood every edit, so the hook leaves them to the skill's own checks.
RELIABLE = (
    "em/en dash",
    "«»",
    "*italic*",
    "skipped heading",
    "Библиография",
    "лекция",
    "figure",
    "footnote",
    "source [^",
    "summary has",
    "code block without",
)
MAX_SHOWN = 15


def main():
    try:
        data = json.load(sys.stdin)
    except ValueError:
        return
    path = (data.get("tool_input") or {}).get("file_path") or ""
    match = CHAPTER.search(path.replace("\\", "/"))
    if not match or not os.path.isfile(path):
        return

    root = os.environ.get("CLAUDE_PLUGIN_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    script = os.path.join(root, "skills", "course-topic-writer", "scripts", "check_topic.py")
    with open(path, encoding="utf-8") as f:
        text = f.read()

    args = [sys.executable, script, "check", path, "--chapter", str(int(match.group(1)))]
    # Courses that caption figures as "_6.1. ..." instead of "_Рисунок 6.1. ..."
    if re.search(r"^_\d+\.\d+\.\s", text, re.M) and not re.search(r"^_Рисунок \d+\.\d+\.\s", text, re.M):
        args.append("--plain-captions")

    try:
        out = subprocess.run(args, capture_output=True, text=True, timeout=25).stdout
    except (OSError, subprocess.TimeoutExpired):
        return

    findings = [
        line.strip()
        for line in out.splitlines()
        if re.match(r"\s*(\d+|-):\s", line) and any(key in line for key in RELIABLE)
    ]
    if not findings:
        return

    chapter = os.path.basename(os.path.dirname(path))
    shown = findings[:MAX_SHOWN]
    lines = [f"check_topic.py: замечания по оформлению в {chapter}/readme.md ({len(findings)}), номер строки слева:"]
    lines += shown
    if len(findings) > len(shown):
        lines.append(f"...и ещё {len(findings) - len(shown)}.")
    lines.append(
        "Исправь замечания в тексте, который ты сейчас менял. "
        "Замечания в тексте автора, который ты не трогал, не исправляй: перечисли их в заметке автору."
    )
    print(json.dumps(
        {"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "\n".join(lines)}},
        ensure_ascii=False,
    ))


if __name__ == "__main__":
    main()
