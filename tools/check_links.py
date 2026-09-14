#!/usr/bin/env python3
"""Fail if any local asset reference in the site does not resolve to a file.

A broken image path on a static site is invisible until someone loads the page,
so the deploy workflow runs this first. Only local references are checked;
external URLs, anchors and data URIs are left alone.

Usage:
    python3 tools/check_links.py [root]
"""

import pathlib
import re
import sys
from urllib.parse import unquote, urlparse

SKIP_PREFIXES = ("http://", "https://", "//", "#", "data:", "mailto:", "tel:", "javascript:")

HTML_REF = re.compile(r'(?:src|href)\s*=\s*["\']([^"\']+)["\']')
CSS_REF = re.compile(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)")
# Asset paths assigned in page scripts, e.g. `img.src = 'assets/img/mark.webp'`.
JS_REF = re.compile(r"""\.src\s*=\s*['"]([^'"]+)['"]""")


def local_refs(text: str, patterns) -> list[str]:
    out = []
    for pattern in patterns:
        for ref in pattern.findall(text):
            ref = ref.strip()
            if ref and not ref.startswith(SKIP_PREFIXES):
                out.append(ref)
    return out


def resolve(root: pathlib.Path, base: pathlib.Path, ref: str) -> pathlib.Path:
    path = unquote(urlparse(ref).path)
    if not path:
        return base
    # A leading slash is site-absolute, anything else is relative to `base`.
    target = (root / path.lstrip("/")) if path.startswith("/") else (base / path)
    # A directory URL such as /summit-2026/ is served by its index.html.
    return target / "index.html" if target.is_dir() else target


def main() -> int:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    broken: list[str] = []
    checked = 0

    for page in sorted(root.rglob("*.html")):
        if ".git" in page.parts:
            continue
        html = page.read_text(encoding="utf-8")
        # Comments hold authoring notes with placeholder paths, not real refs.
        html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
        targets = [(page.parent, ref) for ref in local_refs(html, [HTML_REF])]

        # Paths inside a page script resolve against the document, not the
        # script file, so they are checked from the page's directory.
        for script in HTML_REF.findall(html):
            if not script.endswith(".js") or script.startswith(SKIP_PREFIXES):
                continue
            js = resolve(root, page.parent, script)
            if js.is_file():
                targets += [(page.parent, ref) for ref in local_refs(js.read_text(encoding="utf-8"), [JS_REF])]

        for base, ref in targets:
            checked += 1
            if not resolve(root, base, ref).is_file():
                broken.append(f"{page.relative_to(root)} -> {ref}")

    for stylesheet in sorted(root.rglob("*.css")):
        if ".git" in stylesheet.parts:
            continue
        css = re.sub(r"/\*.*?\*/", "", stylesheet.read_text(encoding="utf-8"), flags=re.S)
        for ref in local_refs(css, [CSS_REF]):
            checked += 1
            if not resolve(root, stylesheet.parent, ref).is_file():
                broken.append(f"{stylesheet.relative_to(root)} -> {ref}")

    if broken:
        print(f"{len(broken)} broken reference(s) out of {checked}:", file=sys.stderr)
        for item in broken:
            print(f"  {item}", file=sys.stderr)
        return 1

    print(f"all {checked} local references resolve")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
