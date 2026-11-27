#!/usr/bin/env python3
"""Small dependency-free checks for the static Kawkab Al Cartoon page."""
from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_FILE = ROOT / "index.html"

class PageAudit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.anchor_targets = []
        self.local_assets = []
        self.controls = []
        self.labels = []
        self.lang = None
        self.direction = None
        self.viewport = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
            self.direction = attrs.get("dir")
        if tag == "meta" and attrs.get("name", "").lower() == "viewport":
            self.viewport = True
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a" and attrs.get("href", "").startswith("#"):
            self.anchor_targets.append(attrs["href"][1:])
        if tag in {"script", "link"}:
            key = "src" if tag == "script" else "href"
            value = attrs.get(key, "")
            if value and not value.startswith(("http://", "https://", "data:", "#")):
                self.local_assets.append(value.split("?", 1)[0])
        if tag in {"input", "select", "textarea"} and attrs.get("id"):
            self.controls.append(attrs["id"])
        if tag == "label" and attrs.get("for"):
            self.labels.append(attrs["for"])

page = PageAudit()
page.feed(HTML_FILE.read_text(encoding="utf-8"))
errors = []

duplicates = sorted({item for item in page.ids if page.ids.count(item) > 1})
if duplicates:
    errors.append("Duplicate HTML IDs: " + ", ".join(duplicates))
missing = sorted(set(page.anchor_targets) - set(page.ids))
if missing:
    errors.append("Anchor targets not found: " + ", ".join(missing))
unlabelled = sorted(set(page.controls) - set(page.labels))
if unlabelled:
    errors.append("Form controls without labels: " + ", ".join(unlabelled))
if page.lang != "ar" or page.direction != "rtl":
    errors.append("The document must declare lang='ar' and dir='rtl'.")
if not page.viewport:
    errors.append("Missing responsive viewport meta tag.")
for asset in page.local_assets:
    if not (ROOT / asset).is_file():
        errors.append("Referenced local asset does not exist: " + asset)

for required in ("style.css", "app.js"):
    if not (ROOT / required).is_file():
        errors.append("Required frontend file missing: " + required)

if errors:
    print("Frontend validation failed:")
    for error in errors:
        print(" - " + error)
    sys.exit(1)

print("Frontend structure, links, labels, and local assets validated.")
