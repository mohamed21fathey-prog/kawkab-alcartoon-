-- Kawkab Al Cartoon: initial SQLite / Cloudflare D1 schema
-- No passwords in plaintext. Store only strong password hashes and hashed session tokens.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','moderator')),
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','active','suspended','deleted')),
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  project_type TEXT NOT NULL,
  idea TEXT NOT NULL CHECK (length(idea) <= 10000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','in_review','approved','rejected','processing','completed','failed','archived')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public')),
  storyboard_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  sha256 TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','quarantined')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup','generation','refund','admin_adjustment')),
  amount_credits INTEGER NOT NULL CHECK (amount_credits > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  idempotency_key TEXT NOT NULL UNIQUE,
  reference_id TEXT,
  note TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_wallet_user_status ON wallet_transactions(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('vodafone_cash','instapay')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  sender_reference TEXT,
  proof_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_information')),
  admin_note TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  wallet_transaction_id TEXT UNIQUE REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_payment_review_queue ON payment_requests(status, created_at);

CREATE TABLE IF NOT EXISTS moderation_items (
  id TEXT PRIMARY KEY,
  submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,
  content_kind TEXT NOT NULL CHECK (content_kind IN ('idea','script','prompt','image','video','audio','comment','profile')),
  content_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','quarantined','appealed')),
  risk_level TEXT NOT NULL DEFAULT 'unassessed' CHECK (risk_level IN ('unassessed','low','medium','high','critical')),
  reason_code TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (project_id IS NOT NULL OR asset_id IS NOT NULL OR content_text IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_moderation_queue ON moderation_items(status, risk_level, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success','denied','failure')),
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_actor_date ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);

-- Privacy-preserving analytics: do not store raw IP addresses or email addresses here.
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id TEXT PRIMARY KEY,
  visitor_key TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  ended_at TEXT,
  consent_state TEXT NOT NULL DEFAULT 'essential_only' CHECK (consent_state IN ('essential_only','analytics_allowed'))
);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_start ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  page_path TEXT,
  event_data_json TEXT,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name, occurred_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 160),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  sender_kind TEXT NOT NULL CHECK (sender_kind IN ('customer','admin','assistant')),
  message_text TEXT NOT NULL CHECK (length(message_text) BETWEEN 1 AND 10000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);

CREATE TABLE IF NOT EXISTS content_sections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS section_topics (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES content_sections(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  summary_ar TEXT NOT NULL DEFAULT '',
  content_json TEXT,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(section_id, sort_order)
);
CREATE INDEX IF NOT EXISTS idx_topics_section ON section_topics(section_id, is_published, sort_order);

CREATE TABLE IF NOT EXISTS mini_games (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  game_kind TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  min_age INTEGER,
  max_age INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (min_age IS NULL OR min_age >= 3),
  CHECK (max_age IS NULL OR max_age >= min_age)
);

-- Financial records are append-only except for one pending-to-final review.
CREATE TRIGGER IF NOT EXISTS wallet_transactions_review_once
BEFORE UPDATE ON wallet_transactions
WHEN OLD.status <> 'pending'
 OR NEW.status NOT IN ('approved','rejected','cancelled')
 OR NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id
 OR NEW.direction <> OLD.direction OR NEW.transaction_type <> OLD.transaction_type
 OR NEW.amount_credits <> OLD.amount_credits
 OR NEW.idempotency_key <> OLD.idempotency_key
 OR COALESCE(NEW.reference_id,'') <> COALESCE(OLD.reference_id,'')
 OR NEW.created_at <> OLD.created_at
BEGIN
 SELECT RAISE(ABORT, 'wallet transaction is immutable after creation/review');
END;
CREATE TRIGGER IF NOT EXISTS wallet_transactions_no_delete
BEFORE DELETE ON wallet_transactions
BEGIN
 SELECT RAISE(ABORT, 'wallet transactions are append-only');
END;
CREATE TRIGGER IF NOT EXISTS payment_request_approval_guard
BEFORE UPDATE OF status ON payment_requests
WHEN NEW.status = 'approved' AND (
 NEW.wallet_transaction_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM wallet_transactions wt
  WHERE wt.id = NEW.wallet_transaction_id
   AND wt.user_id = NEW.user_id
   AND wt.direction = 'credit'
   AND wt.transaction_type = 'topup'
   AND wt.status = 'approved'
 )
)
BEGIN
 SELECT RAISE(ABORT, 'approved payment requires a matching approved top-up');
END;

-- Payment reviews have a controlled state machine and become immutable when final.
CREATE TRIGGER IF NOT EXISTS payment_requests_transition_guard
BEFORE UPDATE ON payment_requests
WHEN
 OLD.status IN ('approved','rejected')
 OR NEW.id <> OLD.id
 OR NEW.user_id <> OLD.user_id
 OR NEW.provider <> OLD.provider
 OR NEW.amount_minor <> OLD.amount_minor
 OR NEW.currency <> OLD.currency
 OR NEW.created_at <> OLD.created_at
 OR (OLD.wallet_transaction_id IS NOT NULL
     AND COALESCE(NEW.wallet_transaction_id,'') <> OLD.wallet_transaction_id)
 OR NOT (
   (OLD.status = 'pending' AND NEW.status IN ('pending','approved','rejected','needs_information'))
   OR (OLD.status = 'needs_information' AND NEW.status IN ('needs_information','pending','approved','rejected'))
 )
BEGIN
 SELECT RAISE(ABORT, 'invalid or immutable payment request transition');
END;


-- Authentication throttling: hashed identifiers only; never store raw email or IP.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits(window_started_at);
