# Integration: CloudAvid File Portal ↔ Dimension Files Manager

The Admin Files Manager (a separate application and repository) is where administrators manage
users and file policies. This portal is the user-facing side and the **only** place those policies
are enforced: the admin application stores them in `admin.sqlite` but does not apply them to any
download (its ADR-009 §4).

The portal reads the admin's data through the admin's **HTTP integration contract v1**
(isolate-app-roots, admin ADR-011) and is never a second source of truth. An administrator
configures users, restrictions and permissions once, in the admin app. The only admin-specific
configuration here is a URL and a token. Neither application needs the other's folders, host or
database schema. Reading `admin.sqlite` directly (`ADMIN_DB_PATH`) still works for one release and
is **deprecated**.

Change record: `openspec/changes/enforce-admin-file-policies/` (proposal, specs, design, tasks).

---

## 1. Configuration

| Variable | Meaning |
|---|---|
| `ADMIN_INTEGRATION_ENABLED` | `true` to enforce admin policies. |
| `ADMIN_API_URL` | The admin's origin, e.g. `http://127.0.0.1:3000` or `https://admin.example.internal`. `https` is required unless the admin is on this host. No path. |
| `ADMIN_SERVICE_TOKEN` | The admin's `AFM_PORTAL_SERVICE_TOKEN` (one of them, during a rotation): at least 32 characters. It also enables the two endpoints the admin calls here (§10). |
| `ADMIN_DB_PATH` | **Deprecated**, removed next release. Reads the admin's `admin.sqlite` directly instead of the URL. Exactly one of `ADMIN_API_URL` / `ADMIN_DB_PATH` may be set. |
| `ADMIN_SYNC_TTL_MS` | How often admin data is re-read, in ms. Default `5000`, clamped to `1000`–`60000`. |
| `AUTH_ENABLED` | Must be `true` in integration mode. |
| `FILES_ROOT` | The admin storage **or any folder in it**, wherever it is mounted on this host. The portal works out which admin folder it is (its *position*, §1.1), and portal path `a/b` is admin client path `<position>/a/b`. Nothing in the admin has to match. |
| `FILES_ROOT_ADMIN_PATH` | Optional. The admin folder `FILES_ROOT` stands for (`/`, `/Downloads`, …). Set it when `FILES_ROOT` is not inside the admin storage and you want a folder other than the published Portal folder. It always wins over a marker. An invalid value refuses startup. |
| `RELEASE_PVM` | Legacy mode and admin schema < 5 only. With a v5 admin the release folder is set in Admin → File portal and this is ignored (logged). |

`ADMIN_STORAGE_ROOT` is no longer used; if set, the server logs that it is ignored.

### 1.1 Storage volume (admin schema v5)

The admin stamps its `STORAGE_ROOT` with `.dimension-volume`
(`{"volumeId":"<uuid>","clientPath":"/"}`) and stores the same UUID in
`integration_settings.volume_id`. At startup and on every refresh the portal locates itself
(`lib/admin-db.js` `locate`):

1. It canonicalises `FILES_ROOT` (`realpath`) and reads `.dimension-volume` in it and in every
   folder above it, up to the filesystem root.
2. Markers of this volume that it trusts: the **storage-root marker** (`clientPath "/"`, or none),
   and the **portal folder** marker the admin published (`clientPath` =
   `integration_settings.portal_root_client_path`), which is for hosts that cannot see the storage
   root. Every other marker is skipped: another volume's, or a copy that travelled with its folder.
3. The outermost storage-root marker wins; without one, the nearest published one. The position is
   that marker's `clientPath` plus the folders climbed.

| Trusted marker at or above `FILES_ROOT` | Startup | While running |
|---|---|---|
| Found | integration mode; logs `FILES_ROOT is the admin folder <position>` | serves |
| None (or no UUID in the database) | starts, **mapped**: `FILES_ROOT_ADMIN_PATH`, else the published Portal folder, else `/` (logged once as unverified) | keeps serving under that position |

