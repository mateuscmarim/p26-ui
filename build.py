#!/usr/bin/env python3
"""
Bundle credentials-panel into a single inline-script index.html.

Reads template.html (the dev-mode source which references /js/*.js as
separate files) and produces index.html (the committed deploy artifact)
with:
- deploy-header.js inlined as a <script>
- All app JS concatenated, ES-import/export-stripped, wrapped in an IIFE,
  and minified via esbuild
- css/styles.css inlined as a <style> tag

Usage:
    python build.py                     # rebuild index.html
    python build.py --no-minify         # skip esbuild
    python build.py --copy-to-static    # also copy into Spring static folder for dev
"""

import argparse
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
TEMPLATE = ROOT / "template.html"
OUTPUT = ROOT / "index.html"
STATIC_TARGET = (
    ROOT.parent / "java" / "parallel26" / "src" / "main" / "resources"
    / "static" / "credentials" / "index.html"
)

# JS files in dependency order (no deps first, entry point last).
# This list grows as C7–C16 add modules. Keep it in this exact order.
JS_FILES = [
    ROOT / "js" / "util.js",
    ROOT / "js" / "format.js",
    ROOT / "js" / "api.js",
    ROOT / "js" / "auth.js",
    ROOT / "js" / "components.js",
    ROOT / "js" / "sidebar.js",
    ROOT / "js" / "dashboard.js",
    ROOT / "js" / "credentials.js",
    ROOT / "js" / "ingest.js",
    ROOT / "js" / "audit.js",
    ROOT / "js" / "locations.js",
    ROOT / "js" / "app.js",
]

DEPLOY_HEADER = ROOT / "deploy-header.js"


def _replace_or_die(html: str, old: str, new: str, label: str) -> str:
    if old not in html:
        raise RuntimeError(f"template.html replacement target not found: {label}")
    return html.replace(old, new)


def strip_imports_exports(source: str) -> str:
    lines = source.split("\n")
    result = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("import "):
            continue
        if stripped.startswith("export ") and " from " in stripped:
            continue
        if stripped.startswith("export default "):
            line = line.replace("export default ", "", 1)
        elif stripped.startswith("export "):
            line = line.replace("export ", "", 1)
        result.append(line)
    return "\n".join(result)


def build_bundle() -> str:
    if not JS_FILES:
        return ""
    parts = ["(function () {", '  "use strict";', ""]
    for js_file in JS_FILES:
        source = js_file.read_text()
        cleaned = strip_imports_exports(source)
        cleaned = re.sub(r"^/\*\*[\s\S]*?\*/\s*", "", cleaned)
        indented = "\n".join(
            ("  " + line if line.strip() else "") for line in cleaned.split("\n")
        )
        parts.append(f"  // ── {js_file.stem} ──")
        parts.append(indented.strip())
        parts.append("")
    parts.append("})();")
    return "\n".join(parts)


def minify(js: str) -> str:
    if not js.strip():
        return js
    result = subprocess.run(
        ["npx", "--yes", "esbuild", "--minify", "--target=es2020"],
        input=js, capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"esbuild minification failed: {result.stderr}")
        print("Falling back to unminified bundle")
        return js
    return result.stdout


def build_html(*, skip_minify: bool = False) -> str:
    html = TEMPLATE.read_text()
    header_js = DEPLOY_HEADER.read_text()
    if not skip_minify:
        header_js = minify(header_js)

    bundle = build_bundle()
    if bundle and not skip_minify:
        bundle = minify(bundle)

    css = (ROOT / "css" / "styles.css").read_text()
    html = _replace_or_die(
        html,
        '  <link rel="stylesheet" href="/css/styles.css">',
        f"  <style>\n{css}\n  </style>",
        "css link",
    )

    # Replace dev module script tags with inline header + bundle.
    bundle_block = ""
    if bundle:
        bundle_block = f"  <script>\n{bundle}\n  </script>"
    html = _replace_or_die(
        html,
        '  <script src="/js/util.js"></script>\n  <script type="module" src="/js/app.js"></script>',
        f"  <script>\n{header_js}\n  </script>\n{bundle_block}",
        "dev script tags",
    )
    return html


def main():
    parser = argparse.ArgumentParser(description="Bundle credentials-panel for production")
    parser.add_argument("--no-minify", action="store_true", help="Skip esbuild minification")
    parser.add_argument("--copy-to-static", action="store_true",
                        help="Also copy index.html into the Spring static folder for dev")
    args = parser.parse_args()

    html = build_html(skip_minify=args.no_minify)
    OUTPUT.write_text(html)
    print(f"Built {OUTPUT} ({len(html)} bytes)")

    if args.copy_to_static:
        STATIC_TARGET.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(OUTPUT, STATIC_TARGET)
        print(f"Copied to {STATIC_TARGET}")


if __name__ == "__main__":
    main()
