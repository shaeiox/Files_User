# Design

## Context

See proposal.md (Why). Current state that shapes the approach:

- `lib/api-router.js` is one `handleRequest()` function. It holds every route plus the
  request-scoped helpers that make access decisions: `gate`, `worstOf`, `answerPolicy`,
  `releaseGateLegacy`, `decideFor`, `policySession`, `renewPolicySession`. Those helpers are
  the security-critical part, and they are closures over `req`, `res`, `cookieSession` and
  `basicSession`.
- Three in-memory maps hold state: `revokedSessions` and `failedAttempts`
  (`lib/auth-service.js`) and `ipRequestCounts` (`lib/rate-limiter.js`). Their `ponytail:`
  comments already name a shared store as the upgrade path.
- `process.env` is read in 9 `lib/` modules, often at `require` time, with `Number(x) || default`,
  so a malformed value silently falls back. `server.js` already gathers startup problems
  (`productionPathProblems`, `adminDb.validateStartup`) and exits. That gate is extended, not
  replaced.
- `node:sqlite` (`DatabaseSync`) is already used, read-only, for `admin.sqlite`. The admin
  snapshot is read synchronously on the request path, at most once per `ADMIN_SYNC_TTL_MS`.
- `listCategories()` calls `summarizeTree()` (a recursive walk with a `stat` per file) for every
  category on every request. `searchEntries()` runs a breadth-first walk per query.
- ADR-001 (no web framework), ADR-006 (no frontend build) and ADR-012 (in-memory rate limiting)
  are in force. This change supersedes ADR-012 and keeps the other two.
- Other in-progress changes touch `api-router.js` and `auth-service.js`
  (`decouple-storage-and-release-paths`, `fix-auth-flows-and-cli-login`,
  `redesign-releases-page`).

## Goals / Non-Goals

**Goals:**
- Several portal processes on one host, or on hosts sharing `PORTAL_DATA_DIR`, behave as one
  for revocation, lockout and rate limiting.
- Operators can probe, trace and measure the portal with standard tools.
- Routing becomes a table where every route's access gate is visible in one place and can be
  tested.
- Keep every existing HTTP contract and every access-policy outcome byte-for-byte.

**Non-Goals:**
- No web framework, no TypeScript build step, and no frontend changes.
- No Redis or other network store in this change (see D2).
- No change to the access-policy rules (`lib/access-policy.js` `decide()`), the JWT format, or
  the admin integration.
- No rewriting of git history. That is an operator decision, listed in tasks as a manual step.

## Decisions

### D1. Route table with explicit gates, not a framework
Each route is registered as `{ method, match, gate, handler }` in `lib/routes/*.js`. The
request-scoped helpers move into a `createRequestContext(req, res, projectRoot)` that builds
`cookieSession`, `basicSession`, `decideFor`, `gate`, `answerPolicy` and `releaseGateLegacy`
exactly as today. Handlers get the context, and the dispatcher picks the first match in
registration order, which is today's `if` order.
- **Why:** it keeps ADR-001, and the diff is mostly moving code. Order-preserving dispatch keeps
  prefix routes such as `/api/download` vs `/api/download-zip` correct.
- **Alternative:** Express or Fastify. Rejected: it adds dependencies and changes header, error
  and body behaviour that the 212 tests pin down.
- **Guard:** a test lists every registered route and asserts that each content route declares a
  gate. A new route without one fails CI.

### D2. Security state in a portal-owned SQLite file
`<PORTAL_DATA_DIR>/portal-state.sqlite` is opened read-write with WAL mode and
`busy_timeout`. It has three tables: `revoked_sessions(sid, until)`,
`failed_logins(username_key, attempts, locked_until, last_seen)` and
`rate_buckets(client, window_start, count)`. Writes are single upserts. A purge runs every 5
minutes.
- **Why:** there are no new runtime dependencies, it survives restarts, and it is shared by
  every process on the host. A shared mount covers multiple hosts at low write rates.
- **Alternative:** Redis. Better for many hosts and high request rates, but it is a new
  service and dependency that a small deployment would have to run. Revisit when the portal
  runs on more than one host without a shared filesystem.
- **Alternative:** keep the maps and use sticky sessions. Rejected: restarts still reset
  lockouts and revocations.
- **Rate-limit cost:** a write per request. To bound it, each process counts in memory and
  flushes its increments to the store every 1 s or every 20 requests, whichever comes first,
  and reads the merged count on flush. The spec's cross-process limit is enforced within that
  flush tolerance.

### D3. Fail closed, except rate limiting
If the store cannot be read, session verification returns `{ ok:false }`, and if it cannot be
written, login returns `SERVER_ERROR`. This matches how a bad admin snapshot is handled today.
Rate limiting falls back to the in-memory map so that a full disk does not take down anonymous
downloads.

### D4. One settings module, validated once
`lib/settings.js` declares every variable as `{ type, default, min, max, secret }`.
`problems()` checks them all at once (plus the signing secret and the production path rules),
and `server.js` adds the result to its existing gate. Modules call `settings.get(name)`, which
parses the live environment on each call and falls back to the default on an unparseable value.
Admin tunables still override at runtime through `adminDb.tunable()`.
- **Why parse on each call, not a frozen object:** the test suite and the admin integration
  change the environment at runtime. A live read keeps every existing test unchanged. Startup
  refuses bad values, so in production `get()` never meets one.
