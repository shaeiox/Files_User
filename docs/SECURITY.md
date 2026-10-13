# Security

## Known Security Debt

Read this before deploying anywhere new. Items below are **verified present in the
repository as of 2026-10-03**, not hypotheticals.

### 1. `.env` is tracked in git with a live signing secret (HIGH)

**What was found**

- `.gitignore` contains the entry `#.env` — **commented out** (verified byte-level: the file
  is two lines, `node_modules/` and `#.env`). The intent to ignore `.env` is present but
  inert.
- `.env` is therefore **tracked**: `git ls-files --error-unmatch .env` succeeds.
- It contains a populated `AUTH_JWT_SECRET` (96 hex characters), plus `FILES_ROOT`,
  `RELEASE_PVM`, and `AUTH_ENABLED=true`.
- The file has been committed repeatedly — it appears in the history of at least five
  commits.

**Why this is severe, not cosmetic**

`AUTH_JWT_SECRET` is the **entire trust anchor** for authentication. Per
[ADR-003](decisions/ADR-003-hand-rolled-jwt.md), sessions are stateless HS256 JWTs signed
with this one symmetric key. Anyone holding it can mint an arbitrary valid session token
for any user, with any expiry, and read every route that `pathRequiresAuth()` protects —
including confidential `RELEASE_PVM` releases. There is no second factor behind it, no key
ID, no rotation, and no per-user revocation (see [ADR-003](decisions/ADR-003-hand-rolled-jwt.md)
consequences).

A path traversal bug elsewhere would be one control. This is a pre-authentication bypass
that requires no vulnerability at all.

**Remediation — order matters**

1. **Rotate the secret first.** Generate a new one and update `AUTH_JWT_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   This invalidates every existing session immediately. Do this **before** touching git
   history, so there is no window where the old secret is live *and* public.
2. **Untrack the file and restore the ignore rule:**
   ```bash
   # .gitignore: replace the commented line with a real one
   printf 'node_modules/\n.env\n' > .gitignore
   git rm --cached .env
   git commit -m "chore: untrack .env, restore gitignore rule"
   ```
3. **Add `.env.example`** with the variable names and no values, so onboarding does not
   require reconstructing it from `readme.md`.
4. **Purge the secret from history** if the repository has ever been pushed anywhere other
   than a trusted local remote. `git filter-repo --invert-paths --path .env` is the usual
   tool. This rewrites history and requires a force-push plus every collaborator re-cloning
   — which is why it is a separate, deliberate step rather than something to do casually.
   **If the repository has never left your machine, steps 1–3 are sufficient and step 4 can
   be skipped.**

**Not done here by design.** This is documented rather than fixed because rotating a signing
secret and rewriting git history are irreversible, disruptive operations that need an
explicit decision. Nothing in this change altered the secret, `.gitignore`, or git history.

**Until step 1 is done, treat every historical commit's secret as compromised.**

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
| In-memory rate limit / lockout | [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md) |

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

**Source:** `lib/auth-service.js` → `pathRequiresAuth()`, `lib/files-service.js` → `resolveReleaseRoot()`

---

## Rate Limiting and Lockout

### Rate Limiting

| Property | Value |
|----------|-------|
| Type | In-memory IP-based |
| Key | `x-forwarded-for` header or `socket.remoteAddress` |
| Window | 60 seconds |
| Max requests | 120 per window |
| Response when blocked | `429` with `{ error: "Too many requests.", code: "RATE_LIMITED" }` |
| Cleanup | Every 60 seconds, expired entries removed |

**Source:** `lib/rate-limiter.js` → `checkLimit()`, `RATE_LIMIT_MAX_REQ`, `RATE_LIMIT_WINDOW_MS`

### Brute-Force Lockout

| Property | Value |
|----------|-------|
| Type | In-memory per-username |
| Key | Lowercased username |
| Max failed attempts | `AUTH_MAX_FAILED_ATTEMPTS` (default 5) |
| Lockout duration | `AUTH_LOCKOUT_MINUTES` (default 15 minutes) |
| Response when locked | `429` with `{ error: "Auth failed", code: "LOCKED_OUT", retryAfterMs }` |
| Reset on success | Yes — `clearFailedAttempts()` called after successful login |

**Source:** `lib/auth-service.js` → `checkLockout()`, `recordFailedAttempt()`, `clearFailedAttempts()`, `getBruteForceConfig()`

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
- SPA fallback: unknown paths rewrite to `index.html`
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
| No server-side session revocation | Stateless JWTs keep the portal single-process with no session store. Rotating the secret is the only (all-or-nothing) revocation path. | [ADR-003](decisions/ADR-003-hand-rolled-jwt.md) |
| No `kid` / key ring | Single symmetric secret is sufficient for one server. A `kid` + key ring is the natural first upgrade if rotation becomes frequent. | [ADR-003](decisions/ADR-003-hand-rolled-jwt.md) |
| In-memory rate limit and lockout state | Correct **only** while there is a single Node process. Loses state on restart, which is also a lockout bypass. Must be revisited before scaling out. | [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md) |
| Per-username lockout enables user lockout DoS | A deliberate trade: per-IP-only fails against IP rotation. Combined per-IP **and** per-username thresholds would be the mitigation. | [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md) |
| Three filesystem `stat`/`realpath` calls per request | Containment latency is not on a fast path. This is the cost of the symlink-escape defence. | [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) |
| Coarse path deny-lists in `api-router.js` and nginx | Defence in depth only. `resolveInsideRoot()` is the real control; the deny-lists are prefix matches and would not stop a determined bypass on their own. | [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) |
| `script-src` and `style-src` allow `'unsafe-inline'` | Required by the inline pre-paint theme script in `index.html` and by inline styles. Tightening this needs a nonce strategy — see the ADR-006 caveats. | [ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md) |
| Vendored `lenis.min.js` is not integrity-checked | A third-party blob committed to the repo and updated manually. Reconciling it with the `lenis` npm version is the only freshness signal. | [ADR-010](decisions/ADR-010-vendored-lenis-smooth-scroll.md) |
