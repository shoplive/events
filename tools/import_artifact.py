#!/usr/bin/env python3
"""Convert a single-file Claude Artifact export into the hosted static page.

The artifact is authored as one self-contained HTML file with every font and
image inlined as a base64 data URI. That is fine for previewing, but a 1.1 MB
HTML document that no browser can cache is a poor thing to serve. This script
unpacks it into a normal static site:

    summit-2026/index.html
    summit-2026/assets/css/{fonts,style}.css
    summit-2026/assets/js/main.js
    summit-2026/assets/fonts/*.woff2
    summit-2026/assets/img/*

Usage:
    python3 tools/import_artifact.py <exported-artifact.html> [--out summit-2026]

Re-run it whenever the artifact is updated; it overwrites the generated files.
Any asset it does not recognise is written as assets/img/asset-NN.<ext> and
should be given a real name in ASSET_NAMES below.
"""

import argparse
import base64
import hashlib
import pathlib
import re
import sys

# Ordered map of the data URIs found in the artifact, by their sha1 prefix.
# Keying on content rather than position means re-exports keep stable filenames
# as long as the assets themselves have not changed.
ASSET_NAMES = {
    # fonts
    "541876b7": "fonts/pretendard-400.woff2",
    "69e0d306": "fonts/pretendard-500.woff2",
    "1b487b57": "fonts/pretendard-700.woff2",
    "e5e92cb2": "fonts/pretendard-800.woff2",
    # brand marks
    "6b325d34": "img/shoplive-logo.png",
    "a17165dc": "img/summit-lockup.svg",
    "c527a51b": "img/hero-symbol.webp",
    # speaker company logos
    "f606c36b": "img/logo-musinsa.png",
    "eaf8c13d": "img/logo-ohouse.png",
    "5461d6c8": "img/logo-conny.png",
    "1d69a801": "img/logo-mareunfive.png",
    "a5a957a8": "img/logo-atcosme.png",
    "6d3f2343": "img/logo-silicon2.png",
    "01341ea4": "img/logo-keb-hana.png",
    "fd4cc3f6": "img/logo-meta.png",
    "e501b7a9": "img/logo-pulio.png",
    "684d3045": "img/logo-pulio.png",
    "0dedf3d0": "img/logo-keb-hana.png",
    "14ce24f6": "img/logo-r2w.png",
    # speaker portraits
    "d1ce8b64": "img/speaker-kim-kiyoung.jpg",
    "41791790": "img/speaker-lee-gyuwon.jpg",
    "625313ab": "img/speaker-kim-seongjin.jpg",
    "95c9726f": "img/speaker-kim-moeul.jpg",
    "754d6b9a": "img/speaker-choi-young.jpg",
    "7daea379": "img/speaker-choi-young.jpg",
    "694c383d": "img/speaker-kim-siyoung.jpg",
    "21edb412": "img/speaker-lee-juhee.jpg",
    "3a1fc87d": "img/speaker-oh-juyoung.jpg",
    "6be1c3ef": "img/speaker-lee-gyuwon.jpg",
    "ec459dd8": "img/speaker-onishi-kiyotaka.png",
    # timetable thumbnails
    "c9f59c53": "img/timetable-kim-kiyoung.jpg",
    "70e36ca0": "img/timetable-kim-seongjin.jpg",
    "682acf0a": "img/timetable-lee-gyuwon.jpg",
    "ebcda67b": "img/timetable-kim-moeul.jpg",
    "53d5db34": "img/timetable-onishi-kiyotaka.png",
    "7bec7693": "img/timetable-choi-young.jpg",
    "f73567d4": "img/timetable-lee-gyuwon.jpg",
    "cad82cea": "img/timetable-lee-juhee.jpg",
    "a08a9787": "img/timetable-oh-juyoung.jpg",
    "bf226bc9": "img/timetable-kim-siyoung.jpg",
    # perks
    "9ef7a946": "img/perk-demo-booth.webp",
    "ab724149": "img/perk-networking-lunch.webp",
    "cbf72f16": "img/perk-goods.webp",
    "2d427780": "img/perk-luckydraw-leica.webp",
    # moment 섹션 배경
    "41988da2": "img/moment-bg.webp",
}

EXT = {
    "font/woff2": "woff2",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/gif": "gif",
}

DATA_URI = re.compile(r"data:([a-zA-Z0-9/+.\-]+);base64,([A-Za-z0-9+/=]+)")

SITE_URL = "https://events.shoplivecorp.com/summit-2026/"
DESCRIPTION = (
    "Video Commerce Summit 2026 — 비디오 커머스의 다음 단계를 여는 초대 전용 서밋. "
    "연사, 세션 타임테이블, 참가 혜택, 행사장 안내."
)

