# Security

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
- `/api/download/{rel}` and `/api/download/{rel}/`
- `/api/files/{rel}` and `/api/files/{rel}/`

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

---

## Logging/Security Observability

`lib/logger.js` → `logAccess(method, status, url, extra)`:
- Called after each request from `lib/api-router.js`
- Logs: HTTP method, status code, URL, and optional extra context
- Auth-related extras: `auth:{ok}`, `fail:{username}`, `login:{username}`, `blocked · {reason}`

**Note:** Usernames are logged in plain text in access logs. No redaction is applied.

**Source:** `lib/logger.js` → `logAccess()`, `lib/api-router.js` → `logger.logAccess()`

---

## Unresolved Items

- `data/users.json` exact schema — **not directly verified from source.** The schema is inferred from `loadUsers()` which expects `{ users: Array }` with user objects containing `id`, `username`, `passwordHash`, `role`, and `lastLogin` fields. However, this is not confirmed from an actual data file or generation logic in the repository.
