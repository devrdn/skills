#!/usr/bin/env python3
"""Собирает одну версию презентации: pptxgenjs -> постобработка (переходы, шаги по щелчку) -> PDF -> проверки вёрстки.
Запуск (в рабочей папке):  python3 make.py content.js OutName            версия преподавателя
                           STUDENT=1 python3 make.py content.js OutName  студенческая версия
Печатает WARN движка (что не помещается, с номером страницы) и результаты check_all.py и footer_scan.py.
"""
import os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 3:
    print("Запуск: python3 make.py content.js OutName  (студенческая версия: STUDENT=1 python3 make.py content.js OutNames)", file=sys.stderr)
    sys.exit(1)
content, name = sys.argv[1], sys.argv[2]
run = lambda *a: subprocess.run(list(a), cwd=here, check=True)
run("node", "build_modern.js", content, f"{name}.pptx")
with open(os.path.join(here, f"{name}.pptx.noanim")) as f:
    noanim = f.read()
run(sys.executable, "post.py", f"{name}.pptx", f"{name}.pptx", noanim)
soffice = "/mnt/skills/public/pptx/scripts/office/soffice.py"
cmd = [sys.executable, soffice] if os.path.exists(soffice) else ["soffice"]
subprocess.run(cmd + ["--headless", "--convert-to", "pdf", f"{name}.pptx"], cwd=here,
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
if not os.path.exists(os.path.join(here, f"{name}.pdf")):
    sys.exit("PDF не создан: установлен ли LibreOffice?")
run(sys.executable, "check_all.py", f"{name}.pdf")
run(sys.executable, "footer_scan.py", f"{name}.pdf")
