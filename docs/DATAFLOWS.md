# Data Flows

## 1. Application Startup

```
process start
  → server.js
    → lib/load-env.js loadEnv(PROJECT_ROOT)
      → tries require('dotenv').config()
      → fallback: parseEnvText() reads .env file
    → lib/logger.js (ANSI color codes)
    → lib/api-router.js (router module)
    → lib/files-service.js (service module)
    → http.createServer((req, res) => apiRouter.handleRequest(req, res, PROJECT_ROOT, PORT))
    → server.listen(PORT, HOST)
      → filesService.peekRootSync(PROJECT_ROOT) — boot-time health check
      → console.log startup banner
```

**Source:** `server.js` → `loadEnv()`, `http.createServer()`, `server.listen()`

---

## 2. HTTP Request Routing

```
HTTP Request
  → lib/api-router.js handleRequest(req, res, projectRoot, port)
    → lib/rate-limiter.js checkLimit(req)
      → if exceeded: sendJSON(429, { error: "Too many requests.", code: "RATE_LIMITED" })
    → URL parsing: new URL(req.url, ...)
    → CORS preflight (OPTIONS → 204)
    → Method check (GET/HEAD/POST-only-for-auth)
    → Block sensitive paths (/.env, /lib/*, /data/*, /node_modules/*)
    → Auth gate (if pathRequiresAuth())
    → Route handlers (see below)
    → Error catch → sendServiceError()
```

**Route dispatch order:**

1. `GET /__health` or `GET /api/health` → `sendJSON(200, { status: "ok", uptime: ... })`
2. `GET /api/auth/status` → `authService.isAuthEnabled()` + `verifySession()`
3. `POST /api/auth/login` → `authService.login()`
4. `POST /api/auth/logout` → `authService.makeClearCookieHeader()`
5. Auth gate → `authService.pathRequiresAuth()` → `verifySession()`
6. `GET /api/categories` → `filesService.listCategories()`
7. `GET /api/releases` → `filesService.listLatestReleases()`
8. `GET /api/search` → `filesService.searchEntries()`
9. `GET /api/files/*` → `filesService.listPath()`
10. `GET /api/download/*` → `filesService.getDownloadTarget()` + `streamDownload()`
11. `GET /404` or `GET /404.html` → `serve404()`
12. `GET /`, `GET /index.html`, `GET /browse/*` → `serveSPA()` or `serveStatic()`

**Source:** `lib/api-router.js` → `handleRequest()`

---

## 3. File Browsing Flow

```
GET /api/files/{relPath}
  → lib/api-router.js
    → stripPrefix(pathname, "/api/files")
    → filesService.listPath(projectRoot, rel)
      → getRoot(projectRoot)
        → resolveConfiguredRoot() — reads FILES_ROOT env var
        → fs.stat(root) — validates exists + is directory
      → resolveInsideRoot(root, relPath)
        → splitRel() — normalizes path segments
        → rejects ".", "..", null bytes → serviceError(400, "INVALID_PATH")
        → path.resolve(root, ...parts)
        → path.relative(root, target) — rejects if starts with ".."
        → fsSync.realpathSync() — symlink traversal check
      → if root listing: assertCategoryStructure(root)
      → else: fs.stat(target) + readVisibleEntries(target)
      → returns array of { name, path, type, size, mtime }
    → sendJSON(200, entries)
```

**Source:** `lib/api-router.js` → `if (pathname.startsWith("/api/files"))`, `lib/files-service.js` → `listPath()`, `resolveInsideRoot()`

---

## 4. Download Flow

```
GET /api/download/{relPath}
  → lib/api-router.js
    → stripPrefix(pathname, "/api/download")
    → filesService.getDownloadTarget(projectRoot, rel)
      → getRoot(projectRoot)
      → resolveInsideRoot(root, relPath)
      → fs.stat(target) — validates exists + is file
      → returns { absPath, fileName, size, mtime }
    → static-handler.js streamDownload(req, res, fileInfo)
      → securityHeaders(res)
      → res.writeHead(200, { Content-Type, Content-Length, Content-Disposition })
      → fs.createReadStream(fileInfo.absPath).pipe(res)
```

**Auth gate:** When `AUTH_ENABLED=true` and the path targets `RELEASE_PVM`, `pathRequiresAuth()` returns true and the request must include a valid session cookie.

**Source:** `lib/api-router.js` → `if (pathname.startsWith("/api/download"))`, `lib/files-service.js` → `getDownloadTarget()`, `lib/static-handler.js` → `streamDownload()`

---

## 5. Search/Categories/Releases Flows

### Categories

```
GET /api/categories
  → filesService.listCategories(projectRoot)
    → getRoot(projectRoot)
    → assertCategoryStructure(root)
    → for each directory: summarizeTree(full)
      → walk(dir, depth) — recursive, capped at MAX_WALK_DEPTH=12
      → returns { fileCount, folderCount, latestModified }
    → returns sorted array of category descriptors
  → sendJSON(200, categories)
```

**Source:** `lib/files-service.js` → `listCategories()`, `summarizeTree()`

### Releases

```
GET /api/releases?limit={n}&os={os}
  → filesService.listLatestReleases(projectRoot, limit, osFilter)
    → getRoot(projectRoot)
    → resolveReleaseRoot(projectRoot) — reads RELEASE_PVM env var
    → walk(scanTarget, depth) — collects files with version info
    → files.sort(compareVersions) — newest first
    → returns { browsePath, items: files.slice(0, cap) }
  → sendJSON(200, result)
```

**Source:** `lib/files-service.js` → `listLatestReleases()`, `compareVersions()`

### Search

