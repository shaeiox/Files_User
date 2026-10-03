# ADR-003: Hand-rolled HS256 JWT instead of a library

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

Sessions are stateless: login mints a token, the browser returns it as an HttpOnly cookie,
and each request verifies it without a session store.

The obvious choice is `jsonwebtoken` (or `jose`). Against that, several properties of this
service:

- The JWT surface actually used is narrow: sign, verify, and reject algorithm confusion.
  `exp`, `iat`, and `jti` are the only claims that matter.
- A session token is not a trust boundary between third parties. It never leaves this
  server's own cookie jar. The relevant threat is "can someone forge one", which is
  entirely about key handling and algorithm enforcement — both fully visible in ~60 lines.
- Per ADR-001, dependency count is kept deliberately low.

The decision is defensible **only because** the implementation is small enough to audit in
one sitting. Hand-rolled crypto fails when it is sprawling and unreviewable; it is
defensible when it is three narrow functions.

## Decision

Implement signing and verification directly against `node:crypto` in
`lib/auth-service.js`:

- `signJwt()` — `base64url(header).base64url(payload).base64url(HMAC-SHA256)`
- `verifyJwt()` — split, verify signature, validate claims
- `getJwtSecret()` — reads `AUTH_JWT_SECRET`, enforces a **32-character minimum**

Enforced properties:

| Property | Enforcement |
|----------|-------------|
| Algorithm | Header `alg` must equal `HS256`. Any other value is rejected before verification. |
| Signature | Compared in constant time. |
| Expiry | `exp` (seconds since epoch) must be in the future. |
| Issued-at | `iat` recorded and checked. |
| Token ID | `jti` — 16 random bytes, hex. |
| Secret length | `AUTH_JWT_SECRET` < 32 chars throws at read time. |

Password hashing is **not** hand-rolled: `hashPassword()` uses bcrypt at cost 12, with
`crypto.scrypt()` only as a fallback if bcrypt is unavailable. `verifyPassword()`
auto-detects by hash prefix (`$2` → bcrypt, `scrypt$` → scrypt), which is what makes the
fallback safe to keep.

## Alternatives Considered

### `jsonwebtoken`
- Pros: Battle-tested; handles algorithm-confusion defence correctly by default; widely
  audited.
- Cons: A dependency for roughly what ADR-001 already decided to accept, on a surface we
  already fully own.
- Rejected: Marginal benefit over ~60 auditable lines.

### `jose`
- Pros: Modern, spec-complete, supports JWKS and asymmetric keys.
- Cons: Larger surface than HS256 alone requires; most of that surface (rotation, JWKS,
  `kid`) is unused for a single-server symmetric-secret portal.
- Rejected: Capability we do not need.

### Server-side session store
- Pros: Tokens are opaque, so nothing about the user is readable or forgeable-in-principle;
  instant revocation.
- Cons: Requires shared state — a store, or an in-process Map that breaks the moment a
  second process exists. Contradicts ADR-002's "no new service" stance.
- Rejected: Statelessness was worth more than instant revocation for a read-mostly portal.

## Consequences

- **A JWT library CVE does not apply.** The blast radius of a hand-rolled implementation
  is bounded by how much code it is — so the amount of code is itself the control. If
  `signJwt`/`verifyJwt` ever grow beyond a narrow sign/verify/reject-confusion shape, this
  decision should be revisited: complexity, not insecurity, is the trigger.
- Revocation is **not possible** short of rotating `AUTH_JWT_SECRET`, which invalidates
  every session at once. Accepted for an internal release portal; would not be acceptable
  for a system needing per-user revocation.
- Rotation is all-or-nothing. A per-token `kid` + key ring would fix this and is the
  natural first upgrade.
- We own the correctness of algorithm-confusion defence. This is the part to re-check in
  any security review — `verifyJwt()` must reject on `alg` **before** it verifies, and the
  comparison must be constant-time. Both hold today; both are single-line regressions if
  broken.
- **Operational note:** `AUTH_JWT_SECRET` is currently exposed in git history. See the
  "Known security debt" section of `docs/SECURITY.md`. This ADR is why that finding
  matters: the secret is the *entire* trust anchor, and there is no second factor behind
  it.