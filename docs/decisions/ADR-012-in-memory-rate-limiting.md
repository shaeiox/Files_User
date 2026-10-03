# ADR-012: In-memory rate limiting and brute-force lockout

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

Two distinct abuse controls are needed, and they solve different problems:

1. **Request rate limiting** — bound request volume per client IP so a single client
   cannot monopolise the process or hammer the filesystem walk (ADR-002 makes listing and
   search O(tree), so these are the expensive endpoints).
2. **Brute-force lockout** — bound password guesses per username so the login endpoint
   (ADR-003, hand-rolled JWT) cannot be cracked by repetition.

The deployment topology is a **single Node.js process** behind nginx (ADR-007). There is
no second process, no shared cache, and no database (ADR-002). That single fact drives
this decision in both directions.

## Decision

Both controls are implemented as in-memory `Map`s with time-windowed entries, in
`lib/rate-limiter.js` (33 lines) and `lib/auth-service.js`.

### Rate limiting

| Property | Value |
|----------|-------|
| Key | `x-forwarded-for` header, else `socket.remoteAddress` |
| Window | 60 seconds |
| Max requests | 120 per window |
| Exceeded | `429` with `{ error: "Too many requests.", code: "RATE_LIMITED" }` |
| Cleanup | Expired entries swept every 60 seconds |

Note the client-IP key reads `x-forwarded-for` first. This is correct **because** the
topology places nginx in front and sets that header (ADR-007) — the header is
nginx-controlled, not client-controlled.

### Brute-force lockout

| Property | Value |
|----------|-------|
| Key | Lowercased username (per-username, not per-IP) |
| Threshold | `AUTH_MAX_FAILED_ATTEMPTS`, default `5` |
| Duration | `AUTH_LOCKOUT_MINUTES`, default `15` |
| Locked response | `429` with `{ error: "Auth failed", code: "LOCKED_OUT", retryAfterMs }` |
| Reset | On successful login, `clearFailedAttempts()` |

Lockout is keyed by username so it survives an attacker rotating source IPs — the
per-IP rate limiter cannot do that, which is why both controls are needed.

## Alternatives Considered

### nginx `limit_req` / `limit_conn`
- Pros: Done at the edge, before the request reaches Node; no application memory; battle-tested.
- Cons: Cannot express per-username lockout — nginx has no knowledge of usernames in a
  POST body. Needs a shared zone defined outside this repo, so it is not self-documenting
  here.
- Rejected as a *replacement*. Worth considering as an **additional** edge layer, which
  would make the in-memory limiter a second line of defence.

### Redis / Memcached
- Pros: Shared across processes; survives restart; high cardinality.
- Cons: Introduces a new service and a new failure mode. The lockout and rate-limit maps
  hold a handful of entries; Redis would be infrastructure for no gain.
- Rejected: Disproportionate. The single-process topology of ADR-007 is precisely what
  makes in-memory correct here.

### Token-bucket / leaky-bucket algorithm
- Pros: Smoother behaviour than fixed windows; no burst-at-boundary problem.
- Cons: More state per key than a counter; the boundary-burst weakness is not significant at
  120 req/min against a human-driven UI.
- Rejected: Not worth the added state for this limit.

### Database-backed lockout (persist attempts)
- Pros: Survives restart; inspectable; no per-process state.
- Cons: Adds writes on every failed login (ADR-002 rejected the DB); a persistent lockout
  record is also a small DoS vector — an attacker locks a legitimate user out permanently.
- Rejected: Writes on the failure path are the wrong trade, and persistent lockout records
  are a worse DoS than temporary in-memory ones.

### No rate limiting
- Pros: Zero code.
- Cons: Single client can saturate an O(tree) endpoint; login is guessable without a cap.
- Rejected: Both endpoints are cheap to attack and expensive to serve.

## Consequences

- **State is lost on restart, and is per-process.** Restarting the server clears all rate
  limits and lockouts. This is acceptable *only* because the topology is a single process —
  and it is the first thing that breaks if anyone adds a second Node process or a PM2
  cluster mode. **If you scale out horizontally, this ADR must be revisited before
  shipping**, or users will find limits that reset when traffic shifts between workers.
- **Restart is also a lockout bypass.** An attacker with the ability to restart the process
  resets their own failed-attempt count. Not a concern against external attackers; worth
  knowing if the process is ever attacker-influenced.
- **`x-forwarded-for` is trusted unconditionally.** Safe behind nginx as configured today.
  **It becomes a bypass if the server is ever exposed directly** — a client could then
  spoof a fresh IP per request and defeat the limiter entirely. If `PORT` is published
  without nginx in front, the rate limiter is decorative. Verify this is not the case in
  `docs/DEPLOYMENT.md` during any exposure change.
- **The sweep runs every 60 seconds**, so memory is bounded by request volume within one
  window. For a portal this is negligible; under flood it is a small allocation.
- **Lockout keyed by username is a deliberate DoS trade:** repeated failures against a known
  username lock that user out for 15 minutes without needing valid credentials. Accepted
  because the alternative (per-IP-only) fails against IP rotation. If this portal is
  internet-facing with known usernames, consider a per-IP *and* per-username combined
  threshold.
- There is **no account lockout notification and no admin unlock path** — recovery is
  waiting out the window or restarting the process.
- Neither control covers the SPA/static path in production, because nginx serves those
  without reaching Node (ADR-007). This is a benefit, not a gap.