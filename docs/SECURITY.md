# Security

## Known Security Debt

Read this before deploying anywhere new. Items below are **verified present in the
repository as of 2026-10-03**, not hypotheticals.

### 1. A signing secret is in git history (HIGH)

**Current state (verified 2026-10-16)**

- `.env` is **no longer tracked**: `.gitignore` ignores it and `git ls-files .env` prints nothing.
- It is **still in history**: `git log --all -- .env` lists `c1d6de8`, `692725d` and
  `edef67b`. Those commits hold a populated `AUTH_JWT_SECRET`.

**Why this is severe**

`AUTH_JWT_SECRET` is the entire trust anchor for authentication. Per
[ADR-003](decisions/ADR-003-hand-rolled-jwt.md), sessions are HS256 JWTs signed with this one
key. Anyone with a copy of the repository can mint a valid session for any user and read
every protected route. This needs no vulnerability at all.

**Remediation**

1. **Rotate the secret on every server** (operator step). Never reuse a value that was ever
   committed:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Every existing session ends.
2. **Purge `.env` from history** only if the repository was ever pushed to a remote you do
   not fully trust: `git filter-repo --invert-paths --path .env`, then force-push, and every
   collaborator re-clones. Rotation (step 1) makes the old value useless either way.

**Decision on history purge:** _pending, owner to record here (purged on <date>, or kept
because rotation is sufficient)._

### 2. Rate limiter is bypassable if the port is exposed directly (MEDIUM)

`server.js` hardcodes `HOST = "0.0.0.0"` and `lib/rate-limiter.js` keys on
`x-forwarded-for` **first**:

```javascript
const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
```

This is correct while nginx fronts the process, because nginx sets that header. It becomes
a full bypass if the Node port is reachable directly: a client can send a fresh
`x-forwarded-for` per request and defeat both the per-IP rate limit and nothing else.

**Mitigation:** ensure `PORT` is bound to loopback or firewalled, and that only nginx can
reach it. Verify this on every deployment — it is not currently enforced by anything in the
repository. See [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md).

### 3. `RELEASE_PVM` unset silently makes releases public (MEDIUM)

`pathRequiresAuth()` returns `false` unconditionally when `RELEASE_PVM` is not configured.
There is **no fail-closed behaviour**: forgetting to set it removes release protection with
no error. The startup banner does not currently mention it.

**Mitigation:** verify `RELEASE_PVM` is set in the startup banner on every deploy. See
[ADR-004](decisions/ADR-004-path-scoped-auth.md).

### 4. `role` field exists but is unenforced (LOW, documented)

`data/users.json` carries a `role` field. No authorization logic reads it. Anyone who
authenticates has whatever access `pathRequiresAuth()` grants. Do not build on the
assumption that roles are meaningful.

### 5. Usernames logged in plaintext (LOW)

`lib/logger.js` → `logAccess()` emits usernames in access logs (`login:{username}`,
`fail:{username}`). No redaction. Acceptable for stdout-only logging; a problem if logs are
shipped to a third-party aggregator.

---

## Security Model

The remainder of this document describes the **implemented** security model. For the
reasoning behind each control, see [decisions/](decisions/README.md).

| Control | ADR |
|---------|-----|
| No framework — hand-written request pipeline | [ADR-001](decisions/ADR-001-no-web-framework.md) |
| Hand-rolled HS256 JWT | [ADR-003](decisions/ADR-003-hand-rolled-jwt.md) |
| Path-scoped auth (`RELEASE_PVM` only) | [ADR-004](decisions/ADR-004-path-scoped-auth.md) |
| Three-layer path containment | [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) |
| nginx as second containment layer | [ADR-007](decisions/ADR-007-nginx-static-and-proxy.md) |
| Shared rate limit / lockout / revocation state | [ADR-013](decisions/ADR-013-shared-sqlite-security-state.md) |

---

## Authentication

### Enable/Disable

Authentication is controlled by the `AUTH_ENABLED` environment variable. When disabled (default), all `verifySession()` calls return `{ ok: true, user: { anonymous: true } }` as a no-op, and all routes are accessible without credentials.

**Source:** `lib/auth-service.js` → `isAuthEnabled()`, `verifySession()`

### Login/Session Lifecycle

1. **Login:** `POST /api/auth/login` with `{ username, password }` → `authService.login()`
2. **Credential verification:** `verifyPassword()` checks against stored hash
3. **JWT creation:** `signJwt()` creates HMAC-SHA256 signed token
4. **Cookie creation:** `makeSessionCookieHeader()` sets Set-Cookie header
5. **Session verification:** `verifySession()` extracts and validates JWT from cookie
6. **Logout:** `POST /api/auth/logout` clears session cookie