Example: admin `STORAGE_ROOT=/srv/storage`, portal `FILES_ROOT=/mnt/share/Downloads` (the same storage, mounted elsewhere),
nothing set in the admin. The position is `/Downloads`, so portal path `docs/a.txt` is decided as
`/Downloads/docs/a.txt`, under the policies on `/`, `/Downloads`, `/Downloads/docs` and the file.
A policy on `/docs` does not apply. Several portals may serve different folders of one storage.
Moving `FILES_ROOT` changes which files are served, never which policy governs a file. A v4 admin has no volume id: the portal runs as
before and logs once that the volume is unverified. That compatibility is removed one release
after the v5 rollout.

The marker is a dotfile. Like every hidden entry, it is never listed and every endpoint answers
`404` for it by name. Since this change that includes `/api/download` and `/api/hash`, which
previously served dotfiles by name.

### 1.2 Admin-managed settings (admin schema v5)

`integration_settings`, re-read every `ADMIN_SYNC_TTL_MS`, so no restart is needed. An invalid
value is ignored (logged once) and the next source applies.

| Key | Portal use | Fallback |
|---|---|---|
| `portal_root_client_path` | The published portal folder: its marker is trusted too, for hosts that cannot see the storage root (§1.1) | none: only the storage-root marker is trusted; an invalid value is ignored, which only trusts fewer markers |
| `release_client_path` | Release folder (`/api/releases`, `/release{8,9}/latest`): a full admin client path, used when strictly inside this portal's position and resolved under `FILES_ROOT`; its admin lock protects releases (§3.2). Outside it is ignored (logged once) | none: no dedicated folder, the whole root is scanned |
| `portal.auth_session_minutes` (1–10080) | Session length | `AUTH_SESSION_MINUTES`, then 30 |
| `portal.max_failed_attempts` (1–1000) | Per-username throttle | `AUTH_MAX_FAILED_ATTEMPTS`, then 5 |
| `portal.lockout_minutes` (1–10080) | Throttle lockout | `AUTH_LOCKOUT_MINUTES`, then 15 |

Change record: `openspec/changes/decouple-storage-and-release-paths/`.

**Startup refuses to run** (it never falls back to "everything public") when:

| `ADMIN_INTEGRATION_ENABLED` | `ADMIN_DB_PATH` | Result |
|---|---|---|
| unset | unset | legacy mode (no admin policies, existing behaviour) |
| `false` | unset | legacy mode |
| unset or `false` | set | **refused**: inconsistent |
| `true` | unset | **refused** |
| `true` | missing file, not the admin schema, schema newer than v5, or unreadable | **refused** |
| `true` | v5, but `FILES_ROOT` is not inside the admin's storage volume (§1.1) | integration, **mapped** (`FILES_ROOT_ADMIN_PATH`, else the published Portal folder, else `/`; logged as unverified) |
| `true` | valid | integration mode (also requires `AUTH_ENABLED=true`) |

---

## 2. What the portal reads

Over HTTP, every `0.8 × ADMIN_SYNC_TTL_MS` the portal sends
`GET <ADMIN_API_URL>/api/v1/integration/portal/snapshot` with `Authorization: Bearer` and
`If-None-Match`:
- An unchanged admin answers `304`, and the copy in use is renewed.
- A `200` carries the whole contract document (users, policies, grants, groups, navbar, settings),
  which the admin builds in one read transaction. The document is specified in the admin's
  `docs/CONTRACTS.md` and pinned by `test/contract/portal-v1/*.json`, which are byte-identical in
  both repositories.
- The document carries **no password records**. Users carry a `credentialStamp` instead (§5).

Values are mapped to the same rows the SQLite source reads and validated identically, so the
transport cannot change a decision (`test/admin-http.test.js` checks both sources for equality).

The deprecated SQLite source reads the tables below, every `ADMIN_SYNC_TTL_MS`, in one read
transaction on a connection opened read-only for that read only:

