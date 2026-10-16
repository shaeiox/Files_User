# Tasks

## 1. Secret, repo state and docs truth (P0)

- [ ] 1.1 Rotate `AUTH_JWT_SECRET` on every server to a fresh 96-hex value never present in git history (manual, operator). Verify that an old session cookie gets `authenticated:false` from `/api/auth/status`.
- [ ] 1.2 Decide with the repo owner whether to purge `.env` from history (`git filter-repo --path .env --invert-paths` plus a force-push). Record the decision in `docs/SECURITY.md`. Verify that `git log --all -- .env` matches the recorded decision.
- [x] 1.3 Rewrite `docs/SECURITY.md` known-debt item 1 to the current state (untracked, still in history, rotation required). Verify that it no longer claims `.env` is tracked.
- [x] 1.4 Commit the pending move into `public/` as its own commit. Verify that `git status` is clean and `npm test` passes.
- [x] 1.5 Keep the nginx config in the Admin Files Manager repo (`scripts/nginx/cloudavid.conf`, the established home per `docs/DEPLOYMENT.md` §7) and document in §7 that its proxy location forwards only `/api/` and `/release[89]/latest`, so `/livez`, `/readyz` and `/metrics` stay private. Verify that §7 states this.
- [x] 1.6 Add `graphify-out/` to `.gitignore` and untrack it (`git rm -r --cached graphify-out`). Verify that `git ls-files graphify-out | wc -l` prints 0.

## 2. CI quality gates

- [x] 2.1 Add `jsconfig.json` (`checkJs`, `strict: false`, `lib/` and `server.js`) and TypeScript as a dev dependency. Fix or `@ts-expect-error`-annotate the existing errors. Verify that `npx tsc -p jsconfig.json --noEmit` exits 0.
- [x] 2.2 Add ESLint (flat config, `eslint:recommended`, node globals) as a dev dependency and fix its findings with no behaviour change. Verify that `npx eslint lib server.js test` exits 0 and `npm test` passes.
- [x] 2.3 Measure line coverage with `node --test --experimental-test-coverage` and add `test:coverage` with a floor of baseline minus 2 points. Verify that the script fails when the floor is raised above the measured value.
- [ ] 2.4 Add the type-check, lint and coverage steps to `.github/workflows/ci.yml`, and move `lib/*.check.js` to `test/checks/` (updating the CI paths). Verify that CI is green on the branch.

## 3. Validated startup configuration

- [x] 3.1 Create `lib/settings.js` with one declaration per variable (type, default, range, secret flag), covering every variable in `docs/DEPLOYMENT.md` §5.3 plus `CONTENT_INDEX_TTL_MS` and `CONTENT_INDEX_MAX_DIRS`. Fold `productionPathProblems()` into it. Verify with unit tests for each numeric and boolean rule in `specs/startup-configuration`.
- [x] 3.2 Report every problem together, never print values of secret-flagged variables, and refuse a short `AUTH_JWT_SECRET` at startup when auth is on. Verify with tests for the "Two bad values", "Typo in AUTH_ENABLED", "Short secret" and "Secret problem message" scenarios.
- [x] 3.3 Replace every `process.env` read in `lib/` with `settings`, keeping admin tunables first through `adminDb.tunable()`. `get()` parses the live environment, so existing tests keep setting `process.env`. Verify that `grep -n "process.env" lib/*.js` hits only `settings.js` and `load-env.js`, and that `npm test` passes.
- [x] 3.4 Add `node server.js --check-config` (no listen, no trace file opened). Verify with tests for both "Configuration dry run" scenarios.
- [x] 3.5 Document the new checks, the dry run and the **BREAKING** upgrade note in `docs/DEPLOYMENT.md` §5 and §10 and in `.env.example`. Verify that the documented `--check-config` command runs as written.

## 4. Route table (no behaviour change)

- [x] 4.1 Extract the request-scoped helpers (`cookieSession`, `basicSession`, `decideFor`, `gate`, `worstOf`, `answerPolicy`, `releaseGateLegacy`, `renewPolicySession`, `policyUnavailable`, `releaseRootDecision`) into `createRequestContext()`, unchanged. Verify that `npm test` passes with no test edits.
- [x] 4.2 Move each endpoint into `lib/routes/{auth,catalog,content,releases,static}.js` as `{ method, match, gate, handler }`, registered in today's `if` order, with a dispatcher that picks the first match. Verify that `npm test` passes with no test edits and the diff of `test/` is empty.
- [x] 4.3 Add `test/routes.test.js`, which lists the registered routes and fails when a route under `/api/files`, `/api/download`, `/api/hash`, `/api/search`, `/api/download-zip`, `/api/releases` or `/release*/latest` declares no gate. Verify that it fails when the gate is removed from one route and passes when restored.
- [x] 4.4 Update the routing and module sections of `docs/ARCHITECTURE.md` and `docs/EXTENDING.md` ("adding a route"). Verify that every file path they mention exists.

## 5. Health probes

- [x] 5.1 Add `/livez` and `/readyz` routes, matched before the rate limiter and session work, with the fixed check identifiers from `specs/service-health`. Keep `/api/health` and `/__health` unchanged. Verify with endpoint tests for every scenario in `specs/service-health`, including an unreadable `FILES_ROOT` and an unreadable admin database.
- [x] 5.2 Document the probes in `docs/API.md` and `docs/DEPLOYMENT.md` §9 and §11, replacing the "liveness only" note. Verify that the documented `curl` lines return the documented bodies against a local run.

