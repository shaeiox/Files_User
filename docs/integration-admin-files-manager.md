# Integration: CloudAvid File Portal ↔ Dimension Files Manager

Discovery report. **No code written.** This records what exists in both systems,
how the two can act as one, the exact enforcement design, and the decisions still
open before implementation.

- Portal (consumer): `C:\PRO\files-server-web` — Node 24, no framework, hand-rolled HTTP.
- Admin (owner): `D:\Projects\Admin-Files-Manager-fixed` — Node 24, `node:sqlite`.

---

## 1. What each side actually is (verified)

### Admin (owner of identity + policy)
- DB: `D:\Projects\Admin-Files-Manager-fixed\data\admin.sqlite` (`journal_mode=delete`, single writer, **not** WAL).
- Schema v2 (`src/db/schema.js`): `users`, `sessions`, `audit_logs`, `files`,
  `file_access_policies`, `user_file_permissions`.
- `STORAGE_ROOT=C:/Users/eleven/` (`.env`), data dir `<repo>/data`.
- Live rows:
  - `users`: `id=1 admin/admin/active`, `id=2 erfan/user/active`.
  - `files`: one row — `id=1 client_path=/CodeGeeXProjects is_directory=0`.
  - `file_access_policies`: one row — `access_mode=authenticated, is_published=0, is_locked=1`, window null.
  - `user_file_permissions`: empty.
- **The admin enforces nothing.** ADR-009 §4 and the file-access-policy spec
  ("This Change Enforces Nothing Against A Real Download") state that
  `fs.routes.js` read endpoints are deliberately not wired to policies. The
  admin is a **write-only data model** today. All enforcement therefore lands in
  the portal. Admin stays the sole writer of `admin.sqlite`.

## 2. What the portal already does

- `lib/auth-service.js` — HS256 JWT in an `avid_session` cookie, bcrypt/scrypt
  `verifyPassword()`, in-memory lockout, `pathRequiresAuth()` (a **synchronous
  string-prefix** check over the `RELEASE_PVM` subtree only).
- `lib/api-router.js` — one gate at lines 87–95 calls `pathRequiresAuth(pathname)`
  before handlers; `/api/download-zip` re-implements it against synthetic
  `/api/files/<rel>` pathnames (lines 172–189).
- `lib/files-service.js` — `resolveInsideRoot()` already enforces the `FILES_ROOT`
  boundary **and** symlink escape (requirement 4 is satisfied here). Every
  file-serving route funnels through `listPath`, `getDownloadTarget`,
  `resolveReadableFile`, `searchEntries`, or `listLatestReleases`.
- Portal `AUTH_ENABLED=false` and **`data/users.json` does not exist**.
  (`verifySession()` calls an undefined `loadUsersSync` at line 656; the
  ReferenceError is swallowed by `catch {}`, so the "USER_REVOKED" check is dead
  code — a latent bug, not blocking.)

## 3. How the two become one

**Shared read-only SQLite.** Portal opens `admin.sqlite` with
`new DatabaseSync(path, { readOnly: true })` (built into Node 24 — no dependency).
Admin keeps writing; the portal only reads `users`, `files`,
`file_access_policies`, `user_file_permissions`. No admin code changes.

Path roots:

| Value | Source | Value (dev) |
|---|---|---|
| Admin storage root | admin `.env` `STORAGE_ROOT` | `C:\Users\eleven` |
| Portal root | portal `.env` `FILES_ROOT` | `C:\Users\eleven\Downloads` |

Mapping (portal rel → admin `client_path`):

```
prefix          = path.relative(ADMIN_STORAGE_ROOT, FILES_ROOT)   // "Downloads"
adminClientPath = "/" + [prefix, ...splitRel(relPath)].filter(Boolean).join("/")
```

- `relPath ""` → `/Downloads`
- `relPath "release/el9/x.tgz"` → `/Downloads/release/el9/x.tgz`
- If `FILES_ROOT` is **not inside** `ADMIN_STORAGE_ROOT` → mapping is impossible →
  **configuration error, fail closed** (do not fall back to an unmapped read).

**Reachability gap (real):** the one locked row today is `/CodeGeeXProjects`, a
sibling of `C:\Users\eleven\Downloads`. Through the portal it maps to nothing, so
that lock cannot be enforced until either `FILES_ROOT` becomes `C:\Users\eleven`
or the admin policy is set on `/Downloads/...`. This is a config/expectation
decision, not a bug in the bridge.

## 3a. Admin password format (exact)

`src/utils/crypto.js` writes `"<saltHex>:<hashHex>"` using
`crypto.scryptSync(password, salt, 64)` where **`salt` is the 32-char hex string
used as a UTF-8 string**, not the decoded bytes; `N=16384, r=8, p=1` (Node
defaults), `keylen=64`.

Verification recipe the portal must use:

```js
const [salt, hashHex] = String(stored).split(':');        // admin format, no '$'
const derived = crypto.scryptSync(password, salt, 64);    // salt as STRING
crypto.timingSafeEqual(derived, Buffer.from(hashHex, 'hex'))
```

