#!/usr/bin/env python3
"""Fail if the site has a broken local reference or one tied to a base path.

Both faults are invisible until someone loads the page, so the deploy workflow
runs this first. Only local references are checked; external URLs, anchors and
data URIs are left alone.

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

# 404.html is the one page that cannot be written relatively: Pages renders it
# at whatever URL was requested, so a relative reference resolves against that
# path rather than the file. It works the root out at runtime and keeps the
# site-absolute form only as the no-script fallback.
BASE_PATH_EXEMPT = {"404.html"}


def is_base_path_bound(ref: str) -> bool:
    """True if `ref` is resolved from the host root rather than the document.

    Such a reference only works where the site sits at the root of its domain.
    That holds for events.shoplivecorp.com but not for the github.io project
    page, where the site is mounted under /events/. Protocol-relative refs
    never reach here; local_refs drops them with the other external prefixes.
    """
    return ref.startswith("/")


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
    absolute: list[str] = []
    checked = 0

    def inspect(origin: pathlib.Path, base: pathlib.Path, ref: str) -> None:
        nonlocal checked
        checked += 1
        name = origin.relative_to(root)
        if not resolve(root, base, ref).is_file():
            broken.append(f"{name} -> {ref}")
        if is_base_path_bound(ref) and name.as_posix() not in BASE_PATH_EXEMPT:
            absolute.append(f"{name} -> {ref}")

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
            inspect(page, base, ref)

    for stylesheet in sorted(root.rglob("*.css")):
        if ".git" in stylesheet.parts:
            continue
        css = re.sub(r"/\*.*?\*/", "", stylesheet.read_text(encoding="utf-8"), flags=re.S)
        for ref in local_refs(css, [CSS_REF]):
            inspect(stylesheet, stylesheet.parent, ref)

    if broken:
        print(f"{len(broken)} broken reference(s) out of {checked}:", file=sys.stderr)
        for item in broken:
            print(f"  {item}", file=sys.stderr)
    if absolute:
        print(
            f"{len(absolute)} reference(s) assume the site is served from the "
            "root of its domain; make them relative to the document:",
            file=sys.stderr,
        )
        for item in absolute:
            print(f"  {item}", file=sys.stderr)
    if broken or absolute:
        return 1

    print(f"all {checked} local references resolve, none tied to a base path")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
