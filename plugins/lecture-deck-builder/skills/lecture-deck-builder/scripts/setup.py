#!/usr/bin/env python3
"""Prepare a build folder: engine, scripts, brand fonts and dependencies. Safe to re-run.
Usage: python3 <skill>/scripts/setup.py <workdir>
"""
import os, shutil, subprocess, sys, glob

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
wd = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "deck")
os.makedirs(os.path.join(wd, "img"), exist_ok=True)

for f in ["build_modern.js", "post.py", "check_all.py", "widths.json", "package.json"]:
    shutil.copy(os.path.join(SKILL, "engine", f), wd)
for f in ["grad_full.png", "grad_soft.png"]:
    shutil.copy(os.path.join(SKILL, "engine", "img", f), os.path.join(wd, "img"))
for f in ["make.py", "lint_content.js", "story.js", "footer_scan.py"]:
    shutil.copy(os.path.join(SKILL, "scripts", f), wd)

# Brand fonts: without them LibreOffice substitutes another font and the layout breaks.
fonts = subprocess.run(["fc-list"], capture_output=True, text=True).stdout if shutil.which("fc-list") else ""
if "Manrope" not in fonts or "IBM Plex Mono" not in fonts:
    dst = os.path.expanduser("~/.local/share/fonts")
    os.makedirs(dst, exist_ok=True)
    for f in glob.glob(os.path.join(SKILL, "engine", "fonts", "*.ttf")):
        shutil.copy(f, dst)
    subprocess.run(["fc-cache", "-f"], capture_output=True)

if not all(os.path.isdir(os.path.join(wd, "node_modules", m)) for m in ["pptxgenjs", "image-size"]):
    subprocess.run(["npm", "install", "--silent", "--no-audit", "--no-fund"], cwd=wd, check=True,
                   stdout=subprocess.DEVNULL)
try:
    import pdfplumber, PIL  # noqa: F401
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "--break-system-packages", "pdfplumber", "pillow"],
                   check=True)
missing = [t for t in ["node", "soffice", "pdftoppm"] if not shutil.which(t)]
print(f"OK: workdir {wd}" + (f"; missing tools: {', '.join(missing)}" if missing else ""))
