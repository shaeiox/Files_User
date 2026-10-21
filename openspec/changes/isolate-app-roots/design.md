# Design (portal side)

Shared decisions D1–D8 are in the admin repository's `openspec/changes/isolate-app-roots/design.md`.
This file records only how the portal implements them.

## P1. One snapshot builder, two sources

```
            ┌─ HttpPolicySource   (ADMIN_API_URL + ADMIN_SERVICE_TOKEN)  ← preferred
PolicySource┤                                                             → rows → buildSnapshot() → locate() → access-policy.decide()
            └─ SqlitePolicySource (ADMIN_DB_PATH, today's readSnapshot)  ← one release only
```

- **What changes in `lib/admin-db.js`.** It keeps the public API (`getSnapshot`, `findActiveUserByUsername`, `navFolders`,
  `releaseRelPath`, `position`, `tunable`, `validateStartup`, …) and gains a source chosen at startup.
  `buildSnapshot` stays pure. `HttpPolicySource` maps contract v1 fields to the same row shape it takes
  today. Callers therefore don't change, and the existing tests cover both sources through the
  same fixtures.
- **Fail closed.** The refresh timer, the `0.8 × ADMIN_SYNC_TTL_MS` schedule and the fail-closed rule are unchanged. A
  network error, a non-200/304 answer, an unknown `contract` greater than the newest known, or a
  volume mismatch all drop the snapshot, exactly like a SQLite error today.
- **`304`.** A `304` answer renews the timestamp of the current snapshot without rebuilding it.
- **Request limits.** HTTP calls use a timeout below the TTL, at most one request in flight, no redirects, and
  `https:` or loopback `http:` only.

## P2. Mode handshake (extends the existing table)

| `ADMIN_INTEGRATION_ENABLED` | `ADMIN_API_URL` | `ADMIN_DB_PATH` | Result |
|---|---|---|---|
| unset/false | unset | unset | legacy |
| true | set (+ token ≥ 32 characters) | unset | integration over HTTP |
| true | unset | set | integration over SQLite, with a deprecation warning |
| true | set | set | refused (ambiguous) |
| true | unset | unset | refused |
| unset/false | either set | — | refused (inconsistent, as today) |

Startup validation in HTTP mode fetches one snapshot. If the admin is unreachable, startup is refused
with the URL in the message, and the token is never shown.

## P3. Credential delegation

In HTTP mode, `users-admin.login` calls `credentials/verify` instead of `bcrypt.compare` on a
snapshot hash.
- **Lockout.** The portal's own lockout (`lib/auth/lockout.js`) still runs first, so a locked username never reaches the
  admin.
- **Sessions.** The `pwf` claim holds the `credentialStamp`, and `verify` compares it with the current snapshot,
  as today.
- **Client IP.** The client IP is forwarded as `X-Forwarded-For` only from the portal's trusted-proxy resolution.

## P4. Ops endpoints

Both new routes are added to `lib/routes/ops.js` with `gate: "service"`, a new gate that checks the
Bearer token in constant time. With the token unset they answer `404`.

- `GET /api/ops/log?limit=1..1000`: newest-first JSON lines from the current `LOG_FILE`. It reads the tail
  without loading the whole file. `LOG_FILE=off` returns `{available:false}`.
- `POST /api/ops/access-check {path, userId|null}`: builds a session-like caller and returns
  `{ outcome, policies[] }` from `decide()`. This is the shape the admin's `/admin/files/effective` already serves.

## P5. Overlap and state rules

These rules live in `lib/load-env.js`, next to `productionPathProblems`:
- `realpath` the code folder (`PROJECT_ROOT`), `PORTAL_DATA_DIR`, `FILES_ROOT`, `LOG_FILE`'s directory
  and `AUTH_USERS_FILE`'s directory.
- In production, refuse when any state path is inside the code folder, or when `FILES_ROOT` equals,
  contains, or is contained by the code folder or `PORTAL_DATA_DIR`. Outside production, warn.

Defense in depth: `isHidden()` is **not** extended to hide `data/`, because the overlap rule already
removes the cause.

## Risks

- **Admin outage blocks new portal sign-ins.** This is accepted (admin D6). Governed content already fails closed
  without a fresh snapshot.
- **The SQLite and HTTP sources could produce different snapshots.** Task 2.6 runs the whole existing
  admin-fixture suite against both sources, then compares the two `buildSnapshot` outputs for equality.