```
GET /api/search?q={query}&limit={n}
  → filesService.searchEntries(projectRoot, query, { limit })
    → getRoot(projectRoot)
    → iterative stack-based walk (not recursion)
    → nameMatches(ent.name, q) — case-insensitive substring
    → returns { results, scanned, truncated }
  → sendJSON(200, data)
```

**Source:** `lib/files-service.js` → `searchEntries()`, `nameMatches()`

---

## 6. Authentication/Session Flow

### Login

```
POST /api/auth/login { username, password }
  → lib/api-router.js
    → authService.isAuthEnabled() — checks AUTH_ENABLED env var
    → readJsonBody(req) — parses JSON body
    → authService.login(projectRoot, username, password)
      → isAuthEnabled() — returns { ok: false, reason: 'AUTH_DISABLED' } if disabled
      → USERNAME_REGEX validation
      → checkLockout(username) — brute-force check
      → loadUsers(projectRoot) — reads users.json
      → findUser(db, username) — case-insensitive lookup
      → verifyPassword(password, hashToCheck)
        → if hash starts with "$2": bcrypt.compare()
        → if hash starts with "scrypt$": crypto.scrypt()
      → if success: clearFailedAttempts(), saveUsers(), signJwt()
      → returns { ok: true, token, user, ttlSec }
    → res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(...))
    → sendJSON(200, { ok: true, user, expiresIn })
```

**Source:** `lib/auth-service.js` → `login()`, `verifyPassword()`, `signJwt()`

### Session Verification

```
GET /api/auth/status (or any protected route)
  → authService.verifySession(req, projectRoot)
    → if !isAuthEnabled(): return { ok: true, user: { anonymous: true } }
    → extractToken(req) — parses Cookie header
    → verifyJwt(token)
      → splits token into header.payload.signature
      → validates header.alg === 'HS256'
      → crypto.createHmac('sha256', secret) — signature verification
      → checks exp (expiration) and iat (issued at) claims
    → loadUsers() + findUser() — verifies user still exists
    → returns { ok: true, payload, user }
```

**Source:** `lib/auth-service.js` → `verifySession()`, `verifyJwt()`, `extractToken()`

### Logout

```
POST /api/auth/logout
  → authService.makeClearCookieHeader()
  → res.setHeader("Set-Cookie", clearCookie)
  → sendJSON(200, { ok: true })
```

**Source:** `lib/auth-service.js` → `makeClearCookieHeader()`, `buildClearCookie()`

---

## 7. Error Flow

```
Service operation fails
  → lib/files-service.js serviceError(httpStatus, code, message)
    → creates Error with .httpStatus and .code properties
  → thrown up to lib/api-router.js handleRequest()
  → catch (err) → sendServiceError(res, err)
    → lib/http-utils.js sendServiceError()
      → sendJSON(res, err.httpStatus || 500, { error: err.message, code: err.code })
```

**Verified error codes:**
- `400 INVALID_PATH` — path contains traversal sequences
- `403 PATH_TRAVERSAL` — resolved path outside FILES_ROOT
- `403 SYMLINK_TRAVERSAL` — symlink target outside FILES_ROOT
- `404 NOT_FOUND` — path does not exist
- `400 NOT_A_DIRECTORY` — path is a file
- `400 NOT_A_FILE` — path is a directory
- `503 FILES_ROOT_MISSING` — FILES_ROOT not set
- `503 FILES_ROOT_NOT_FOUND` — FILES_ROOT does not exist
- `503 FILES_ROOT_NOT_DIRECTORY` — FILES_ROOT is not a directory
- `503 FILES_ROOT_EMPTY` — FILES_ROOT is empty
- `503 FILES_ROOT_NO_CATEGORIES` — no subdirectories in FILES_ROOT

**Source:** `lib/files-service.js` → `serviceError()`, `lib/http-utils.js` → `sendServiceError()`

---

## 8. Frontend Data Flow

```
Browser loads index.html
  → scripts load in order (see ARCHITECTURE.md)
  → router.js init()
    → navigate(currentPath, false)
      → resolveRoute(path) → "home" | "browse" | null
      → HomePage.render(app) or BrowsePage.render(app, path)
        → ResourceService.getResources() — GET /api/categories
        → ResourceService.getReleases() — GET /api/releases
        → ResourceService.search() — GET /api/search
        → ResourceService.listFiles() — GET /api/files/*
        → ResourceService.checkAuthStatus() — GET /api/auth/status
        → ResourceService.login() — POST /api/auth/login
```

**Source:** `assets/js/router.js` → `navigate()`, `assets/js/home.js` → `render()`, `assets/js/resource-service.js` → API methods

---

## 9. Cross-Cutting Flows

### Logging

```
lib/logger.js logAccess(method, status, url, extra)
  → console.log with ANSI colors
  → called from lib/api-router.js after each request
```

**Source:** `lib/logger.js` → `logAccess()`, `lib/api-router.js` → `logger.logAccess()`

### Idle Timer (client-side)

```
lib/idle-timer.js IdleTimer.start(minutes, onTimeout)
  → monitors mousemove, keydown, scroll, touchstart, pointerdown
  → checkExpiration() every 10 seconds
  → on timeout: calls onTimeout callback (typically ResourceService.logout())
```

**Source:** `lib/idle-timer.js` → `IdleTimer.start()`, `assets/js/home.js` → `IdleTimer.start(30, ...)`

### Rate Limiting

```
lib/rate-limiter.js checkLimit(req)
  → keyed by x-forwarded-for or socket.remoteAddress
  → 120 requests per 60-second window per IP
  → returns false if exceeded → 429 response
```

**Source:** `lib/rate-limiter.js` → `checkLimit()`, `lib/api-router.js` → `rateLimiter.checkLimit(req)`
