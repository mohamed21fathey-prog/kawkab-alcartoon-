#!/usr/bin/env python3
"""Dependency-free smoke checks for the static Kawkab Al Cartoon frontend."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "index.html", "about.html", "privacy.html", "contact.html",
    "games.html", "video-editor.html",
    "public/index.html", "public/about.html", "public/privacy.html",
    "public/contact.html", "public/games.html", "public/video-editor.html",
]
MIRRORS = [
    ("index.html", "public/index.html"),
    ("app.js", "public/app.js"),
    ("style.css", "public/style.css"),
    ("games.html", "public/games.html"),
    ("games.js", "public/games.js"),
    ("games.css", "public/games.css"),
    ("video-editor.html", "public/video-editor.html"),
    ("video-editor.js", "public/video-editor.js"),
    ("video-editor.css", "public/video-editor.css"),
]

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.duplicates = []
        self.local_refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        element_id = attrs.get("id")
        if element_id:
            if element_id in self.ids:
                self.duplicates.append(element_id)
            self.ids.add(element_id)
        ref = attrs.get("src") if tag in ("script", "img", "video", "source") else None
        if tag == "link" and attrs.get("rel") == "stylesheet":
            ref = attrs.get("href")
        if tag == "a":
            ref = attrs.get("href")
        if ref:
            parts = urlsplit(ref)
            if not parts.scheme and not parts.netloc and parts.path:
                self.local_refs.append(parts.path)

errors = []
for left, right in MIRRORS:
    a, b = ROOT / left, ROOT / right
    if not a.is_file() or not b.is_file():
        errors.append(f"Missing mirror: {left} or {right}")
    elif a.read_bytes() != b.read_bytes():
        errors.append(f"Root/public files differ: {left} != {right}")

for relative in PAGES:
    page = ROOT / relative
    if not page.is_file():
        errors.append(f"Missing page: {relative}")
        continue
    parser = PageParser()
    parser.feed(page.read_text(encoding="utf-8"))
    if parser.duplicates:
        errors.append(f"{relative}: duplicate IDs: {', '.join(parser.duplicates)}")
    for ref in parser.local_refs:
        target = (page.parent / ref.split('#', 1)[0]).resolve()
        if not target.exists():
            errors.append(f"{relative}: missing local reference {ref}")

required_ids = {
    "index.html": {"idea-form", "idea-result", "saved-project-list",
                   "project-count", "project-import", "project-feedback",
                   "speak-project-idea"},
    "video-editor.html": {"video-files", "clip-list", "load-engine",
                          "merge-videos", "editor-status", "download-merged"},
    "games.html": {"memory-game", "color-game", "number-game"},
}
for relative, expected in required_ids.items():
    page = ROOT / relative
    if not page.is_file():
        continue
    parser = PageParser()
    parser.feed(page.read_text(encoding="utf-8"))
    missing = expected - parser.ids
    if missing:
        errors.append(f"{relative}: missing required IDs: {', '.join(sorted(missing))}")

if errors:
    print("Frontend smoke checks failed:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"Frontend smoke checks passed: {len(PAGES)} pages, {len(MIRRORS)} mirrored file pairs.")