| Admin table | Columns used | Purpose |
|---|---|---|
| `users` | `id`, `username`, `role`, `status`, `password_hash`, `locked_until` | Login and session validity |
| `files` ⋈ `file_access_policies` | `client_path`, `is_directory`, `access_mode`, `is_published`, `is_locked`, `available_from`, `available_until`, `default_level` (v4) | Access decisions |
| `user_file_permissions` | `file_id`, `user_id`, `permission`, `level` (v4) | Per-user grant / deny |
| `user_group_members`, `group_file_permissions` (v4) | `group_id`, `user_id`; `file_id`, `group_id`, `permission`, `level` | Group grants, folded into each member's grant |
| `audit_logs` | latest successful `user.revoke_sessions` per `target_id` | "Revoke sessions" |
| `integration_settings` (v5) | `key`, `value` | Storage volume id, release folder, auth tunables (§1.1, §1.2) |
| `schema_migrations` | `MAX(version)` | Must be ≤ 6 (v3 adds navbar folders, v4 levels and groups, v5 integration settings; v6 changes only the admin's own sessions, which the portal does not read) |

Navbar folders (`portal_nav_folders.client_path`) are full admin client paths. Those strictly
inside this portal's position become portal-relative links; the rest are dropped.

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
| `deny` row for this user or one of their groups (any `access_mode`) | — | hidden |
| `is_locked = 1` | **locked** | rules below |
| `public` | `default_level` | `default_level`, raised by a grant |
| `authenticated` | hidden | `default_level`, raised by a grant |
| `restricted` | hidden | the level granted to the user or their groups on **this** policy's file; none → hidden |

Levels (admin schema v4) are `view` < `download`. A user's grants and their groups' grants on one
file fold into one level: any deny wins, else the highest. Before v4 every grant and every
non-restricted policy meant `download`. Listings, search, navbar, categories and the release list
need `view`; download, hash, ZIP entries and `/release{8,9}/latest` need `download` (`latest` serves
the newest build the caller may download). The policies govern this portal only: the admin
application never enforces them on itself, and its administrators get no bypass here. A visible path below `download` is listed with
`viewOnly: true` and its content endpoints answer `403 VIEW_ONLY`.

### 3.2 Folders and combination

- A policy applies to its path **and everything inside it**, decided by path. `is_directory` is not
  consulted because the admin's own "Set a policy" form never sets it.
- The decision for a path combines the policy on the path, on every parent folder, and on `/`:
  **hidden > locked > the lowest level**. No applicable policy → allow at `download` (ungoverned).
- A grant on a restricted folder covers ungoverned contents. A restricted file inside it with its
  own policy still needs its own grant.
- A `files` row whose policy was deleted is ungoverned; leftover permission rows are ignored.
- `users.role` never changes the outcome (admins get no bypass).
- `RELEASE_PVM` alone no longer requires login in integration mode. Release protection is the
  admin lock on the release folder (`release_client_path` with a v5 admin, else `RELEASE_PVM`),
  or on an OS subfolder such as `el8`: locked → anonymous
  `/api/releases` and `/release{8,9}/latest` answer `401` and the Release page asks for sign-in;
  unlocked → public; hidden → the page shows no releases. Changes apply within `ADMIN_SYNC_TTL_MS`.
  At startup the portal logs a warning while the release folder is open to anonymous callers.
  **Upgrade note:** lock the release folder in the Admin Files Manager *before* upgrading a
  deployment that relied on the old implicit gate, or releases become public.

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
| `GET /api/releases` | Same projection, applied before the limit. Nothing visible while the walk skipped a locked folder → `401 AUTH_REQUIRED`, so the Release page asks for sign-in as Browse does instead of saying "No releases". This matters when no release folder is set and the whole root is scanned. |
| `GET /release{8,9}/latest` | Streams the newest **allowed** build; if none is allowed but some are locked, or a locked folder was skipped → 401; none → 404. |

**Aliases.** Every content endpoint decides the requested path **and** its real on-disk path. An
in-root symlink or junction, and on Windows a trailing dot or space, a `::$DATA` suffix, a case
change or an 8.3 short name, therefore cannot reach a governed file under another name. `..` and
`.` segments are refused, and links that escape `FILES_ROOT` stay refused as before.

### 4.1 In the portal UI

- Locked files and categories show a **Locked** chip and no size or date. Clicking a locked file
  (in Browse, search, autocomplete or Releases) opens the sign-in modal, and the page re-renders in
  place after sign-in. A locked folder opens its sign-in page.
- Locked rows cannot be selected, so they never reach the metadata card or a bulk download.
- Every download link goes through one guard (`public/assets/js/file-actions.js`): a `HEAD` preflight
  first, so a `401` opens sign-in and a `404` refreshes the view. The browser never lands on a
  JSON error page. A ZIP request is preflighted the same way.
- The cached home-page category view is cleared on sign-in and sign-out.

---

## 5. Authentication

- Over HTTP the **admin checks the password**:
  `POST <ADMIN_API_URL>/api/v1/integration/portal/credentials/verify`, sent with the caller's
  address (`X-Portal-Client-IP`, after this portal's trusted-proxy rules) for the admin's
  per-client throttle. The portal holds no password record. If the admin cannot answer, sign-in
  gives `503 SERVER_ERROR`.
- Usernames are trimmed and case-insensitive (any username the admin can store, up to 255
  characters). With the deprecated SQLite source, passwords use the admin's scrypt format
  `"<saltHex>:<hashHex>"` and are checked here.
- Unknown user, wrong password and disabled account get the **same** response. An active
  `locked_until` gives `429 LOCKED_OUT` with `retryAfterMs`. Unreadable admin data gives
  `503 SERVER_ERROR`.
- The portal keeps its own per-username throttle (`AUTH_MAX_FAILED_ATTEMPTS`,
  `AUTH_LOCKOUT_MINUTES`) because it cannot write `failed_login_count`.
- A portal session ends, within the sync interval, when the admin:

| Admin action | Portal reason |
|---|---|
| Disables or deletes the user | `USER_REVOKED` |
| Resets the password | `PASSWORD_CHANGED` (sessions carry the admin's `credentialStamp`; over SQLite, a fingerprint of the stored hash) |
| Uses **Revoke sessions** | `SESSION_REVOKED` (sessions carry their original login time; renewals never extend it) |

---

## 6. Synchronization

All admin changes (users, policies, grants, denies, windows, revocations) take effect within
`ADMIN_SYNC_TTL_MS` (default **5 seconds**) without a restart. A download that is already streaming
is not cut off.

A failed refresh drops the cached copy instead of reusing it. Governed requests answer
`503 POLICY_UNAVAILABLE` until a refresh succeeds. Over HTTP, requests never wait on the network:
a background poller keeps the copy fresh, and a request that finds none fails closed at once.
Failures that drop the copy:
- an unreachable admin, a timeout, or `401`/`5xx`;
- a contract newer than this portal understands;
- a storage-volume mismatch.

Switching a host from the SQLite source to HTTP ends existing portal sessions once, because their
password claim changes form. Users sign in again.

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

---

## 10. Endpoints the admin calls (isolate-app-roots)

They exist only when `ADMIN_SERVICE_TOKEN` is set (otherwise they are unknown paths). Each needs
`Authorization: Bearer <token>`, compared in constant time. Ten failures per minute from one
address answer `429`, even with the right token.

| Endpoint | Answer | Used by |
|---|---|---|
| `GET /api/ops/log?limit=1..1000` | `{ available, entries }`, newest first, from the end of `LOG_FILE` (`available:false` with `LOG_FILE=off`) | Admin → Logs → File portal |
| `POST /api/ops/access-check` `{clientPath:"/a/b", userId:number\|null}` | `{ outcome, policies:[{path, outcome}] }` from the same rules as every request (`access-policy.explain`); `404` unknown user; `503` without a snapshot | Admin "Check access" |

The admin therefore needs neither this portal's disk (its log) nor a copy of its rules (its
decisions).

