# Integration: CloudAvid File Portal ↔ Dimension Files Manager

The Admin Files Manager (`D:\Projects\Admin-Files-Manager-fixed`) is where administrators manage
users and file policies. This portal is the user-facing side and the **only** place those policies
are enforced: the admin application stores them in `admin.sqlite` but does not apply them to any
download (its ADR-009 §4).

The portal reads `admin.sqlite` **read-only** and is never a second source of truth. An
administrator configures users, restrictions and permissions once, in the admin app.

Change record: `openspec/changes/enforce-admin-file-policies/` (proposal, specs, design, tasks).

---

## 1. Configuration

| Variable | Meaning |
|---|---|
| `ADMIN_INTEGRATION_ENABLED` | `true` to enforce admin policies. |
| `ADMIN_DB_PATH` | Path to the admin's `admin.sqlite`. Relative paths resolve against this project's folder. |
| `ADMIN_SYNC_TTL_MS` | How often admin data is re-read, in ms. Default `5000`, clamped to `1000`–`60000`. |
| `AUTH_ENABLED` | Must be `true` in integration mode. |
| `FILES_ROOT` | Must be the **same directory** as the admin's `STORAGE_ROOT`. Portal path `a/b` is admin client path `/a/b`. |

`ADMIN_STORAGE_ROOT` is no longer used; if set, the server logs that it is ignored.

**Startup refuses to run** (it never falls back to "everything public") when:

| `ADMIN_INTEGRATION_ENABLED` | `ADMIN_DB_PATH` | Result |
|---|---|---|
| unset | unset | legacy mode (no admin policies, existing behaviour) |
| `false` | unset | legacy mode |
| unset or `false` | set | **refused**: inconsistent |
| `true` | unset | **refused** |
| `true` | missing file, not the admin schema, schema newer than v2, or unreadable | **refused** |
| `true` | valid | integration mode (also requires `AUTH_ENABLED=true`) |

---

## 2. What the portal reads

Every `ADMIN_SYNC_TTL_MS`, in one read transaction on a connection opened read-only for that read
only:

| Admin table | Columns used | Purpose |
|---|---|---|
| `users` | `id`, `username`, `role`, `status`, `password_hash`, `locked_until` | Login and session validity |
| `files` ⋈ `file_access_policies` | `client_path`, `is_directory`, `access_mode`, `is_published`, `is_locked`, `available_from`, `available_until` | Access decisions |
| `user_file_permissions` | `file_id`, `user_id`, `permission` | Per-user grant / deny |
| `audit_logs` | latest successful `user.revoke_sessions` per `target_id` | "Revoke sessions" |
| `schema_migrations` | `MAX(version)` | Must be ≤ 2 |

Not used, by design: `users.email` (the admin logs in by username only), `users.failed_login_count`
(updating it would be a write), and `sessions` (admin-panel sessions; a normal admin logout also
sets `revoked_at` and must not log the user out of the portal).

Every row is validated. A policy row outside its domain makes its path **hidden for everyone**, and
a malformed permission row poisons its file's policy. A user row outside its domain cannot log in.

---

## 3. Access rules

### 3.1 One policy, one caller

| Condition | Anonymous | Logged in |
|---|---|---|
| Invalid row | hidden | hidden |
| `is_published = 0` | hidden | hidden |
| Before `available_from` / after `available_until` (bounds inclusive) | hidden | hidden |
| `deny` row for this user (any `access_mode`) | — | hidden |
| `is_locked = 1` | **locked** | rules below |
| `public` | allow | allow |
| `authenticated` | hidden | allow |
| `restricted` | hidden | allow only with a `grant` on **this** policy's file |

### 3.2 Folders and combination

- A policy applies to its path **and everything inside it**, decided by path. `is_directory` is not
  consulted because the admin's own "Set a policy" form never sets it.
- The decision for a path combines the policy on the path, on every parent folder, and on `/`:
  **hidden > locked > allow**. No applicable policy → allow (ungoverned).
- A grant on a restricted folder covers ungoverned contents. A restricted file inside it with its
  own policy still needs its own grant.
- A `files` row whose policy was deleted is ungoverned; leftover permission rows are ignored.
- `users.role` never changes the outcome (admins get no bypass).
- The portal's own `RELEASE_PVM` login rule still applies on top and can only add a `401`.

### 3.3 Owner decisions (where the admin spec was silent or contradictory)

| Topic | Admin spec | Portal |
|---|---|---|
| `is_locked` | "No access regardless of publication" | Anonymous visitors see the name with a lock; they must sign in, then `access_mode` applies |
| Unpublished + locked | Independent flags | Unpublished wins: hidden |
| Folder policies | "Per-file, no inheritance" (ADR-009 §3), yet the UI sets them on folders | Apply to everything inside |
| `deny` on public/authenticated | Defined only for restricted | Always hides from that user |

---

## 4. What each endpoint does

`allow` serves normally. `locked` → `401 AUTH_REQUIRED`. `hidden` → `404` with exactly the body the
endpoint gives for a missing path. Unreadable admin data → `503 POLICY_UNAVAILABLE`.

