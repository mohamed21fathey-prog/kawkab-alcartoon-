# Kawkab Al Cartoon backend foundation

This is source code for a proposed Cloudflare Workers + D1 backend. It is **not deployed** and is not connected to a live database.

## Implemented in this branch
- `backend/worker.js`: API health check, login, session inspection/logout, private project listing/creation/deletion, and admin identity check.
- PBKDF2-SHA-256 password verification; random session tokens are stored only as SHA-256 hashes.
- Secure, HttpOnly, SameSite=Strict session cookies; CSRF token and exact-origin checks for state-changing requests.
- Login throttling backed by hashed account/IP identifiers in D1.
- Project queries are always scoped to the authenticated user.
- Public registration is intentionally disabled (503) until email verification and abuse controls are implemented.
- `backend/hash_password.py` creates a password hash for a manually provisioned first administrator. It never sends the password anywhere.
- `wrangler.toml` is a template with a deliberately invalid D1 database ID placeholder.

## Not implemented / not live
- No Cloudflare account access, D1 database, Worker deployment, secrets, or R2 bucket has been created.
- No admin account exists until the owner provisions one securely.
- No email/SMS delivery, public signup, password reset, payments, wallet crediting, uploads, video generation, TTS, or admin dashboard UI.
- No paid APIs or KIE.ai integration.

## Before deployment
1. Confirm the current Cloudflare Workers and D1 free-plan quotas and commercial-use terms in the owner's account.
2. Create a new D1 database named `kawkab-alcartoon-db` in Cloudflare.
3. Put the real database ID in `wrangler.toml`; never commit API tokens or passwords.
4. Set `ALLOWED_ORIGIN` to the exact production site origin.
5. Apply the canonical schema to the new empty database only. `migrations/0001_initial.sql` must remain byte-for-byte identical to `backend/schema.sql`.
6. Provision the first admin manually using a securely generated password hash. Do not create an admin through a public endpoint.
7. Deploy a preview Worker first; test health, auth, CSRF, account isolation, expiry, throttling, and error handling.
8. Only after passing tests, connect the frontend and enable customer-facing features.

Example commands, to be run by the owner only after reviewing the account plan and database ID:

```sh
npx wrangler d1 execute kawkab-alcartoon-db --remote --file=backend/schema.sql
npx wrangler deploy
```

Do not run these commands against an existing database without a reviewed migration plan. Do not put Cloudflare API tokens in GitHub files or chat.

## Password hash generation
Run locally in a trusted terminal:

```sh
python backend/hash_password.py
```

The script prompts for a password and prints a PBKDF2-SHA-256 hash in the format expected by the Worker. Keep the output private and use it only in a manual D1 admin provisioning step. Never commit the hash to the repository.

## Free-first limits
The API uses D1 for persistence. Free-tier quotas, commercial-use terms, and request limits can change and must be confirmed in the Cloudflare account before deployment. This source code alone does not create a live service or guarantee free operation at every traffic level.
