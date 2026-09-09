# Security

## Authentication

Session is a signed cookie (`src/lib/auth/session.ts`): HMAC-SHA256 over a
base64url-encoded JSON payload, using the Web Crypto API so the same code
runs in both the Node.js runtime (API routes) and the Edge runtime
(middleware). The secret comes from `AUTH_SECRET` — the shipped `.env`
default (`dev-only-insecure-secret-change-me`) is exactly that, a dev-only
placeholder; `.env.example` calls out generating a real one. Passwords are
hashed with bcrypt (`bcryptjs`, cost factor 10) and never stored or logged
in plaintext.

Cookie is `httpOnly`, `sameSite: lax`, and `secure` in production, with an
8-hour expiry.

## Authorization (RBAC)

`src/lib/auth/rbac.ts` maps each of the four roles (OWNER, ACCOUNTANT,
ANALYST, ADMIN) to a fixed permission set (`view_dashboard`,
`categorize_transactions`, `approve_recommendations`, `run_scenarios`,
`view_audit`, `manage_organization`). Every mutating API route checks
`hasPermission` before acting (e.g. `/api/audit` refuses ANALYST,
`/api/approvals` refuses non-approvers) and every route checks for a valid
session first — there is no route that trusts a client-supplied role or
organization ID.

## Input validation

Every API route validates its body with `zod` before touching the
database. Reject-first: an unparseable transaction amount, a missing
field, or an invalid enum value returns a structured `400` with an
`error.code`/`error.message` pair (see `src/lib/api/respond.ts`) — nothing
partially writes.

## Injection

- **SQL/NoSQL injection**: not applicable in the direct sense — all
  database access goes through Prisma's parameterized query builder, no
  raw SQL string concatenation anywhere in the codebase.
- **Prompt injection**: see `docs/threat-model.md`.

## Secrets

`.env` is gitignored (`.env.example` is explicitly un-ignored so the
template is committed). No API key, password, or token appears in any
committed file — verified by grep before each commit in this session's
workflow. `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and
`GOOGLE_API_KEY` are the only secrets the app reads, all via
`process.env`.

## Rate limiting

**Not implemented.** This is a real gap for anything beyond a local demo —
noted explicitly rather than silently skipped. A production deployment
should add per-IP/per-session rate limiting in front of `/api/ai/analyze`
and `/api/transactions/import` at minimum, since both are more expensive
than a typical CRUD route.

## Headers / CORS

Next.js's default security headers apply; no custom CORS policy is
configured because this app has no cross-origin API consumers — everything
is same-origin (the app calling its own `/api/*` routes). Adding a public
API would need an explicit CORS allowlist, not implemented here.
