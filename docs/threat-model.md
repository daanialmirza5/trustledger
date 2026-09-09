# Threat Model

Scope: a single-organization financial demo app using synthetic data, no
real money movement. This is not a threat model for a multi-tenant SaaS
product — see the "not in scope" section for what that would add.

## Assets

- Session cookies (grant access to one organization's financial data).
- Transaction/invoice/expense data (synthetic in the shipped seed, but the
  import pipeline accepts arbitrary user-supplied data).
- AI provider API keys, if configured.

## Threat: prompt injection via transaction data

**Vector**: a transaction `description` field (or an imported CSV row) is
attacker-controlled text that flows into the AI orchestrator's evidence
block, which is sent to a real LLM provider if one is configured.

**Mitigation**: the orchestrator's system prompt
(`src/lib/ai/orchestrator.ts`) explicitly instructs the model to treat
everything inside the `EVIDENCE` block as data, never as instructions, and
to use only numbers present in that block. `AIInsight` rows always carry
`groundedFacts` (the exact structured evidence used) alongside the
narration, so a discrepancy between the two is inspectable.

**Residual risk**: this is a prompt-level mitigation, not a structural one
— it has not been tested against an adversarial injection corpus (see
`docs/evaluation.md`), and a sufficiently crafted description could in
principle still influence a real LLM's phrasing. The mock provider is
immune by construction (it doesn't interpret its input at all). If this app
handled real customer data, output should additionally be validated against
a strict schema before display, and provider responses should never be
allowed to write back into `category`, `cashFlowClass`, or any other
ledger field directly (they currently don't — insights and ledger writes
are fully separate code paths).

## Threat: session forgery

**Vector**: forging or tampering with the session cookie to impersonate
another user/organization/role.

**Mitigation**: the cookie is HMAC-signed server-side (`AUTH_SECRET`); any
tampering invalidates the signature and `decodeSession` returns `null`.

**Residual risk**: `AUTH_SECRET` is a single shared static secret with no
rotation mechanism — acceptable for this demo, not for production without
a real secret-rotation story.

## Threat: over-broad role escalation via a mutating route

**Vector**: a lower-privileged role (e.g. ANALYST) calling a mutating route
directly (bypassing UI affordances) to approve a recommendation or view the
audit trail.

**Mitigation**: every mutating route re-checks `hasPermission` server-side
(see `docs/security.md`) — UI hiding a button is not the enforcement point.

## Not in scope for this prototype

- Multi-tenant data isolation beyond `organizationId` scoping (no
  row-level security, no per-tenant encryption keys).
- Real payment/banking integration attack surface (there is none — no real
  money movement, per the product's fintech safety boundary).
- Denial-of-service / rate-limit exhaustion (see `docs/security.md`'s
  rate-limiting gap).
- Supply-chain integrity of npm dependencies beyond `npm audit`.