**Source:** `lib/auth-service.js` → `login()`, `verifyPassword()`, `signJwt()`, `verifySession()`, `makeClearCookieHeader()`

---

## Password Handling

`lib/auth-service.js` → `hashPassword()`:
- Primary: bcrypt with cost factor 12 (`HASH_COST`)
- Fallback: Node.js built-in `crypto.scrypt()` if bcrypt is unavailable

`lib/auth-service.js` → `verifyPassword()`:
- If hash starts with `$2`: uses `bcrypt.compare()`
- If hash starts with `scrypt$`: uses `crypto.scrypt()` with stored parameters
- Constant-time comparison via `safeCompare()`

**Source:** `lib/auth-service.js` → `hashPassword()`, `verifyPassword()`, `safeCompare()`

---

## Session/Cookie Security

**Confirmed cookie attributes** (from `lib/auth-service.js` → `buildSessionCookie()`):

| Attribute | Value |
|-----------|-------|
| Name | `avid_session` |
| HttpOnly | Yes |
| Secure | Only when HTTPS (`isSecureRequest()`) |
| SameSite | Strict |
| Path | `/` |
| Max-Age | Session TTL in seconds |

**Source:** `lib/auth-service.js` → `buildSessionCookie()`, `makeSessionCookieHeader()`

---

## JWT Security

**Confirmed JWT properties** (from `lib/auth-service.js` → `signJwt()`, `verifyJwt()`):

| Property | Value |
|----------|-------|
| Algorithm | HS256 (HMAC-SHA256) |
| Secret source | `AUTH_JWT_SECRET` env var |
| Minimum secret length | 32 characters |
| Expiration | `exp` claim (seconds since epoch) |
| Issued at | `iat` claim |
| Token ID | `jti` claim (random 16-byte hex) |
| Session lifetime | `AUTH_SESSION_MINUTES` (default 30 min) |
| Validation | Algorithm confusion rejected, constant-time signature comparison, exp/iat checked |

**Source:** `lib/auth-service.js` → `signJwt()`, `verifyJwt()`, `getJwtSecret()`

---

## Authentication Bypass Boundaries

| Route | Auth Required | Notes |
|-------|---------------|-------|
| `GET /__health` | No | Health check |
| `GET /api/health` | No | Health check |
| `GET /api/auth/status` | No | Returns auth state |
| `POST /api/auth/login` | No | Requires `AUTH_ENABLED=true` |
| `POST /api/auth/logout` | No | Clears cookie |
| `GET /api/categories` | No | Public listing |
| `GET /api/releases` | Conditional | When `AUTH_ENABLED=true` and path targets `RELEASE_PVM` |
| `GET /api/search` | No | Public search |
| `GET /api/files/*` | No | Public listing |
| `GET /api/download/*` | Conditional | When `AUTH_ENABLED=true` and path targets `RELEASE_PVM` |
| `GET /`, `/index.html`, `/browse/*` | No | SPA serving |
| `GET /404`, `/404.html` | No | Static 404 |

**Conditional auth logic:** `lib/auth-service.js` → `pathRequiresAuth()`:
- Returns `false` if `AUTH_ENABLED` is not truthy
- Returns `false` if `RELEASE_PVM` or `FILES_ROOT` not set
- Computes relative path from `FILES_ROOT` to `RELEASE_PVM`
- Returns `true` if pathname matches protected prefixes under the release directory

**Source:** `lib/api-router.js` → `if (authService.pathRequiresAuth(pathname, projectRoot))`, `lib/auth-service.js` → `pathRequiresAuth()`

---

## Release Protection

`RELEASE_PVM` is an optional environment variable that specifies a dedicated path for PVM (Package Version Management) releases. When `AUTH_ENABLED=true`, routes targeting this path require authentication.

**Protected prefixes** (computed dynamically from `FILES_ROOT` and `RELEASE_PVM`):
- `/api/releases`
- `/release9/latest`, `/release8/latest` (stream release bytes from outside `/api/`)
- `/api/download/{rel}` and `/api/download/{rel}/`
- `/api/files/{rel}` and `/api/files/{rel}/`

Like the other prefixes, the `/releaseN/latest` routes are gated only when `RELEASE_PVM`
resolves **inside** `FILES_ROOT`; if it lives outside, `pathRequiresAuth()` returns `false`
and they are public. Any new route that streams release bytes must be added to the list —
the gate matches pathnames, not the files they resolve to.

This `.env` gate applies in **legacy mode only**. In admin integration mode release protection is
the admin lock on the `RELEASE_PVM` folder, and the server logs a warning at startup while that
folder is open to anonymous callers.

**Source:** `lib/auth-service.js` → `pathRequiresAuth()`, `lib/files-service.js` → `releaseRel()`