**Trap:** the portal's existing `scrypt$N$salt$hash` branch decodes the salt with
`Buffer.from(saltHex, 'hex')`, which is *wrong* for admin hashes. The admin format
needs its own branch/adapter. `verifyPassword()` must gain an admin-format path
and keep the existing bcrypt/scrypt paths for `AUTH_USERS_FILE` compatibility.

User lookup: `SELECT ... WHERE username = ? COLLATE NOCASE`, require
`status='active'`, honour `locked_until` **read-only**. The portal cannot
increment `failed_login_count` in a read-only DB — the portal keeps its own
in-memory lockout (already present). Portal JWT `sub` = admin `users.id`.

## 4. Policy semantics (as defined by the admin spec)

Field intent, quoted from `openspec/.../authorization/file-access-policy/spec.md`:

- `access_mode` ∈ `public` | `authenticated` | `restricted`; a new policy
  **defaults to `restricted`** (fail-safe).
- `is_published` / `is_locked` are independent. `is_locked` is the force-auth
  floor. `is_published=0` must not be served publicly.
- `available_from`/`available_until`: optional window; outside it the file is not
  "available".
- `user_file_permissions`: one row per `(file_id, user_id)`, `grant` or `deny`;
  absence = deny. **Per-file, no directory inheritance.**

Proposed portal decision (to confirm — see §9):

```
effectiveRequirement(clientPath, user):
  if mapping impossible          -> DENY (fail closed)
  policy = lookup(clientPath)    // admin JOIN, exact/NOCASE
  if policy is NULL              -> PUBLIC (no row = never governed)
  if now < available_from or now > available_until (when set) -> DENY
  if is_published == 0           -> DENY            # confirm: or anonymous-only?
  floor = is_locked ? AUTHENTICATED : PUBLIC        # locked raises the floor
  base  = access_mode
  need  = max(floor, base)      # public < authenticated < restricted
  if need == PUBLIC              -> ALLOW
  if user is anonymous           -> AUTH_CHALLENGE (401)
  if access_mode == restricted:
       perm = user_file_permissions[(file_id, user.id)]
       if perm == 'grant' (and not 'deny') -> ALLOW else DENY
  # access_mode public/authenticated with a valid active user
  -> ALLOW
```

Notes:
- `is_locked` **raises** the floor, never lowers it. `locked + restricted` still
  requires an explicit grant.
- A `deny` row beats `grant`, and absence = deny, for `restricted`.
- On Windows, path comparison must be separator-normalized **and**
  case-insensitive (`win32`).
- Availability window applies to everyone (no portal admin role exists).

## 5. Where enforcement must attach (all file-serving routes)

The current single prefix gate is insufficient: it matches **URL pathnames
before resolution**, and the new model needs the **resolved `relPath`**. The gate
becomes a per-route call `authorize(projectRoot, relPath, session)` (kept in one
module so there is one definition of the rule — mirroring the existing
`/api/download-zip` re-check, which already exists because pathnames lose the
target).

| Route | relPath source | Action |
|---|---|---|
| `GET /api/categories` | each top-level name | filter/hide governed entries |
| `GET /api/releases` | each item `.path` | filter item list |
| `GET /release8/latest`, `/release9/latest` | resolved `items[0].path` | authorize before `streamDownload` |
| `GET /api/search` | each result `.path` | filter results |
| `GET /api/files/{rel}` | `rel` (+ children) | authorize dir; decide child visibility |
| `GET /api/download/{rel}` | `rel` | authorize before stream |
| `GET /api/hash/{rel}` | `rel` | authorize (hash leaks content identity) |
| `GET /api/download-zip` | `dir` + every `items[]` | authorize every entry (existing pattern) |

`resolveInsideRoot()` remains the **only** path-resolution boundary; policy
lookup is an authorization layer on the relative path and must never bypass it.

## 6. Fail-closed matrix

| Condition | Result |
|---|---|
| `ADMIN_DB_PATH` unset / file missing / unreadable | deny gated paths, log server-side, never leak DB detail; **public (no-row) content still serves** |
| `admin.sqlite` schema version > known | refuse to read → deny governed, log |
| mapping impossible (FILES_ROOT outside STORAGE_ROOT) | config error → deny |
| policy row unreadable / malformed enum | DENY (treat as `restricted`) |
| `access_mode` unknown value | DENY |
| authenticated user id not found / not active | treat as anonymous |
| DB busy (rollback-journal single writer) | short retry, then fail closed for that request; optional short-TTL cache of `listPolicies()` |

Never leak DB paths, SQL, or schema to clients — log server-side, return generic
`403`/`401`.

## 6a. Concurrency

`admin.sqlite` is rollback-journal (not WAL), single writer. Portal reads open
`readOnly:true` with a busy timeout and no long transactions; `listPolicies()` is
tiny and cacheable with a short TTL (seconds) or mtime check on the DB file.

## 7. Fail-closed is not fail-silent