- **Runtime clamps kept:** `ADMIN_SYNC_TTL_MS` keeps its runtime clamp as a second layer of
  defense; startup refuses out-of-range values.

### D5. Content index: cache raw directory reads, screen per request
The index caches unfiltered directory listings (`name`, `type`, `size`, `mtimeMs`), keyed by
absolute directory and expiring after `CONTENT_INDEX_TTL_MS`. The `summarizeTree` and
`searchEntries` walks keep their structure and their per-entry `screen()` and `allow` calls,
but read directories through the index.
- **Why:** caching filtered results would need one cache per caller and would delay policy
  changes. Caching raw reads keeps every access decision exactly where it is today.
- **Bound:** at most `CONTENT_INDEX_MAX_DIRS` directories (default 20000), evicting the least
  recently used. Concurrent misses for one directory share a single read.
- **Not used by** download, hash or archive, which keep resolving on disk (spec requirement).

### D6. Observability without dependencies
- The request ID is created in the dispatcher, set as a header before any handler runs, and
  passed to `logger.logAccess()`. That fixes `durationMs` to measure from dispatch start.
- Metrics are kept in in-process counters and histograms (fixed buckets) and rendered by hand in
  Prometheus text 0.0.4. The route label is the matched route's pattern, never the pathname.
- With several processes, each exposes its own `/metrics`, and the scraper aggregates them.
  That is standard Prometheus practice, so there is no shared metrics store.
- `/livez`, `/readyz` and `/metrics` are matched before the rate limiter and before any session
  work, so probes are never limited and never touch auth.

### D7. Admin snapshot refresh off the request path
After each successful read, a timer re-reads the snapshot at 0.8 × `ADMIN_SYNC_TTL_MS`, so in
steady state requests always find a fresh copy and never wait on SQLite. A failed background
read drops the copy. The next request then reads synchronously and fails closed, exactly as
today. No copy is ever served older than `ADMIN_SYNC_TTL_MS`.
- **Why not "serve the last good copy for 2 × TTL":** that would let a broken or replaced admin
  database keep governing access with stale data for longer than today. The proactive
  re-read gets the latency win without loosening the rule.
- The read stays synchronous; a worker thread is not needed at this data size.

### D8. Type checks and lint in CI, no build
Add a `jsconfig.json` with `checkJs` for `lib/` and `server.js`. CI runs `tsc --noEmit` and
ESLint (both dev dependencies), and the test step adds `--experimental-test-coverage` with a
line-coverage floor set to the measured baseline minus 2 points. The frontend stays out of scope
for type checks in this change.

### D9. Packaging
Add a `Dockerfile` (`node:22.16-bookworm-slim`, not Alpine because bcrypt ships no musl prebuilds; `npm ci --omit=dev`, `USER node`, `FILES_ROOT` mounted
read-only, `PORTAL_DATA_DIR` as a volume, `HEALTHCHECK` on `/livez`). The nginx config stays in
the Admin Files Manager repo. It forwards only `/api/` and `/release[89]/latest`, so the
operational endpoints are never proxied. systemd stays
the documented primary path.

## Risks / Trade-offs

- [Router refactor changes behaviour subtly, such as route order or a missed gate] →
  Order-preserving table, the gate-declaration test, and the full existing suite run unchanged
  before and after. Land it in a commit of its own with no other edits.
- [The background re-read still blocks the event loop briefly every 0.8 × TTL] → It takes milliseconds at the current data size, and `portal_admin_snapshot_age_seconds` shows whether refreshes keep up.
- [SQLite write contention under heavy traffic] → Batched rate-limit flushes (D2), WAL mode and
  `busy_timeout`. The metrics show store errors, and Redis is the documented upgrade.
- [Shared store on a network filesystem with poor locking] → Document that `PORTAL_DATA_DIR` on
  NFS is unsupported for multi-host use until Redis exists. A single host is the supported
  topology.
- [Stricter config breaks an existing deployment on upgrade] → The startup message names every
  variable. The release notes list the new checks, and a `--check-config` dry run is provided so
  operators can validate before switching.
- [The content index serves a deleted file in search results until it expires] → Accepted
  within the bound. Download re-resolves on disk and answers `404` (spec).
- [Merge conflicts with in-progress changes] → Sequenced after them (proposal Impact).

## Migration Plan

1. Operators rotate `AUTH_JWT_SECRET` on every server before or during the first deploy of this
   change. Every session ends; this is expected.
2. Run `node server.js --check-config` against the production env file and fix every problem
   it reports.
3. Deploy. On first start the portal creates `portal-state.sqlite` and begins empty (as after a
   restart today).
4. Point the load balancer health check at `/readyz` and the supervisor at `/livez`. Add a
   Prometheus scrape of `127.0.0.1:4000/metrics`.
5. Rollback: deploy the previous tag. `portal-state.sqlite` is ignored by older versions and
   can stay in place.
