# Design

## Context

See `proposal.md` (Why) for motivation. Requirements are in `specs/admin-authentication`,
`specs/file-access-policy` and the three UI deltas.

Current portal state (commits `2b388e2`, `c0e9a76`):

- `lib/admin-db.js` opens `admin.sqlite` with `node:sqlite` read-only and caches policies and
  grants for 5 s. It maps paths through `ADMIN_STORAGE_ROOT`, which yields `/Downloads/x` while the
  admin stores `/x`, so nothing matches. Users are queried uncached on every request.
- `lib/access-policy.js#authorize` evaluates only the exact path and returns allow, or deny with a
  `challenge` flag. `is_locked` is read as "login required" and `deny` only counts for
  `restricted`.
- `lib/api-router.js` gates `/api/files`, `/api/download`, `/api/hash` and `/api/download-zip`
  per path, and filters `/api/search`, `/api/releases` and `/release*/latest` after the walk.
- `lib/files-service.js#summarizeTree` already accepts an `allow(fullPath)` predicate for category
  counts. `searchEntries` and `listLatestReleases` do not.
- `lib/files-service.js` defines `listPath` and `getDownloadTarget` twice; the first copies (lines
  170 and 236) are dead.
- The frontend already has a sign-in modal (`HomePage.showLoginModal` / `window.triggerAuthModal`).
  `home.js` already preflights downloads with `HEAD` and opens the modal on `401`.

Admin-side facts this design relies on (`D:\Projects\Admin-Files-Manager-fixed`, read only):

- Schema v2: `src/db/schema.js`. Password hashes: `src/utils/crypto.js`. Login rules:
  `src/services/SessionService.js`.
- The DB uses rollback-journal mode with a single connection and no busy timeout.
- The admin enforces no policy (ADR-009 §4), so the portal is the only enforcement point.
- Folder rename and delete hooks update only the exact `files` row
  (`FileAccessPolicyRepository.renamePath` / `deletePath`).

## Goals / Non-Goals

**Goals:**

- One pure decision function, `decide(relPath, caller) -> 'allow' | 'locked' | 'hidden'`, used by
  every endpoint.
- Every DB read is a whole-table snapshot taken at most once per TTL, so the decision path does no
  per-request SQL.
- Fail closed on every integration error, with no silent legacy fallback.

**Non-Goals:**

- Any change to the admin app, its schema, database or `.env`.
- Reconciling storage-root configuration. Both apps are assumed to serve the same root.
- Writing `failed_login_count` or `locked_until`.
- Fixing stale admin rows after a folder rename (an admin-side behavior).
- Live push or invalidation. A TTL poll is sufficient.

## Decisions

### D1. Agreed semantics (owner decisions, 2026-10-14)

The admin specs leave these points contradictory or undefined. The owner settled them:

| Topic | Admin spec says | Portal will do |
|---|---|---|
| `is_locked` | "No access regardless of publication" | Anonymous visitors see the name with a lock and must sign in. After sign-in, `access_mode` applies. |
| `is_published = 0` vs `is_locked` | Independent flags | Unpublished wins: hidden from everyone |
| Folder policies | Per-file, no inheritance (ADR-009 §3), yet the admin Files UI sets them on folders | They apply to all descendants; the strictest result wins |
| `deny` on `public` / `authenticated` | Defined only for `restricted` | It always hides the item from that user |
| `role` | Gates admin routes only | No effect on file access |
| Portal `RELEASE_PVM` login rule | — | Kept as an extra restriction |

Remaining interpretations made without asking, all in the conservative direction:

- Each policy is checked against its own grants, so a folder grant does not satisfy a restricted
  child's own policy.
- A `files` row whose policy was deleted is ungoverned, and its leftover permission rows are
  ignored. This matches the admin's own "Governed files" view, which hides such rows.
- `is_directory` is ignored. Inheritance is decided by path prefix, because the admin's
  `admin.html` form never sets it.

### D2. Path mapping: `/` + relative path

`clientPathOf(rel)` returns `'/' + splitRel(rel).join('/')`, reusing `files-service`'s existing
segment split. Stored `client_path` values are normalized the same way: duplicate slashes
collapsed, trailing slash removed, and lowercased on win32.

`ADMIN_STORAGE_ROOT` and `resolveMapping()` are deleted. If the variable is still set, startup logs
a one-line notice that it is ignored. Filesystem containment stays in
`files-service#resolveInsideRoot`, which still rejects `..` and symlink escapes, and `FILES_ROOT`
stays configurable.