### Command-line (HTTP Basic) credentials

Content routes accept `Authorization: Basic` for curl/PowerShell (see `docs/API.md`). Safeguards:
same `login()` path as the modal (per-username lockout, admin status/`locked_until`, fail-closed);
request-scoped, never a cookie; refused over plain HTTP except direct loopback
(`INSECURE_TRANSPORT`, password not checked); the header and password are never logged. The
`WWW-Authenticate` challenge is sent only to clients without `Sec-Fetch-Mode`; a misdetected old
browser would show its native dialog, but access control is unchanged.

---

## Rate Limiting and Lockout

### Rate Limiting

| Property | Value |
|----------|-------|
| Type | Per client IP, shared by every process using one `PORTAL_DATA_DIR` ([ADR-013](decisions/ADR-013-shared-sqlite-security-state.md)) |
| Key | `getClientIp()`: trusted-proxy `X-Forwarded-For`, else `socket.remoteAddress` |
| Window | `RATE_LIMIT_WINDOW_MS` (60 s), aligned so every process counts into the same bucket |
| Max requests | `RATE_LIMIT_MAX_REQUESTS` (120) per window; overshoot at most 20 per process per window |
| Response when blocked | `429` with `{ error: "Too many requests.", code: "RATE_LIMITED" }` |
| Store unavailable | Falls back to per-process counting and logs a warning |
| Not limited | `/livez`, `/readyz`, `/metrics` (answered before the limiter) |

**Source:** `lib/rate-limiter.js` → `checkLimit()`, `lib/state-store.js` → `addRequests()`

### Brute-Force Lockout

| Property | Value |
|----------|-------|
| Type | Per username, shared across processes and kept across restarts (`portal-state.sqlite`) |
| Key | Lowercased username |
| Max failed attempts | `AUTH_MAX_FAILED_ATTEMPTS` (default 5) |
| Lockout duration | `AUTH_LOCKOUT_MINUTES` (default 15 minutes) |
| Response when locked | `429` with `{ error: "Auth failed", code: "LOCKED_OUT", retryAfterMs }` |
| Reset on success | Yes — `clearFailedAttempts()` called after successful login |
| Store unavailable | Sign-in answers `503 SERVER_ERROR` (fail closed): a sign-in that cannot be counted is never accepted |

Logout revocations live in the same store: a logged-out session stays revoked on every process
and after a restart. If the revocation list cannot be read, the session is rejected; if a
sign-out cannot be recorded, the portal answers `503 SERVER_ERROR` and still clears the cookie.

**Source:** `lib/auth/lockout.js`, `lib/auth/session.js` → `verifySession()`, `revokeSession()`, `lib/state-store.js`

---

## Path Traversal / Filesystem Boundaries

**Root containment** (from `lib/files-service.js` → `resolveInsideRoot()`):

1. Path is split into segments via `splitRel()`
2. Segments containing `.`, `..`, or null bytes are rejected → `400 INVALID_PATH`
3. Target is resolved via `path.resolve(root, ...parts)`
4. `path.relative(root, target)` must not start with `..` → `403 PATH_TRAVERSAL`
5. Symlink check via `fsSync.realpathSync()` → `403 SYMLINK_TRAVERSAL`

**Files in root:** Only directories qualify as browsable categories. Files directly in `FILES_ROOT` are ignored.

**Hidden files:** Dotfiles, `index.html`, and `index.php` are filtered from listings.

**Source:** `lib/files-service.js` → `resolveInsideRoot()`, `assertCategoryStructure()`, `isHidden()`, `readVisibleEntries()`

---

## HTTP/Security Headers

### Application Headers

`lib/http-utils.js` → `securityHeaders()`:

| Header | Value |
|--------|-------|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | SAMEORIGIN |
| Referrer-Policy | strict-origin-when-cross-origin |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; |

Applied to: SPA serving, 404 pages, static files, downloads.

**Source:** `lib/http-utils.js` → `securityHeaders()`, `lib/static-handler.js` → `serveSPA()`, `serve404()`, `serveStatic()`, `streamDownload()`

### nginx Headers

`nginx.conf` adds:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | SAMEORIGIN |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |

**Source:** `nginx.conf` → `add_header` directives

---

## Static-File and SPA Boundaries

- `/api/*` routes are handled by the Node.js server
- Static assets (CSS, JS, images) are served by nginx with 30-day cache
- SPA fallback: unknown paths rewrite to `public/index.html`
- Sensitive paths (`/.env`, `/lib/*`, `/data/*`, `/node_modules/*`) are blocked at the application level with `403 Forbidden`

**Source:** `nginx.conf` → `location /api/`, `location ~* \.(?:css|js|png|jpg|jpeg|svg|ico)$`, `location @spa`, `lib/api-router.js` → sensitive path check

