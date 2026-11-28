#!/usr/bin/env python3
"""Small dependency-free checks for the static Kawkab Al Cartoon page."""
from html.parser import HTMLParser
from pathlib import Path
import sys
import json

ROOT = Path(__file__).resolve().parents[1]
HTML_FILE = ROOT / "index.html"
PUBLIC_DIR = ROOT / "public"

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

# Cloudflare Workers serves only the isolated public directory.
for required in ("index.html", "style.css", "app.js"):
    source = ROOT / required
    deployed = PUBLIC_DIR / required
    if not deployed.is_file():
        errors.append("Cloudflare public asset missing: public/" + required)
    elif source.is_file() and source.read_bytes() != deployed.read_bytes():
        errors.append("Cloudflare public asset is out of sync: public/" + required)

config_file = ROOT / "wrangler.jsonc"
try:
    config = json.loads(config_file.read_text(encoding="utf-8"))
    if config.get("name") != "kawkab-alcartoon":
        errors.append("wrangler.jsonc must target the existing kawkab-alcartoon Worker.")
    if config.get("assets", {}).get("directory") != "./public":
        errors.append("Wrangler assets directory must be ./public.")
    if not config.get("compatibility_date"):
        errors.append("Wrangler compatibility_date is required.")
except FileNotFoundError:
    errors.append("Missing wrangler.jsonc Cloudflare deployment configuration.")
except (json.JSONDecodeError, OSError) as error:
    errors.append("Invalid wrangler.jsonc configuration: " + str(error))


# Validate the standalone games page and keep root/public copies identical.
GAMES_HTML = ROOT / "games.html"
GAMES_JS = ROOT / "games.js"
GAMES_CSS = ROOT / "games.css"
for required in (GAMES_HTML, GAMES_JS, GAMES_CSS):
    if not required.is_file():
        errors.append("Games asset missing: " + str(required.relative_to(ROOT)))

if GAMES_HTML.is_file():
    games = PageAudit()
    games.feed(GAMES_HTML.read_text(encoding="utf-8"))
    if games.lang != "ar" or games.direction != "rtl":
        errors.append("Games page must declare lang='ar' and dir='rtl'.")
    duplicate_game_ids = sorted({item for item in games.ids if games.ids.count(item) > 1})
    if duplicate_game_ids:
        errors.append("Duplicate games HTML IDs: " + ", ".join(duplicate_game_ids))
    game_ids = set(games.ids)
    for key in ("memory", "color", "number", "letters", "shapes"):
        if "tab-" + key not in game_ids or "game-" + key not in game_ids:
            errors.append("Games tab/panel pair is incomplete: " + key)
    for asset in games.local_assets:
        if not (ROOT / asset).is_file():
            errors.append("Games page references a missing local asset: " + asset)

for source_name in ("games.html", "games.js", "games.css"):
    source = ROOT / source_name
    deployed = PUBLIC_DIR / source_name
    if not deployed.is_file():
        errors.append("Cloudflare games asset missing: public/" + source_name)
    elif source.is_file() and source.read_bytes() != deployed.read_bytes():
        errors.append("Cloudflare games asset is out of sync: public/" + source_name)

if errors:
    print("Frontend validation failed:")
    for error in errors:
        print(" - " + error)
    sys.exit(1)

print("Frontend structure, links, labels, and local assets validated.")