*Alternative rejected:* keeping the prefix mapping. It is the bug, and under the agreed
same-root assumption it adds nothing.

### D3. One snapshot of the admin data, refreshed by TTL

Each refresh runs one read-only read of `users`, `files ⋈ file_access_policies` and
`user_file_permissions`. Every row is validated, then indexed:

- `policies: Map<normClientPath, Policy[]>`. An array, because Windows case-folding can merge rows.
- `grants: Map<fileId, Map<userId, 'grant'|'deny'>>`.
- `users: Map<id, {username, role, status, lockedUntil, pwFingerprint}>` and
  `usersByName: Map<lowerName, id>`.

The TTL comes from `ADMIN_SYNC_TTL_MS`, default 5000 ms, clamped to 1000–60000 ms. The refresh is
lazy: it runs on the first request after expiry.

On refresh failure the snapshot is marked unavailable, and the portal does not keep serving the
stale copy. File endpoints answer `503 POLICY_UNAVAILABLE` and logins answer `SERVER_ERROR`. The
next request retries the refresh.

Row validation (anything outside these domains makes the row's path `invalid`, which means
`hidden`):

- `access_mode` must be one of the three values.
- `is_published` and `is_locked` must be 0 or 1.
- Window bounds must be null or safe integers.
- `permission` must be `grant` or `deny`.
- `status` must be `active` or `disabled`.

*Alternatives rejected:*

- Per-request queries, as today for users. They multiply reads against an admin DB that has no
  busy timeout (see Risks).
- Watching the DB file's mtime. It is unreliable with rollback journals on Windows and adds
  complexity.

### D4. Decision function

`decide(relPath, caller)` collects the policies on the path and on each of its prefixes, from the
root down. Each policy is evaluated with the per-policy table in
`specs/file-access-policy` ("Each policy yields allow, locked or hidden").

Results combine as hidden > locked > allow. If no policy applies, the result is `allow`. The legacy
`RELEASE_PVM` rule stays where it is: the router's existing pre-gate, which runs before `decide` and
already applies in legacy mode too. It can only add a `401`, never loosen a decision.

`decide` also returns `origin`, which is `self` when the strictest `locked` came from the path's own
policy and `inherited` otherwise. Listings and search show only `locked` entries whose origin is
`self`; entries locked through an ancestor are omitted.

It is pure and synchronous over the snapshot, so a 10k-entry walk costs only `Map` lookups. The
number of prefixes is bounded by path depth.

*Alternative rejected:* SQL `LIKE prefix%` queries per path. They are slower, need per-request
reads, and are harder to make case-correct.

### D5. Endpoint wiring

| Endpoint | Wiring |
|---|---|
| `/api/files/<p>` | `decide(p)`: hidden → 404, locked → 401. Children are passed through `projectEntry(entry, decision)`: allow keeps the entry, locked with origin `self` becomes `{name, path, type, locked: true}`, anything else is dropped. |
| `/api/download/<p>`, `/api/hash/<p>` | Must be `allow`, checked before any `fs` call |
| `/api/download-zip` | The directory and every item must be `allow`. Any `hidden` → 404, else any `locked` → 401. Checked before `archiveService.createArchive`. |
| `/api/search` | `searchEntries` gets a `visit(rel) -> decision` callback. Hidden entries and the contents of `locked` folders are skipped during the walk, so `limit` and `truncated` count only visible entries. Matches are projected as in listings. |
| `/api/categories` | The existing `summarizeTree` predicate becomes `decide(...) === 'allow'`. A category whose own decision is `locked` (origin `self`) is returned as `{name, path, type, locked: true}` with no counts or dates. |
| `/api/releases`, `/release{8,9}/latest` | `listLatestReleases` gets the same `visit` callback, applied before sorting and the cap, so the 10-item window problem disappears. `latest` picks the newest `allow`; else 401 if any `locked`, else 404. |

Every content endpoint (listing, download, hash, ZIP, latest) decides each target twice: as
requested, before any filesystem access, and then on its real on-disk path from the native
`realpath`. An in-root symlink or junction, or a Windows alias of a governed file (trailing dot or
space, `::$DATA`, case, 8.3 short name), therefore resolves to the governed path. The most severe
result across all of them is answered.

The 401 response keeps the current shape: `{code: 'AUTH_REQUIRED'}`, with sliding renewal on allow
as today. The 404 response reuses `files-service`'s existing `NOT_FOUND` body, so hidden and
missing paths are byte-identical.

