# ADR-013: Portal-owned SQLite file for shared security state

## Status
Accepted. Supersedes [ADR-012](ADR-012-in-memory-rate-limiting.md).

## Date
2026-10-16

## Context

ADR-012 kept rate-limit counters, login lockouts and (later) logout revocations in process
memory. That held only while the portal ran as one process, and it had two holes:

- **A restart reset everything.** Lockouts lifted, and a logged-out cookie worked again
  until it expired.
- **More than one process could not share state.** Each instance had its own limits and
  lockouts, and a logout on one instance did not end the session on another.

The portal already depends on `node:sqlite` (read-only, for `admin.sqlite`). The admin database
must stay read-only, so the portal cannot write its state there.

## Decision

Keep the three kinds of state in `<PORTAL_DATA_DIR>/portal-state.sqlite`, a file the portal owns
(`lib/state-store.js`), with WAL mode and a 2 s busy timeout:

| Table | Holds | Expires |
|---|---|---|
| `revoked_sessions` | session id → time every token of it has expired | purged after `until` |
| `failed_logins` | lower-cased username → attempts, locked-until, last-seen | lock end, or `AUTH_FAILED_IDLE_MS` idle |
| `rate_buckets` | client address + aligned window → count | two windows later |

- **Failure handling.** Sessions and sign-in fail closed: an unreadable revocation list
  rejects the session, and a sign-in or sign-out that cannot be recorded answers
  `503 SERVER_ERROR`. Rate limiting falls back to per-process counting with a warning, so a
  full disk does not take down anonymous downloads.
- **Rate-limit cost.** Each process counts locally and flushes every 1 s or 20 requests,
  reading back the merged total. The shared limit can be overshot by at most 20 requests per
  process per window.
- **No secrets.** The file holds no password, hash, token or signing secret.
- **Tests.** Under `node --test` the store is in memory, per test process.

## Consequences

- Several processes on one host, or on hosts sharing `PORTAL_DATA_DIR` with working file
  locks, behave as one. Restarts no longer reset lockouts or revocations.
- A network filesystem with poor locking (some NFS setups) is **unsupported** for multi-host
  use. The single-host topology is the supported one.
- **Upgrade path:** move the same three operations to Redis (or similar) when the portal runs
  on several hosts without a shared filesystem, or when the request rate makes SQLite writes a
  bottleneck. The module's interface (`revokeSession`, `isSessionRevoked`, `recordFailedLogin`,
  `clearFailedLogin`, `getFailedLogin`, `addRequests`) is the seam.
- The per-username lockout trade-off from ADR-012 is unchanged: lockout DoS against a known
  username remains possible by design.
