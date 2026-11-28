#!/usr/bin/env python3
"""Validate the D1-compatible schema and starter catalogue using stdlib SQLite."""
from pathlib import Path
import sqlite3

base = Path(__file__).resolve().parent
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript((base / "schema.sql").read_text(encoding="utf-8"))
db.executescript((base / "seed-content.sql").read_text(encoding="utf-8"))

sections = db.execute("SELECT COUNT(*) FROM content_sections").fetchone()[0]
topics = db.execute("SELECT COUNT(*) FROM section_topics").fetchone()[0]
games = db.execute("SELECT COUNT(*) FROM mini_games").fetchone()[0]
assert sections == 13, f"expected 13 sections, got {sections}"
assert topics == 65, f"expected 65 topics, got {topics}"
assert games == 5, f"expected 5 mini-game entries, got {games}"
assert not db.execute("PRAGMA foreign_key_check").fetchall(), "foreign key violations found"

required = {
    "users", "sessions", "projects", "assets", "wallet_transactions",
    "payment_requests", "moderation_items", "audit_logs",
    "analytics_sessions", "analytics_events", "support_tickets",
    "support_messages", "content_sections", "section_topics", "mini_games",
}
actual = {row[0] for row in db.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
)}
missing = required - actual
assert not missing, f"missing tables: {sorted(missing)}"
print(f"SQLite schema OK: {len(required)} required tables, {sections} sections, {topics} topics, {games} mini-games.")