In legacy mode `decide` always returns `allow` and `projectEntry` is the identity function, so
responses are unchanged.

### D6. Authentication

- `loginAgainstAdmin` looks the user up in `snapshot.usersByName` by trimmed, lowercased name.
  Username validation in integration mode is: a non-empty string of at most 255 characters after
  trimming.
- `verifyAdminPassword` is called directly, instead of dispatching through `verifyPassword`'s
  format sniffing. A dummy hash keeps unknown users timing-equivalent.
- The JWT gains `pwf`: the first 16 hex characters of `sha256(password_hash)`. `verifySession`
  requires the user in the snapshot to be `active` with a matching `pwf`. `locked_until` is
  checked at login only, as in `SessionService`.
- **Revoke sessions:** the JWT also gains `auth_time`, the login time in ms, which renewals copy
  and never extend. Each snapshot also loads, per user, the latest successful
  `audit_logs.action = 'user.revoke_sessions'` time (`target_type = 'user'`, `target_id` = user id).
  A session whose `auth_time` is at or before it is refused with `SESSION_REVOKED`; a token without
  `auth_time` is refused too. The admin's `sessions.revoked_at` is not used, because a normal
  admin-panel logout also sets it and should not log the user out of the portal.
- `scryptSync` blocks the event loop for about 50 ms per login. It is switched to async
  `crypto.scrypt` with the same parameters, which produces the same result.

*Alternative rejected:* validating admin `sessions` rows directly. The portal cannot create rows in
that table, so it cannot issue sessions of its own.

### D7. Frontend

Reuse `home.js`'s `HEAD`-preflight-then-modal pattern for downloads started from Browse, the
inspector, Releases and bulk actions.

- `browse.js` renders `locked` rows with the existing lock icon markup and no size or date.
  Activating one calls `window.triggerAuthModal(fetchList)`. The selection checkbox is disabled.
- `file-inspector.js` renders a locked card (name, lock, sign-in button) and handles `401` from
  the hash request.
- `bulk-download.js`: select-all skips locked rows. ZIP is preflighted with `HEAD`: 401 opens the
  modal, 404 shows a "selection no longer available" message.

## Risks / Trade-offs

- **[Admin writes hitting `SQLITE_BUSY`]** The admin opens its DB with no busy timeout, so a write
  that coincides with a portal read fails. → Mitigation: one snapshot read per TTL (about 1 ms
  every 5 s) instead of a read per request. The portal sets its own `timeout: 2000` so it waits
  rather than errors. The residual risk is documented. Switching to WAL would be a write to the
  admin DB and is out of scope.
- **[Changes are delayed by up to the TTL]** A disabled user or an unpublished file stays usable
  for up to 5 s, plus the duration of any download already streaming. → Mitigation: the interval
  is documented and configurable. In-flight streams are not cut.
- **[Revoke sessions depends on the audit log]** The admin's revoke action updates only its own
  `sessions` rows, which a portal user may not have. The portal therefore reads the admin's
  `user.revoke_sessions` audit row instead. If the admin ever pruned audit rows, a portal session
  left unused across both the revoke and the prune would survive. → Mitigation: the admin defines
  `AuditLogRepository.prune` but never calls it; documented as a dependency.
- **[Stale rows after an admin folder rename]** Rows for paths inside a renamed folder keep their
  old paths, so those files lose their own policy. → Mitigation: documented as an admin-side
  limitation. A policy on the renamed folder itself still moves with it.
- **[Existence hints]** `401` under a locked folder reveals that the folder is governed, but no
  more than the visible lock icon already does. Names of hidden or inherited-locked entries never
  appear.
- **[Response shape change]** Anonymous listings in integration mode lose `size` and `mtime` on
  locked rows. → The frontend is updated in the same change. Legacy mode is unchanged.
- **[Inheritance differs from the admin ADR]** Admins reading ADR-009 might expect a folder policy
  not to cover its contents. → Recorded as an owner decision in the portal docs.

## Migration Plan

1. Deploy the portal with `ADMIN_INTEGRATION_ENABLED=true` and `ADMIN_DB_PATH` set.
   `ADMIN_STORAGE_ROOT` can be removed and is ignored if left.
2. **Before cutover**, tell admins that existing locked rows are unpublished and therefore stay
   hidden until "Published" is ticked. All 3 current rows are in this state.
3. **Rollback:** unset both integration variables to return to legacy mode. No data migrates in
   either direction.
