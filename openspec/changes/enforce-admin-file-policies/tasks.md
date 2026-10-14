# Tasks

## 1. Test harness

- [x] 1.1 Add `test/helpers/admin-fixture.js`. It builds a temp `admin.sqlite` with the admin v2 schema (SQL copied verbatim from the admin's `src/db/schema.js`, with its source noted) and a temp `FILES_ROOT` tree. It also provides helpers to insert users with admin-format scrypt hashes, policies and grants, and to start the portal in-process on an ephemeral port. Verify with a smoke test that boots the server in integration mode and gets `200` from `/api/health`.
- [x] 1.2 Make `npm test` run every `test/*.test.js` (keeping the zero-dependency runner). Verify `npm test` runs both the existing and the new suite.

## 2. Admin data snapshot (`lib/admin-db.js`)

- [x] 2.1 Remove `ADMIN_STORAGE_ROOT` and `resolveMapping`. Add `clientPathOf(rel)` = `'/' + segments` and normalize stored paths (collapse slashes, drop trailing slash, lowercase on win32). Log a one-line notice at startup if `ADMIN_STORAGE_ROOT` is still set. Verify with unit tests: `a/b` → `/a/b`, `''` → `/`, `/x//y/` normalizes to `/x/y`.
- [x] 2.2 Replace the policy-only snapshot with one TTL snapshot of users, policies (`Map<path, Policy[]>`) and grants (`Map<fileId, Map<userId, perm>>`). Validate every row per design D3 and mark invalid rows. Verify with unit tests for each invalid domain (mode, flags, window, permission, status).
- [x] 2.3 Add `ADMIN_SYNC_TTL_MS` (default 5000, clamped to 1000–60000), open the DB with a 2000 ms timeout, and mark the snapshot unavailable on any refresh error (never serve stale data). Verify with tests: a change appears after the TTL and not before; a DB renamed away makes the snapshot unavailable; restoring it recovers.
- [x] 2.4 Resolve `ADMIN_DB_PATH` once against the project root, used by both startup and runtime. Verify with a test: a relative path works when `process.cwd()` differs from the project root.
- [x] 2.5 Keep the fail-closed startup checks (missing, unreadable, missing tables, schema > 2, partial config, `AUTH_ENABLED` off). Verify with the existing config-matrix tests, updated for the removed variable.

## 3. Decision function (`lib/access-policy.js`)

- [x] 3.1 Implement `decide(rel, caller)` → `{result: allow|locked|hidden, origin}`: collect policies on the path and its prefixes, evaluate each with the spec table, and combine hidden > locked > allow. Verify with unit tests covering every row of the decision table in `specs/file-access-policy`.
- [x] 3.2 Cover unpublished > locked, availability windows (inclusive bounds, null bounds), deny on every mode and on folders, per-policy grants (folder grant vs. a restricted child), deleted policy with leftover permission rows, `is_directory = 0` on a folder, admin role with no bypass, and Windows case-insensitive matching. Verify each with a named unit test.
- [x] 3.3 Keep the legacy `RELEASE_PVM` rule as the router's existing pre-gate (it already only restricts, and also covers legacy mode), rather than duplicating it inside `decide`. Verify with an HTTP test: the release path is still `401` when anonymous, an admin-hidden release file is `404` for a logged-in user, and `/release9/latest` skips it.
- [x] 3.4 Add `projectEntry(entry, decision)` (allow → unchanged; locked with origin `self` → `{name, path, type, locked: true}`; otherwise dropped) and make legacy mode the identity. Verify with unit tests, including that no `locked` key appears in legacy mode.
- [x] 3.5 Make an unavailable snapshot produce an `unavailable` result that the router maps to `503 POLICY_UNAVAILABLE`. Verify with a unit test.

## 4. Authentication (`lib/auth-service.js`)

- [x] 4.1 In integration mode, replace the username regex with trim plus a 1–255 length check, and look users up in the snapshot case-insensitively. Verify with HTTP tests: `john.doe`, ` Erfan `, and a 2-character name all log in; an unknown user and a wrong password give identical responses.
- [x] 4.2 Call `verifyAdminPassword` directly with async `crypto.scrypt` and a dummy hash for unknown users. Verify with a test: a hash created exactly like the admin's `hashPassword` verifies, and a malformed hash never matches.
- [x] 4.3 Refuse `disabled` users (generic response) and active `locked_until` (`LOCKED_OUT` plus retry-after). Keep the portal-local throttle and never write to the DB. Verify with HTTP tests, plus a test that the admin DB file's bytes are unchanged after logins.
- [x] 4.4 Add `pwf` to the JWT. `verifySession` requires the user to be in the snapshot, `active`, with a matching `pwf`. Verify with HTTP tests: disable, delete and password reset each turn the next request into `401` after the TTL.
- [x] 4.5 Return `SERVER_ERROR` for logins and anonymous sessions when the snapshot is unavailable. Verify with a test: DB missing → login `500`-class `SERVER_ERROR` and no governed file served.
- [x] 4.6 Honor admin "Revoke sessions": load the latest successful `user.revoke_sessions` audit time per user into the snapshot, add an `auth_time` claim that renewals keep, and refuse sessions with `auth_time` at or before the revocation (`SESSION_REVOKED`). Verify with HTTP tests: revoke ends the session and re-login works, renewal does not escape it, other users and failed revokes are unaffected, a token without `auth_time` is refused.

## 5. Endpoint enforcement (`lib/api-router.js`, `lib/files-service.js`)

- [x] 5.1 Delete the dead first copies of `listPath` and `getDownloadTarget` in `files-service.js`. Verify the existing tests still pass.
- [x] 5.2 `/api/files`: decide before `fs` (hidden → identical `NOT_FOUND` 404, locked → 401), then project the children. Verify with HTTP tests for anonymous and logged-in listings (allow, locked without `size`/`mtime`, hidden omitted, entries locked through an ancestor omitted), and that a 404 body for a hidden path is byte-identical to one for a missing path.
- [x] 5.3 `/api/download` and `/api/hash`: require `allow` before any `fs` call. Verify with HTTP tests: a direct URL to a file in a locked folder → 401 with no body bytes; deny → 404; hash of a hidden file → 404 without reading the file (spy on `fs`).
- [x] 5.4 `/api/download-zip`: require `allow` on the directory and every item before `createArchive`; any hidden → 404, else any locked → 401. Verify with HTTP tests: a mixed selection is refused and no archive bytes are sent.
- [x] 5.5 `searchEntries`: add a `visit` callback that skips hidden entries and the contents of locked folders during the walk, and project the results. Verify with HTTP tests: a hidden-only match → empty results with `truncated: false`; a match inside a locked folder is absent; `limit` counts only visible results.
- [x] 5.6 `/api/categories`: the predicate becomes `decide === allow`, and a self-locked category is returned as `locked: true` without counts or dates. Verify with HTTP tests: counts for anonymous vs. logged-in callers per the spec scenarios.
- [x] 5.7 `listLatestReleases` and `/release{8,9}/latest`: apply `visit` before sorting and the cap; `latest` → newest allow, else 401 if any locked, else 404. Verify with HTTP tests: newest unpublished → the older build streams; all locked → 401.
- [x] 5.8 Map `unavailable` to `503 POLICY_UNAVAILABLE` on every file endpoint. Verify with an HTTP test that renames the DB away mid-run: every file endpoint returns 503 with no file content or metadata.
- [x] 5.9 Path traversal under integration: `..`, encoded `..`, backslashes and a symlink escape are still refused, before or regardless of the decision. Verify with HTTP tests.
- [x] 5.10 Sync over HTTP: unpublish, change mode, add or remove a grant or deny, and change a window. Each takes effect after the TTL and not before. Verify with HTTP tests that use a short TTL.
- [x] 5.11 Rewrite `docs/integration-admin-files-manager.md`: agreed semantics table (design D1), endpoint behavior, `ADMIN_SYNC_TTL_MS`, fail-closed behavior, how "Revoke sessions" is detected via the audit log, known limitations (stale rows after folder rename, `SQLITE_BUSY`, the audit-log dependency). Update `.env.example`. Verify the doc's config section matches `.env.example`.
- [x] 5.12 Decide every content request on the requested path **and** its real on-disk path (`files-service.canonicalRel`, native realpath), so in-root symlinks/junctions and Windows aliases (trailing dot/space, `::$DATA`, case, 8.3 names) cannot reach a governed file. Verify with HTTP tests for each alias, and a mutation check that removing the real-path pass makes them fail.

## 6. Frontend

- [x] 6.1 `browse.js`: render `locked` rows with a Locked chip by the name, no size or date, a disabled checkbox and a sign-in action; activating a locked file opens the existing sign-in modal and the page re-renders in place after sign-in (locked folders still navigate to their sign-in state). Verified in the running app against a fixture DB.
- [x] 6.2 One delegated download guard in `file-actions.js` for every `a[data-file]` in the app (Browse, inspector, Releases, search): `HEAD` preflight, 200 → download, 401 → sign-in modal, 404 → the view refreshes and the item disappears, other → message. Verified in the app: a stale link to a now-unpublished file refreshes the list and a stale locked link opens sign-in; neither shows JSON.
- [x] 6.3 `file-inspector.js`: locked rows cannot be selected, so the card never shows their metadata; a checksum `401` reports that sign-in is needed and opens the modal.
- [x] 6.4 `bulk-download.js`: locked rows are excluded from select-all and row-click selection; the ZIP is preflighted (401 → modal, 404 → "Selection is no longer available"); the server answers `HEAD` on the ZIP route without building the archive (HTTP test added). Verified in the app with a file unpublished mid-session.
- [x] 6.5 Search: home results and autocomplete show a Locked chip for `locked` hits and open sign-in instead of navigating (mouse and keyboard); file names and paths in home results are now HTML-escaped; the category card of a locked category reads "Locked · Sign in to open"; the cached category view is cleared on sign-in and sign-out. Verified in the app.

## 7. Integration check

- [x] 7.1 Run `npm test`, `node lib/archive-service.check.js`, `node lib/hash-service.check.js` and `npm run check:releases`. Verify all pass, and record the counts in the change summary.
- [x] 7.2 Against a copy of the real `admin.sqlite` (never the original), start the portal and confirm by hand: the 3 current unpublished rows are hidden; after publishing a copy's row, the file shows as locked and opens after login. Verify by recording the observed responses in the change summary.

## Workflow follow-up

- Archive the change after review (`/opsx-archive`), which promotes `admin-authentication` and `file-access-policy` to `openspec/specs/`.
