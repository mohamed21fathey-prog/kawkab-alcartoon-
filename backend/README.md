# Kawkab Al Cartoon backend foundation

This folder is the **design and database foundation**, not a deployed backend.

## Current status
- The public site is still a static frontend. Existing local drafts remain browser-local.
- `schema.sql` defines the initial SQLite schema intended to be compatible with Cloudflare D1.
- `content-catalog.json` contains 13 Arabic sections with five draft topic ideas each, plus five browser mini-games. The games are local prototypes; catalogue content remains draft-only.
- No database, authentication provider, file bucket, payment gateway, video-generation provider, or background agent has been connected.
- No API keys, paid services, or KIE.ai integration are included.

## Planned free-first architecture
1. Cloudflare Pages for static hosting, only after confirming the account's plan is suitable for the intended commercial use.
2. Cloudflare Workers / Pages Functions for server-side endpoints.
3. Cloudflare D1 for relational data, subject to free-plan quotas.
4. File storage only after checking the free quota and access-control model; private customer uploads must never be public by default.
5. A trusted authentication implementation with email verification, secure password hashing, rate limits, session rotation, CSRF protection where applicable, and server-side role checks.
6. Manual payment review for Vodafone Cash / InstaPay. A screenshot is evidence for human review, not automatic proof of payment.
7. Moderation queue for text and media. Automated checks are not a 100% guarantee; high-risk items must be held for review.
8. Analytics based on real sessions/events with minimal data collection and a consent choice.

## Data rules
- Never store plaintext passwords or raw session tokens.
- Never trust a role, wallet balance, payment approval, or moderation result supplied by the browser.
- Credit balances must be derived from approved ledger entries; all balance changes must be server-side and audited.
- Keep uploaded assets private until approved and explicitly published.
- Do not store raw IP addresses in analytics tables.
- Do not collect children's personal data for browser mini-games.
- Admin actions must be authorized on the server and written to `audit_logs`.

## Not implemented yet
Authentication endpoints, email delivery, admin UI/API, object storage, payment evidence upload, wallet operations, moderation scanners, analytics collection, customer-support bot, video generation, rendering, and background jobs. The catalogue is editorial planning data only; detailed lessons, stories, and worksheets still need full editorial content and review. The five browser games are prototypes and need cross-device play testing before publication.

## Database consistency and financial safeguards
- `backend/schema.sql` is the canonical schema; `migrations/0001_initial.sql` is kept byte-for-byte identical and checked in CI. This initial migration was aligned before any live database was connected; do not apply it to an existing database without a reviewed migration plan.
- Wallet transactions cannot be deleted or have their amount, owner, direction, type, or idempotency key rewritten. A pending transaction may only move once to an approved/rejected/cancelled state.
- A payment request cannot be marked approved unless it references an already-approved credit top-up for the same user. The application must perform the top-up and payment review in one database transaction and write an audit record.

## Deployment gate
Do not deploy or connect a live D1 database until the owner approves the provider, checks the account's free-tier terms/quotas, and supplies the required account-side setup. Do not add paid services or secrets without explicit approval.