HEAD_TEMPLATE = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{description}" />
<link rel="canonical" href="{site_url}" />
<meta name="theme-color" content="#0A0A0A" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Shoplive Events" />
<meta property="og:locale" content="ko_KR" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:url" content="{site_url}" />
<meta property="og:image" content="{site_url}og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{site_url}og-image.png" />

<link rel="icon" href="../favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="assets/img/shoplive-logo.png" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800&display=swap" />

<link rel="preload" href="assets/fonts/pretendard-400.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="assets/fonts/pretendard-700.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="assets/css/fonts.css" />
<link rel="stylesheet" href="assets/css/style.css" />
</head>
<body>
"""

# The artifact host wraps the page in its own skeleton; these are the only rules
# from it the page actually leans on, so they are carried over verbatim.
HOST_RESET = """/* Carried over from the artifact host skeleton the page was authored against. */
img { max-width: 100%; }
[hidden]:not([hidden="until-found" i]) { display: none !important; }
"""


def unpack_assets(html: str, assets_dir: pathlib.Path) -> tuple[str, dict[str, str]]:
    """Write every data URI out as a file and return the rewritten HTML."""
    written: dict[str, str] = {}
    unnamed = 0

    def replace(match: re.Match) -> str:
        nonlocal unnamed
        mime, payload = match.group(1), match.group(2)
        blob = base64.b64decode(payload)
        digest = hashlib.sha1(blob).hexdigest()[:8]
        name = ASSET_NAMES.get(digest)
        if name is None:
            unnamed += 1
            name = f"img/asset-{unnamed:02d}.{EXT.get(mime, 'bin')}"
            print(f"  ! unrecognised asset {digest} ({mime}) -> {name}", file=sys.stderr)
        path = assets_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(blob)
        written[digest] = name
        # Fonts are referenced from assets/css/*.css, images from index.html.
        return f"../{name}" if name.startswith("fonts/") else f"assets/{name}"

    return DATA_URI.sub(replace, html), written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", help="exported single-file artifact HTML")
    parser.add_argument("--out", default="summit-2026", help="output directory")
    args = parser.parse_args()

    raw = pathlib.Path(args.artifact).read_text(encoding="utf-8")
    if "<body>" not in raw:
        print("error: no <body> found; is this an artifact export?", file=sys.stderr)
        return 1

    # Drop the artifact host's skeleton and trailing close tags; what remains is
    # the authored page: a stylesheet link, a title, two <style> blocks, then
    # the markup and the page script.
    body = raw.split("<body>", 1)[1]
    body = re.sub(r"</body>\s*</html>\s*$", "", body).strip()

    out = pathlib.Path(args.out)
    assets = out / "assets"
    (assets / "css").mkdir(parents=True, exist_ok=True)
    (assets / "js").mkdir(parents=True, exist_ok=True)

    body, written = unpack_assets(body, assets)
    print(f"  unpacked {len(written)} assets into {assets}")

    title_match = re.search(r"<title>(.*?)</title>", body, re.S)
    title = title_match.group(1).strip() if title_match else "Video Commerce Summit 2026"

    styles = re.findall(r"<style>(.*?)</style>", body, re.S)
    if len(styles) < 2:
        print(f"error: expected 2 <style> blocks, found {len(styles)}", file=sys.stderr)
        return 1
    (assets / "css" / "fonts.css").write_text(styles[0].strip() + "\n", encoding="utf-8")
    (assets / "css" / "style.css").write_text(
        HOST_RESET + "\n" + styles[1].strip() + "\n", encoding="utf-8"
    )

    # The last <script> block is the page behaviour. The Kakao map loader and its
    # inline config stay where they are, since they must run in document order
    # next to the element they mount into.
    page_script = re.search(r"<script>\n(.*)\n</script>\s*$", body, re.S)
    if not page_script:
        print("error: could not locate the trailing page <script>", file=sys.stderr)
        return 1
    (assets / "js" / "main.js").write_text(page_script.group(1).strip() + "\n", encoding="utf-8")

    # Strip what has moved out of the body, keeping the markup itself.
    markup = body[: page_script.start()]
    markup = re.sub(r"<style>.*?</style>", "", markup, count=2, flags=re.S)
    markup = re.sub(r"<title>.*?</title>", "", markup, count=1, flags=re.S)
    markup = re.sub(
        r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', "", markup, count=1
    )

    page = (
        HEAD_TEMPLATE.format(title=title, description=DESCRIPTION, site_url=SITE_URL)
        + markup.strip()
        + '\n\n<script src="assets/js/main.js"></script>\n</body>\n</html>\n'
    )
    (out / "index.html").write_text(page, encoding="utf-8")
    print(f"  wrote {out / 'index.html'} ({len(page) // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
