# Proposal

Sibling of the Admin Files Manager change of the same name (`openspec/changes/isolate-app-roots` in
the admin repository). The full analysis and decisions (D1–D8) are in that change's `design.md`. This
file covers only the portal side.

## Why

The portal can't be moved or deployed on its own:

- `ADMIN_DB_PATH` names a file inside the admin's code folder (`<admin repo>/data/admin.sqlite`). The
  admin's `PORTAL_LOG_FILE` names a file inside this one (`<portal repo>/data/portal.log`). Renaming
  either folder breaks the other app.
- `lib/admin-db.js` runs SQL against the admin's private tables. Every admin migration can stop the
  portal ("schema version N is not supported"). Read-only access to a WAL database also requires the
  same host, the same filesystem, and permission to write the admin's `-shm` file.
- The portal receives every admin user's bcrypt `password_hash` so it can verify sign-ins.
- On the reference host `FILES_ROOT=/opt/` contains both repositories. `isHidden()` hides only
  dot-entries, so the admin database, `portal-state.sqlite` and both source trees are servable
  unless a policy covers them.
- `PORTAL_DATA_DIR` falls back to `<code folder>/data`. Relative path values resolve against the code
  folder.

## What Changes

- **State never lives in the code folder (production).** `PORTAL_DATA_DIR` (already required in
  production) and `LOG_FILE` / `AUTH_USERS_FILE` must not resolve inside the code folder. Startup is
  refused otherwise.
- **`FILES_ROOT` never overlaps the portal (new, refuse in production).** `FILES_ROOT` must not contain, or sit
  inside, the code folder or `PORTAL_DATA_DIR`.
- **HTTP policy source (new).** The admin data is read through a `PolicySource` interface:
  - `HttpPolicySource` (new, preferred): polls `ADMIN_API_URL/api/v1/integration/portal/snapshot` with
    `ADMIN_SERVICE_TOKEN` and `If-None-Match`.
  - `SqlitePolicySource`: today's code, kept for one release.
  Both feed the existing `buildSnapshot`, so access decisions, the volume check (`locate`), fail-closed
  behaviour and `ADMIN_SYNC_TTL_MS` are unchanged.
- **Sign-in is verified by the admin.** In HTTP mode the portal calls
  `POST /api/v1/integration/portal/credentials/verify`. It never holds password hashes. The session
  claim `pwf` becomes the admin's `credentialStamp`.
- **Ops endpoints for the admin (new).** `GET /api/ops/log?limit=` serves the trace log, and
  `POST /api/ops/access-check` answers `decide()` for a path and user. Both require the service token.
  The admin stops reading the log file by path and stops copying the decision rules.
- **Hygiene.** Remove the `D:\…` reference in `test/helpers/admin-fixture.js`, remove the host-specific
  `graphify-out/.graphify_python`, and refresh the stale graph.

## Capabilities

- **New** `app-root-isolation`: relocatable, read-only code folder; state only in configured folders;
  no overlap with `FILES_ROOT`.
- **New** `admin-policy-source`: the HTTP contract client, credential delegation and ops endpoints. It
  replaces direct SQL reads of the admin database.

## Impact

- Code:
  - `lib/load-env.js`, `lib/settings.js`, `server.js`.
  - `lib/admin-db.js`, split into `lib/admin/policy-source-http.js`, `lib/admin/policy-source-sqlite.js` and
    the shared snapshot builder.
  - `lib/auth/users-admin.js`, `lib/routes/ops.js`.
- Config:
  - New: `ADMIN_API_URL`, `ADMIN_SERVICE_TOKEN`.
  - `ADMIN_DB_PATH` becomes the deprecated fallback, removed next release.
  - `ADMIN_INTEGRATION_ENABLED` keeps its meaning. With it on, exactly one of `ADMIN_API_URL` / `ADMIN_DB_PATH` must be set.
- One-time effect: when a host switches from SQLite to HTTP, existing portal sessions end (the `pwf`
  claim changes form). Users sign in again.

## Non-goals

- Any change to access rules or to `decide()`.
- Multiple admin instances.
- Push or webhook updates.
- Running without the admin while integration mode is on (it stays fail closed).