---

## Secrets and Configuration

| Variable | Purpose | Source |
|----------|---------|--------|
| `AUTH_JWT_SECRET` | HMAC signing key for JWT | `lib/auth-service.js` → `getJwtSecret()` |
| `AUTH_USERS_FILE` | Path to users database | `lib/auth-service.js` → `getUsersFilePath()` |
| `AUTH_ENABLED` | Enable/disable auth gate | `lib/auth-service.js` → `isAuthEnabled()` |
| `AUTH_SESSION_MINUTES` | Session idle timeout | `lib/auth-service.js` → `getSessionTtlSeconds()` |
| `AUTH_MAX_FAILED_ATTEMPTS` | Brute-force threshold | `lib/auth-service.js` → `getBruteForceConfig()` |
| `AUTH_LOCKOUT_MINUTES` | Lockout duration | `lib/auth-service.js` → `getBruteForceConfig()` |
| `FILES_ROOT` | Filesystem root for file operations | `lib/files-service.js` → `resolveConfiguredRoot()` |
| `RELEASE_PVM` | Protected release directory | `lib/files-service.js` → `resolveReleaseRoot()` |

**Source:** `lib/load-env.js` → `loadEnv()`, `parseEnvText()`

### Handling rules

- **`.env` must never be committed.** It currently is — see
  [Known Security Debt §1](#1-env-is-tracked-in-git-with-a-live-auth_jwt_secret--high).
- Generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
  48 bytes gives 96 hex characters, comfortably over the 32-character minimum.
- Password hashes for `data/users.json` are generated with
  `node lib/hash-password.js <password>` — minimum 6 characters.
- `loadEnv()` uses an **env-first policy**: a value already present in `process.env` is never
  overwritten by `.env`. This means a stale shell export silently wins over your `.env`
  file. If a variable appears to be ignored, check the ambient environment first.

---

## Logging/Security Observability

`lib/logger.js` → `logAccess(method, status, url, extra)`:
- Called after each request from `lib/api-router.js`
- Logs: HTTP method, status code, URL, and optional extra context
- Auth-related extras: `auth:{ok}`, `fail:{username}`, `login:{username}`, `blocked · {reason}`

**Note:** Usernames are logged in plain text in access logs. No redaction is applied.

**Source:** `lib/logger.js` → `logAccess()`, `lib/api-router.js` → `logger.logAccess()`

---

## Resolved Items

- **`data/users.json` schema** — was previously recorded as an unresolved implementation
  detail. **Resolved** from `loadUsers()`, `findUser()`, `saveUsers()` and confirmed
  against the runtime file. Full schema and per-field notes in
  [ARCHITECTURE.md](ARCHITECTURE.md#datausersjson-schema).

---

## Accepted Risks

These are deliberate, documented trade-offs rather than defects. Each is argued in its ADR.

| Risk | Why accepted | ADR |
|------|--------------|-----|
| Per-session revocation is by session id only | Logout revokes its session id (shared store, ADR-013); the admin's *Revoke sessions* ends a user's sessions. Ending every session at once still means rotating `AUTH_JWT_SECRET`. | [ADR-003](decisions/ADR-003-hand-rolled-jwt.md) |
| No `kid` / key ring | Single symmetric secret is sufficient for one server. A `kid` + key ring is the natural first upgrade if rotation becomes frequent. | [ADR-003](decisions/ADR-003-hand-rolled-jwt.md) |
| SQLite security state | Shared across processes on one host (or a shared `PORTAL_DATA_DIR` with working file locks) and kept across restarts. Multi-host without a shared filesystem needs Redis or similar. | [ADR-013](decisions/ADR-013-shared-sqlite-security-state.md) |
| Per-username lockout enables user lockout DoS | A deliberate trade: per-IP-only fails against IP rotation. Combined per-IP **and** per-username thresholds would be the mitigation. | [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md) |
| Three filesystem `stat`/`realpath` calls per request | Containment latency is not on a fast path. This is the cost of the symlink-escape defence. | [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) |
| Coarse path deny-lists in `api-router.js` and nginx | Defence in depth only. `resolveInsideRoot()` is the real control; the deny-lists are prefix matches and would not stop a determined bypass on their own. | [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) |
| `script-src` and `style-src` allow `'unsafe-inline'` | Required by the inline pre-paint theme script in `public/index.html` and by inline styles. Tightening this needs a nonce strategy — see the ADR-006 caveats. | [ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md) |
| Vendored `lenis.min.js` is not integrity-checked | A third-party blob committed to the repo and updated manually. Reconciling it with the `lenis` npm version is the only freshness signal. | [ADR-010](decisions/ADR-010-vendored-lenis-smooth-scroll.md) |