## 6. Request tracing and metrics

- [x] 6.1 Generate or accept `X-Request-Id` in the dispatcher (trusted proxy only, `[A-Za-z0-9._-]{1,128}`) and add `requestId` and `durationMs` to every access trace line, keeping existing fields. Verify with tests for the three request-ID scenarios and the trace-line correlation scenario.
- [x] 6.2 Add in-process counters and fixed-bucket histograms (requests by route template and status class, duration, sign-in failures, lockouts, active downloads, admin snapshot age) and render them as Prometheus text at `/metrics`. Verify with a test that scrapes after a download and asserts that no label contains a path segment.
- [x] 6.3 Restrict `/metrics` to loopback, or a trusted proxy without `X-Forwarded-For`, and answer everyone else exactly as for an unknown path. Verify with a test that compares the forwarded `/metrics` response with an unknown-path response.
- [ ] 6.4 Document the trace fields, the metric names and the scrape setup in `docs/DEPLOYMENT.md` §11 and `docs/API.md`, and confirm with the admin team that the Logs pane ignores the new fields. Verify that the admin Logs pane still renders a trace written by this build.

## 7. Split the auth service (no behaviour change)

- [x] 7.1 Split `lib/auth-service.js` into `lib/auth/{jwt,passwords,lockout,users-legacy,users-admin,session}.js`, keeping `lib/auth-service.js` as the public facade with the same exports. Verify that `npm test` passes with no test edits and `tsc --noEmit` is clean.

## 8. Shared security state

- [x] 8.1 Add `lib/state-store.js`: `<PORTAL_DATA_DIR>/portal-state.sqlite`, WAL, `busy_timeout`, tables `revoked_sessions`, `failed_logins`, `rate_buckets`, and a 5-minute purge. Verify with unit tests for upsert, expiry and purge, plus the "State store holds no secrets" scenario.
- [x] 8.2 Move logout revocation to the store and fail closed when it is unreadable. Verify with tests that run two portal processes on one data directory for "Old cookie after restart", "Logout on one instance, reuse on another" and "Store unavailable during status check".
- [x] 8.3 Move failed-login counting and lockout to the store and answer `503 SERVER_ERROR` when it is unwritable. Verify with tests for "Restart does not unlock", "Attempts counted across processes" and "Store unavailable during sign-in".
- [x] 8.4 Move rate limiting to batched store flushes (1 s or 20 requests), with an in-memory fallback and a warning. Verify with tests for "Requests spread over two processes" and "Store unavailable for rate limiting".
- [x] 8.5 Mark ADR-012 superseded and add ADR-013 (portal-owned SQLite security state, with Redis as the upgrade path). Update `docs/SECURITY.md` rate-limiting and lockout sections and the `docs/DEPLOYMENT.md` §11 "Restart effects" row. Verify that `docs/decisions/README.md` lists ADR-013.

## 9. Admin snapshot off the request path

- [x] 9.1 Re-read the admin snapshot in the background at 0.8 × `ADMIN_SYNC_TTL_MS`. A failed re-read drops the copy so the next request fails closed, and no copy is ever served older than one interval (design D7). Verify with tests that the snapshot stays fresh without requests, and that a corrupt database is dropped within one interval with `/readyz` turning `503`.
- [x] 9.2 Update the snapshot description in `lib/admin-db.js`'s header and in `docs/DATAFLOWS.md`. Verify that the documented staleness bound matches the code constant.

## 10. Content index

- [x] 10.1 Add a cached raw directory reader (`name`, `type`, `size`, `mtimeMs`), keyed by absolute directory, with TTL `CONTENT_INDEX_TTL_MS`, LRU-bounded by `CONTENT_INDEX_MAX_DIRS`, sharing a single read between concurrent misses. Verify with unit tests for expiry, eviction and coalescing.
- [x] 10.2 Route `summarizeTree()` and `searchEntries()` directory reads through it, keeping every `screen()` and `allow` call in place. Download, hash and archive stay on direct disk reads. Verify with tests for every scenario in `specs/content-index`, including "Folder locked after indexing" and "Deleted file not downloadable through the index".
- [x] 10.3 Document the cache variables and the freshness bound in `docs/DEPLOYMENT.md` §5.3 and `docs/API.md`. Verify that `.env.example` lists both variables.

## 11. Packaging

- [ ] 11.1 Add a `Dockerfile` (`node:22.16-bookworm-slim`; bcrypt has no musl prebuilds, `npm ci --omit=dev`, `USER node`, read-only `FILES_ROOT` mount, `PORTAL_DATA_DIR` volume, `HEALTHCHECK` on `/livez`) and a `.dockerignore`. Verify that `docker build` succeeds and that `docker run` with a sample `FILES_ROOT` answers `/readyz` with `200`.
- [ ] 11.2 Add a "Container" section to `docs/DEPLOYMENT.md`. Verify that its commands run as written.

## 12. Integration check

- [ ] 12.1 Run two portal processes on one data directory. Run the `docs/DEPLOYMENT.md` §9 checks, sign out through one process, and replay the cookie through the other. Verify that every §9 check passes, the replay gets `SESSION_REVOKED`, and public `/metrics` is not served.
- [x] 12.2 Re-score the architecture against the review rubric and record the result in `docs/ARCHITECTURE.md`. Verify that every P0–P3 item is marked done or deferred with a reason.

## Workflow follow-up

- Archive the change after review and once the in-progress changes it is sequenced behind are archived.