Requirement 1: any unreadable/invalid admin DB must (a) deny gated files,
(b) log server-side with the reason, (c) never expose DB internals to the client.
`AUTH_ENABLED=false` currently makes the whole auth layer a no-op — the new
policy layer must **not** inherit that off-switch for governed files. Decide
whether admin-gating has its own enable flag or is always-on when the DB is
configured.

## 8. Pre-existing observations (not caused by this work)

- `lib/files-service.js` defines `listPath` and `getDownloadTarget` **twice**
  (lines 170/520 and 236/610). The later declarations win; behaviour is
  identical, so it is harmless, but it is dead code worth a cleanup.
- `lib/auth-service.js:656` calls undefined `loadUsersSync()`; the resulting
  `ReferenceError` is swallowed, so `USER_REVOKED` never fires.
- `docs/SECURITY.md` records `.env` committed with a live `AUTH_JWT_SECRET`.

---

## 9. Decisions (settled)

1. **`is_published = 0` → deny everyone.** Unpublished files are not served
   through the portal at all, including to authenticated users (draft state).
   `is_locked` is still the auth floor; `is_published=0` is a hard deny that
   short-circuits before the floor is evaluated.
2. **Governed entries are hidden until authorized.** Listings, categories and
   search filter out any path the current caller is not authorized to fetch. A
   path with no policy row is public and stays visible. The filter is per-path
   (no inheritance), matching the admin model — only the exact governed path is
   hidden, not its parent or siblings.
3. **Roots unchanged:** `FILES_ROOT=C:\Users\eleven\Downloads`, admin
   `STORAGE_ROOT=C:\Users\eleven`. Admin client paths map under `/Downloads/...`.
   The existing `/CodeGeeXProjects` lock stays unreachable through the portal
   until an admin policy is set on a path under `/Downloads`.
4. **Always-on when the admin DB is configured** — no separate off-switch, so a
   forgotten flag cannot silently expose governed files. If no admin DB is
   configured, behaviour is unchanged (all content public); if a DB is
   configured but unreadable, governed lookups fail closed (§6).

Ready to implement portal-side only: a read-only `admin.sqlite` client, the admin
password adapter (§3a), the generalized `authorize()` gate + listing filter (§5),
config/env additions, and tests for the fail-closed matrix (§6).

## 10. Implementation (done) — configuration boundary + module map

### 10a. How intentional legacy differs from a misconfigured integration

Refines §9.4. `ADMIN_INTEGRATION_ENABLED` is **not** an enforcement off-switch;
it is an intent declaration that pairs with the resource. Enforcement can never
be silently off while a DB is configured:

| `ADMIN_INTEGRATION_ENABLED` | `ADMIN_DB_PATH` | Result |
|---|---|---|
| unset | unset | **legacy** (unchanged public behaviour) |
| `false` | unset | legacy |
| unset | set | **startup failure** (resource without intent) |
| `false` | set | **startup failure** (inconsistent) |
| `true` | unset/blank | **startup failure** (intent without resource) |
| `true` | set but invalid | **startup failure** |

`true` + valid also requires `AUTH_ENABLED=true` (else governed files could never
be opened) and an `ADMIN_STORAGE_ROOT` that contains `FILES_ROOT`. The only silent
path is *both unset* — exactly the intentional-legacy case. `server.js` prints the
problems and exits non-zero; it never starts in a partial state.

`ADMIN_STORAGE_ROOT` is a portal-side value (the admin's `STORAGE_ROOT`), so the
portal never reads the admin project's `.env` — the two stay decoupled.

### 10b. Modules

- `lib/admin-db.js` (new) — config resolution + startup validation, read-only
  `node:sqlite` handle, portal-relPath ⇄ admin-client-path mapping, short-TTL
  policy/grant snapshot, user lookups.
- `lib/access-policy.js` (new) — the single `authorize(relPath, session)` rule and
  `filterVisible(entries, session)`.
- `lib/auth-service.js` — admin password-format branch in `verifyPassword()`,
  admin-backed `login()`, live user-status check in `verifySession()` (closes the
  dead `loadUsersSync()` revocation gap for admin sessions), `USERNAME_REGEX`
  `0-0`→`0-9` typo fixed.
- `lib/api-router.js` — `gateRel()` on `/api/files`, `/api/download`, `/api/hash`,
  `/api/download-zip`; `filterVisible()` on `/api/categories`, `/api/releases`,
  `/release8|9/latest`, `/api/search`.
- `server.js` — startup gate + banner line.
- `test/access-policy.test.js` (new, `npm test`) — 27 assert-based checks over the
  config matrix and the full decision table.

### 10c. Category counts

`/api/categories` previously folded a hidden governed child into its parent's
`fileCount`, leaking existence through aggregate counts. `summarizeTree()` now
takes an authorization predicate (threaded from `listCategories()` via
`access-policy.visiblePredicate()`), so a governed entry — or a whole governed
category — is neither counted nor walked. Legacy mode passes no predicate and
counts everything as before.

