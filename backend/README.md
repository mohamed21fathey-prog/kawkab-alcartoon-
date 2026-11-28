# Kawkab Al Cartoon backend foundation

This folder is the **design and database foundation**, not a deployed backend.

## Current status
- The public site is still a static frontend. Existing local drafts remain browser-local.
- `schema.sql` defines the initial SQLite schema intended to be compatible with Cloudflare D1.
- `content-catalog.json` contains 12 Arabic sections with five draft topic ideas each, plus a five-game roadmap. Draft entries are not published automatically.
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
Authentication endpoints, email delivery, admin UI/API, object storage, payment evidence upload, wallet operations, moderation scanners, analytics collection, customer-support bot, video generation, rendering, and background jobs. The catalogue is editorial planning data only; detailed lessons, stories, worksheets, and the two planned games still need implementation.

## Deployment gate
Do not deploy or connect a live D1 database until the owner approves the provider, checks the account's free-tier terms/quotas, and supplies the required account-side setup. Do not add paid services or secrets without explicit approval.
