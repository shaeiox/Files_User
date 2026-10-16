# Proposal

## Why

An architecture review (2026-10-16) scored the portal 58/100 for enterprise readiness. Its
security model is strong, but it cannot run as more than one instance: rate limits, lockouts
and logout revocations live in process memory. It also has almost no monitoring, it walks the
whole file tree on every home-page and search request, and one ~400-line function routes every
request. A real `AUTH_JWT_SECRET` is still in git history (commits `c1d6de8`, `692725d`,
`edef67b`). These gaps block running the portal behind a load balancer, monitoring it, and
extending it safely.

## What Changes

- **Secret and repo state (P0).** Treat every `AUTH_JWT_SECRET` that was ever committed as
  compromised: rotate it, and correct `docs/SECURITY.md`, which still says `.env` is tracked.
  Commit the pending move into `public/` and document that the nginx config (kept in the
  Admin Files Manager repo) never proxies the new operational endpoints.
- **Health probes (new).** `GET /livez` reports that the process is up. `GET /readyz` reports
  whether `FILES_ROOT` is readable and, in integration mode, whether the admin snapshot is
  fresh. `/api/health` and `/__health` stay as liveness aliases.
- **Request tracing and metrics (new).** Every response carries `X-Request-Id`, and every
  trace line records it with the duration. `GET /metrics` serves Prometheus text, but only to
  loopback or trusted-proxy callers.
- **Shared security state (new).** Logout revocations, login lockouts and rate-limit counters
  move to a portal-owned SQLite file in `PORTAL_DATA_DIR`. They survive restarts and are shared
  by every process that uses the same data directory.
- **Validated startup configuration (new).** Every environment variable is read and checked
  once, at startup. A malformed value refuses startup with every problem listed. Today a
  non-numeric `RATE_LIMIT_MAX_REQUESTS` silently becomes `NaN`, an unrecognised `AUTH_ENABLED`
  value silently turns auth off, and a short `AUTH_JWT_SECRET` is only caught at the first
  sign-in.
- **Cached content index (new).** `/api/categories` and `/api/search` read a cached directory
  index instead of walking the disk on every request. Access decisions are still made per
  request and are never cached.
- **Internal structure (no behaviour change).** A route table replaces the single router
  function. `lib/auth-service.js` is split by concern. CI adds JSDoc type checking, a linter and
  a coverage floor.
- **Packaging.** Add a Dockerfile (non-root user, read-only content mount) as an alternative to
  systemd. Stop tracking `graphify-out/`.

There are no breaking API changes. Existing endpoints, status codes and response bodies stay
the same. **BREAKING (operations only):** a portal that starts today with a malformed
numeric or boolean variable (for example `AUTH_ENABLED=ture`, which today silently turns auth
off), or with auth on and an `AUTH_JWT_SECRET` under 32 characters, will refuse to start.

## Capabilities

### New Capabilities
- `service-health`: liveness and readiness probes, and what each one checks.
- `request-observability`: request IDs on responses and trace lines, and an access-restricted
  Prometheus metrics endpoint.
- `security-state`: logout revocations, login lockouts and rate limits that persist across
  restarts and are shared by every process using one data directory.
- `startup-configuration`: validation of every environment variable at startup, refusing to
  start with all problems listed.
- `content-index`: how fresh category summaries and search results are, and the guarantee that
  access decisions stay per request and uncached.

### Modified Capabilities
<!-- None: browse-page, bulk-download and file-inspector requirements are unchanged. -->

## Impact

- **Code:** `server.js`, `lib/api-router.js` (becomes a route table plus `lib/routes/*`),
  `lib/auth-service.js` (split), `lib/rate-limiter.js`, `lib/logger.js`, `lib/http-utils.js`,
  `lib/files-service.js`, `lib/load-env.js` (plus a new settings module), and a new
  portal-state store.
- **Data:** a new `portal-state.sqlite` in `PORTAL_DATA_DIR`. The portal creates and owns it;
  the admin database stays read-only.
- **Dependencies:** none at runtime (`node:sqlite` is already used). Dev-only: a linter and
  TypeScript for `--noEmit` checks.
- **Ops:** new probe and metrics URLs. nginx must not expose `/metrics` publicly. Restarts no
  longer reset lockouts or revocations. `docs/DEPLOYMENT.md` §9 and §11, `docs/API.md`,
  `docs/SECURITY.md` and `docs/ARCHITECTURE.md` need updates.
- **Sequencing:** land after the in-progress changes `decouple-storage-and-release-paths`,
  `fix-auth-flows-and-cli-login` and `redesign-releases-page`, which touch the same router and
  auth files.
