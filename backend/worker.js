/**
 * Kawkab Al Cartoon API — Cloudflare Workers + D1 foundation.
 * No external AI provider, paid API, or KIE.ai integration.
 */
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 310000;
const MAX_BODY_BYTES = 16 * 1024;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200, extra = {}) {
  const headers = new Headers(JSON_HEADERS);
  for (const [key, value] of Object.entries(extra)) {
    if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) value.forEach((item) => headers.append("set-cookie", item));
    else headers.set(key, value);
  }
  return new Response(JSON.stringify(data), { status, headers });
}
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const i = part.indexOf("="); return i < 0 ? [part, ""] : [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
  }));
}
function cookie(name, value, maxAge, httpOnly = true) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Strict${httpOnly ? "; HttpOnly" : ""}`;
}
function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || origin === env.ALLOWED_ORIGIN;
}
function checkOrigin(request, env) {
  return request.headers.get("Origin") === env.ALLOWED_ORIGIN;
}
async function bodyJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  return JSON.parse(text);
}
function validText(value, min, max) {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}
async function rateLimit(db, key, limit = 8, windowSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(`INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_started_at <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      window_started_at = CASE WHEN auth_rate_limits.window_started_at <= ? THEN excluded.window_started_at ELSE auth_rate_limits.window_started_at END
    RETURNING attempts, window_started_at`)
    .bind(key, now, now - windowSeconds, now - windowSeconds).first();
  return Boolean(row && row.attempts <= limit);
}
async function verifyPassword(password, stored) {
  if (!validText(password, 8, 200) || typeof stored !== "string") return false;
  const [scheme, iterationsRaw, saltRaw, hashRaw] = stored.split("$");
  const iterations = Number(iterationsRaw);
  if (scheme !== "pbkdf2_sha256" || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000 || !saltRaw || !hashRaw) return false;
  try {
    const decode = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: decode(saltRaw), iterations }, key, 256);
    const actual = new Uint8Array(bits), expected = decode(hashRaw);
    if (actual.length !== expected.length) return false;
    let diff = 0; for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch { return false; }
}
async function currentUser(request, env) {
  const token = parseCookies(request.headers.get("Cookie")).kawkab_session;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`SELECT u.id, u.email, u.username, u.role, u.status
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
      AND u.status = 'active'`).bind(tokenHash, new Date().toISOString()).first();
  return row || null;
}
function csrfValid(request) {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const header = request.headers.get("X-CSRF-Token");
  return Boolean(cookies.kawkab_csrf && header && cookies.kawkab_csrf === header);
}
async function requireAuth(request, env) {
  const user = await currentUser(request, env);
  return user;
}
async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method;
  if (!originAllowed(request, env)) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": env.ALLOWED_ORIGIN, "access-control-allow-credentials": "true", "access-control-allow-methods": "GET,POST,DELETE,OPTIONS", "access-control-allow-headers": "Content-Type,X-CSRF-Token", "vary": "Origin" } });

  if (path === "/api/v1/health" && method === "GET") {
    try { await env.DB.prepare("SELECT 1 AS ok").first(); return json({ ok: true, service: "kawkab-api", database: "connected" }); }
    catch { return json({ ok: false, service: "kawkab-api", database: "unavailable" }, 503); }
  }

  if (path === "/api/v1/auth/register" && method === "POST") {
    return json({ error: "REGISTRATION_NOT_READY", message: "التسجيل سيُفتح بعد إعداد بريد التحقق واختبار حماية الحسابات." }, 503);
  }

  if (path === "/api/v1/auth/login" && method === "POST") {
    let body;
    try { body = await bodyJson(request); } catch { return json({ error: "INVALID_BODY" }, 400); }
    if (!checkOrigin(request, env)) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403);
    if (!validText(body.email, 3, 254) || !validText(body.password, 8, 200)) return json({ error: "INVALID_CREDENTIALS" }, 400);
    const key = await sha256((body.email.trim().toLowerCase() + "|" + (request.headers.get("CF-Connecting-IP") || "unknown")));
    if (!(await rateLimit(env.DB, key))) return json({ error: "TOO_MANY_ATTEMPTS" }, 429);
    const user = await env.DB.prepare("SELECT id,email,username,role,status,password_hash FROM users WHERE email = ? COLLATE NOCASE").bind(body.email.trim()).first();
    if (!user || user.status !== "active" || !(await verifyPassword(body.password, user.password_hash))) return json({ error: "INVALID_CREDENTIALS" }, 401);
    const token = randomToken();
    const csrf = randomToken(24);
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)")
      .bind(crypto.randomUUID(), user.id, await sha256(token), expires).run();
    await env.DB.prepare("UPDATE users SET last_login_at=?, updated_at=? WHERE id=?").bind(new Date().toISOString(), new Date().toISOString(), user.id).run();
    return json({ user: { id: user.id, email: user.email, username: user.username, role: user.role }, csrfToken: csrf }, 200, {
      "set-cookie": [cookie("kawkab_session", token, SESSION_DAYS * 86400, true), cookie("kawkab_csrf", csrf, SESSION_DAYS * 86400, false)],
      "access-control-allow-origin": env.ALLOWED_ORIGIN, "access-control-allow-credentials": "true", "vary": "Origin"
    });
  }

  if (path === "/api/v1/auth/session" && method === "GET") {
    const user = await requireAuth(request, env);
    return user ? json({ authenticated: true, user: { id: user.id, email: user.email, username: user.username, role: user.role } })
      : json({ authenticated: false }, 401);
  }

  if (path === "/api/v1/auth/logout" && method === "POST") {
    if (!checkOrigin(request, env) || !csrfValid(request)) return json({ error: "CSRF_ORIGIN_CHECK_FAILED" }, 403);
    const token = parseCookies(request.headers.get("Cookie")).kawkab_session;
    if (token) await env.DB.prepare("UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").bind(new Date().toISOString(), await sha256(token)).run();
    return json({ ok: true }, 200, { "set-cookie": [cookie("kawkab_session", "", 0), cookie("kawkab_csrf", "", 0, false)] });
  }

  if (path === "/api/v1/projects" && (method === "GET" || method === "POST")) {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "UNAUTHENTICATED" }, 401);
    if (method === "GET") {
      const rows = await env.DB.prepare("SELECT id,title,project_type,idea,status,storyboard_json,created_at,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC LIMIT 50").bind(user.id).all();
      return json({ projects: rows.results || [] });
    }
    if (!checkOrigin(request, env) || !csrfValid(request)) return json({ error: "CSRF_ORIGIN_CHECK_FAILED" }, 403);
    let body; try { body = await bodyJson(request); } catch { return json({ error: "INVALID_BODY" }, 400); }
    if (!validText(body.title, 1, 120) || !validText(body.projectType, 1, 60) || !validText(body.idea, 1, 10000)) return json({ error: "INVALID_PROJECT" }, 400);
    const id = crypto.randomUUID();
    const storyboard = body.storyboard == null ? null : JSON.stringify(body.storyboard);
    if (storyboard && storyboard.length > 100000) return json({ error: "STORYBOARD_TOO_LARGE" }, 413);
    await env.DB.prepare("INSERT INTO projects (id,user_id,title,project_type,idea,storyboard_json) VALUES (?,?,?,?,?,?)")
      .bind(id, user.id, body.title.trim(), body.projectType, body.idea.trim(), storyboard).run();
    return json({ project: { id, title: body.title.trim(), projectType: body.projectType, status: "draft" } }, 201);
  }

  const projectMatch = path.match(/^\/api\/v1\/projects\/([0-9a-f-]{36})$/i);
  if (projectMatch && method === "DELETE") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "UNAUTHENTICATED" }, 401);
    if (!checkOrigin(request, env) || !csrfValid(request)) return json({ error: "CSRF_ORIGIN_CHECK_FAILED" }, 403);
    const result = await env.DB.prepare("DELETE FROM projects WHERE id=? AND user_id=?").bind(projectMatch[1], user.id).run();
    return json({ deleted: Boolean(result.meta?.changes) });
  }

  if (path === "/api/v1/admin/me" && method === "GET") {
    const user = await requireAuth(request, env);
    if (!user || user.role !== "admin") return json({ error: "FORBIDDEN" }, 403);
    return json({ admin: { id: user.id, email: user.email, username: user.username } });
  }
  return json({ error: "NOT_FOUND" }, 404);
}
export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (error) {
      console.error("API request failed", error?.message || "unknown");
      return json({ error: "INTERNAL_ERROR" }, 500);
    }
  }
};
