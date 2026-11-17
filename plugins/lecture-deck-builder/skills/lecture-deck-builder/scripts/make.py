#!/usr/bin/env python3
"""Build one version of the deck: pptxgenjs -> post-processing (transitions, click steps) -> PDF -> layout checks.
Usage (in the work folder):  python3 make.py content.js OutName          teacher version
                             STUDENT=1 python3 make.py content.js OutName student version
Prints engine WARNs (overflow by page number), check_all.py and footer_scan.py results.
"""
import os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
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
    sys.exit("PDF was not produced: is LibreOffice installed?")
run(sys.executable, "check_all.py", f"{name}.pdf")
run(sys.executable, "footer_scan.py", f"{name}.pdf")