| Endpoint | Behaviour |
|---|---|
| `GET /api/files/<p>` | Decides `<p>` first. Children: allowed in full; self-locked as `{name, path, type, locked: true}` (no size/date); everything else omitted. |
| `GET/HEAD /api/download/<p>` | Allowed only. |
| `GET /api/hash/<p>` | Allowed only; the file is not opened otherwise. |
| `GET /api/download-zip` | The browsed folder and **every** item must be allowed; any hidden → 404, else any locked → 401. |
| `GET /api/search` | Hidden entries and everything inside locked or hidden folders are skipped during the walk, so `limit` and `truncated` count only visible results. Self-locked matches are reduced. |
| `GET /api/categories` | Hidden categories omitted; a self-locked category shows no counts or dates; counts and dates include only allowed files. |
| `GET /api/releases` | Same projection, applied before the limit. |
| `GET /release{8,9}/latest` | Streams the newest **allowed** build; if none is allowed but some are locked → 401; none → 404. |

**Aliases.** Every content endpoint decides the requested path **and** its real on-disk path. An
in-root symlink or junction, and on Windows a trailing dot or space, a `::$DATA` suffix, a case
change or an 8.3 short name, therefore cannot reach a governed file under another name. `..` and
`.` segments are refused, and links that escape `FILES_ROOT` stay refused as before.

### 4.1 In the portal UI

- Locked files and categories show a **Locked** chip and no size or date. Clicking a locked file
  (in Browse, search, autocomplete or Releases) opens the sign-in modal, and the page re-renders in
  place after sign-in. A locked folder opens its sign-in page.
- Locked rows cannot be selected, so they never reach the metadata card or a bulk download.
- Every download link goes through one guard (`assets/js/file-actions.js`): a `HEAD` preflight
  first, so a `401` opens sign-in and a `404` refreshes the view. The browser never lands on a
  JSON error page. A ZIP request is preflighted the same way.
- The cached home-page category view is cleared on sign-in and sign-out.

---

## 5. Authentication

- Login checks the admin `users` table only: usernames are trimmed and case-insensitive (any
  username the admin can store, up to 255 characters); passwords use the admin's scrypt format
  `"<saltHex>:<hashHex>"` with the salt string used as-is.
- Unknown user, wrong password and disabled account get the **same** response. An active
  `locked_until` gives `429 LOCKED_OUT` with `retryAfterMs`. Unreadable admin data gives
  `503 SERVER_ERROR`.
- The portal keeps its own per-username throttle (`AUTH_MAX_FAILED_ATTEMPTS`,
  `AUTH_LOCKOUT_MINUTES`) because it cannot write `failed_login_count`.
- A portal session ends, within the sync interval, when the admin:

| Admin action | Portal reason |
|---|---|
| Disables or deletes the user | `USER_REVOKED` |
| Resets the password | `PASSWORD_CHANGED` (sessions carry a fingerprint of the stored hash) |
| Uses **Revoke sessions** | `SESSION_REVOKED` (sessions carry their original login time; renewals never extend it) |

---

## 6. Synchronization

All admin changes (users, policies, grants, denies, windows, revocations) take effect within
`ADMIN_SYNC_TTL_MS` (default **5 seconds**) without a restart. A download that is already streaming
is not cut off.

A failed refresh drops the cached copy instead of reusing it; the next request retries.

---

## 7. Known limitations

- **Admin folder renames.** The admin renames only the exact `files` row
  (`FileAccessPolicyRepository.renamePath`). Policies on paths *inside* a renamed folder keep their
  old paths and stop applying until an administrator sets them again.
- **Write contention.** The admin opens its database without a busy timeout, so an admin write that
  coincides with a portal read can fail with `SQLITE_BUSY`. The portal reads once per sync interval
  (about a millisecond every 5 s) and waits up to 2 s for the admin's write lock, so this is rare.
  Switching the database to WAL would be a write to the admin database and is out of scope.
- **Revoke sessions relies on the audit log.** The admin never prunes `audit_logs` today
  (`AuditLogRepository.prune` is never called). If it starts doing so, a portal session left unused
  across both the revoke and the prune would survive.
- **Existence hints.** A `401` under a locked folder confirms the folder is governed, which the lock
  icon already shows. Names inside locked or hidden folders are never revealed.

---

## 8. Pre-existing observations (not part of this change)

- Legacy mode only: `lib/auth-service.js` calls an undefined `loadUsersSync()` in `verifySession`;
  the `ReferenceError` is swallowed, so a user removed from `users.json` keeps their session until
  it expires. Integration mode does not use that path.
- `docs/SECURITY.md` records `.env` committed with a live `AUTH_JWT_SECRET`.

---

## 9. Code map and tests

| Module | Role |
|---|---|
| `lib/admin-db.js` | Configuration, startup validation, read-only snapshot, row validation |
| `lib/access-policy.js` | `decide(path, session)` and the listing projection |
| `lib/auth-service.js` | Admin login, session fingerprint / login time, revocation |
| `lib/files-service.js` | Walks that apply the decision; `canonicalRel` for aliases |
| `lib/api-router.js` | One gate for every endpoint |

Tests (`npm test`) run the real server in-process against a temporary database built with the
admin's exact schema (`test/helpers/admin-fixture.js`):

| Suite | Covers |
|---|---|
| `test/admin-db.test.js` | Path mapping, validation, sync interval, fail-closed refresh, read-only access, startup matrix |
| `test/access-policy.test.js` | Every row of the rule table, folders, grants/denies, invalid data |
| `test/auth.test.js` | Login, status, locks, throttle, disable/delete/reset/revoke |
| `test/endpoints.test.js` | Every endpoint, 503, aliases and traversal, admin changes over time |
