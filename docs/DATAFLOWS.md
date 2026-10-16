# Data Flows

## 1. Application Startup

```
process start
  → server.js
    → lib/load-env.js loadEnv(PROJECT_ROOT)
      → tries require('dotenv').config()
      → fallback: parseEnvText() reads .env file
    → lib/settings.js problems() + lib/admin-db.js validateStartup()
      → any problem: print every one, exit 1 (--check-config: exit 0 when none)
    → lib/logger.js (ANSI color codes, JSON trace)
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
    → X-Request-Id (trusted proxy's, else new); one access line when the response closes
    → URL parsing: new URL(req.url, ...)
    → /livez, /readyz, /metrics (lib/routes/ops.js) — before the rate limiter
    → lib/rate-limiter.js checkLimit(req)
      → if exceeded: sendJSON(429, { error: "Too many requests.", code: "RATE_LIMITED" })
    → CORS preflight (OPTIONS → 204)
    → Method check (GET/HEAD/POST-only-for-auth)
    → Block sensitive paths (/.env, /lib/*, /data/*, /node_modules/*)
    → Sign-in routes (lib/routes/auth.js)
    → lib/request-context.js createRequestContext() (cookie + Basic sessions, gates)
    → Legacy release gate (if pathRequiresAuth())
    → First matching route in lib/routes/index.js ROUTES (see below)
    → Error catch → sendServiceError()
```

**Route dispatch order** (`lib/routes/index.js`):

1. `GET /livez`, `GET /readyz`, `GET /metrics` (loopback only) → `lib/routes/ops.js`
2. `GET /api/auth/status`, `POST /api/auth/login`, `POST /api/auth/logout` → `lib/routes/auth.js`
3. Legacy release gate → `authService.pathRequiresAuth()`
4. `GET /__health` or `GET /api/health` → `sendJSON(200, { status: "ok", uptime: ... })`
5. `GET /api/nav`, `GET /api/categories` → `lib/routes/catalog.js`
6. `GET /api/releases`, `GET /release[89]/latest` → `lib/routes/releases.js`
7. `GET /api/search` → `lib/routes/catalog.js`
8. `GET /api/files/*`, `/api/download/*`, `/api/hash/*`, `/api/download-zip` → `lib/routes/content.js`
9. `GET /404`, SPA routes, static fallback → `lib/routes/static.js`

**Source:** `lib/api-router.js` → `handleRequest()`, `lib/routes/index.js`

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

## 4a. Bulk Selection and Download Flows

The Browse page keeps a selection `Set` of `relPath` strings in `public/assets/js/bulk-download.js`. It is
held outside the row markup on purpose: the list pipeline rewrites `#rows` on every search
keystroke, so a selection stored in the DOM would be destroyed by typing. Navigation resets it
because a new directory is a different item universe.

```
Row click / checkbox
  → BulkDownload.toggle(relPath)
    → row click bails on a[href], button, input, select  (existing targets keep working)
    → selection Set updated; row, checkbox, bulk bar repainted
```

Header select-all iterates the **rendered** rows only, so a filtered-out row is never selected.

### Multi-file download

```
Download Selected
  → for each selected FILE (staggered ~350ms):
      HEAD /api/download/{relPath}          ← zero body bytes; real HTTP status
        200 → transient <a data-file> click  → browser downloads it → row marked "started"
        !200 → row marked "failed"; the file is never started
  → summary reports "N started · M failed · K folders skipped"
```

The browser owns an anchor-triggered transfer, so its completion is not observable from script.
Each file is therefore HEAD-probed first, and reporting distinguishes **started** from **failed** —
it never claims "completed".

### ZIP download

```
GET /api/download-zip?dir={dir}&items={relPath,relPath,...}
  → lib/api-router.js
    → decodeURIComponent per item (client encodes each segment, then the query value)
    → auth: pathRequiresAuth() evaluated against synthetic /api/files/<rel> for dir AND every
            item, because this route carries its target in the query, not the pathname
    → archiveService.createArchive(projectRoot, dirRel, relPaths)
      → for each entry: filesService.resolveReadableFile()  ← same containment + hidden policy
      → ENTRY_OUTSIDE_DIR if an entry is not under the browsed directory
      → ceilings: ≤65535 entries, ≤4 GiB total  → 413 before any byte is written
      → streams: local header → deflate/store data → data descriptor (CRC + sizes)
      → central directory → end-of-central-directory
  → static-handler.js streamArchive()  → chunked, no Content-Length
```

Entry names are relative to the browsed directory, which keeps two files that share a base name in
different folders distinct inside the archive. Sizes and CRC-32 are deferred to a data descriptor
because they are unknown until an entry finishes compressing.

### Checksum verification

```
Verify SHA-256  (explicit user action only — never on listing, never on selection)
  → GET /api/hash/{relPath}
    → filesService.resolveReadableFile()   ← same containment + hidden policy
    → HASH_MAX_BYTES ceiling → 413 FILE_TOO_LARGE
    → crypto.createHash('sha256') fed by fs.createReadStream  (never buffered)
  → card shows the digest, copyable and selectable
```

A malformed response (non-`sha256` algorithm, or a digest that is not 64 hex chars) is treated as a
failure, so a bad response can never render as a successful verification.

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

```
GET /release9/latest | /release8/latest            (auth gate first: protected prefix)
  → filesService.listLatestReleases(projectRoot, 1, "el9" | "el8")
    → items empty → 404 NO_RELEASE (no bytes)
  → filesService.getDownloadTarget(projectRoot, items[0].path)
  → streamDownload(req, res, fileInfo)
```

Releases page (`/download/release`, navbar tab only): `ReleasePage` (`public/assets/js/releases.js`)
calls `ResourceService.getReleases(50, os)` per el8/el9 tab, and builds each row's
`curl -fLO '<origin><downloadHref(path)>'` command from `ResourceService.downloadHref`, so a
file always yields the same command.
Verify SHA-256 (on demand only, never on list or selection) fetches
`ResourceService.hashHref(path)` → `GET /api/hash/*` and renders
`echo '<digest>  <name>' | sha256sum -c -`, where `<name>` is the download URL's last segment
(the file `curl -O` saves). A new selection or tab clears the digest.

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
  → inline pre-paint script sets data-theme from localStorage / prefers-color-scheme
  → public/assets/js/theme.js, i18n.js initialize
  → scripts load in dependency order (see ARCHITECTURE.md)
      - router.js last; vendor/lenis.min.js immediately before smooth-scroll.js
  → public/assets/js/services/performance-monitor.js starts frame-timing
      → classifies device → sets data-perf on <html>
      → public/assets/js/smooth-scroll.js MutationObserver starts/stops Lenis accordingly
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

**Source:** `public/assets/js/router.js` → `navigate()`, `public/assets/js/home.js` → `render()`, `public/assets/js/services/resource-service.js` → API methods, `public/assets/js/services/performance-monitor.js`, `public/assets/js/smooth-scroll.js`

---

## 9. Cross-Cutting Flows

### Theme and Direction Initialization

```
index.html <head>
  → inline script (before first paint)
    → reads localStorage, else prefers-color-scheme
    → document.documentElement.setAttribute('data-theme', theme)   ← prevents FOUC
  → public/assets/js/theme.js
    → resolves the theme, persists toggles back to localStorage
  → public/assets/js/i18n.js
    → document.documentElement.dir = d.dir   (ltr | rtl)
    → document.documentElement.lang = d.lang
    → CSS re-resolves the semantic token layer via [data-theme] and [dir="rtl"]
```

Note the inline script runs **before** `theme.js` and is what prevents a flash of the wrong
theme. `theme.js` alone is not sufficient — it loads deferred, after first paint.

**Source:** `public/index.html` → inline `<script>`, `public/assets/js/theme.js`, `public/assets/js/i18n.js`

### Performance Tier Adaptation

```
public/assets/js/services/performance-monitor.js
  → measures FPS, reads navigator.connection, hardwareConcurrency, battery
  → classifies into TIERS = [HIGH, MEDIUM, LOW, POTATO], clamped to bounds
  → document.documentElement.setAttribute('data-perf', tier.toLowerCase())
  → CSS: performance-modes.css progressively strips effects by tier
  → JS:  smooth-scroll.js observes the attribute (MutationObserver)
        → POTATO → stop() → cancelAnimationFrame + lenis.destroy()
        → otherwise → start()

  → on continued load:
    → 3 consecutive low-FPS samples  → step down one tier
    → 5 consecutive high-FPS samples → step up one tier
    → (asymmetric hysteresis prevents oscillation)
```

**Source:** `public/assets/js/services/performance-monitor.js`, `public/assets/css/performance-modes.css`, `public/assets/js/smooth-scroll.js`

### Logging

```
lib/api-router.js handleRequest()
  → logger.runRequest(record)          ← per-request record (AsyncLocalStorage)
    → route handlers call logAccess()  ← only notes the detail while the request runs
  → res 'close' → logger.finishRequest(record, status)
    → one console line + one JSON trace line: requestId, durationMs, status, url, msg
    → metrics.observeRequest(route template, status, duration)
```

**Source:** `lib/logger.js` → `runRequest()`, `finishRequest()`, `lib/api-router.js` → `handleRequest()`

### Admin Snapshot (integration mode)

```
lib/admin-db.js getSnapshot()
  → copy younger than ADMIN_SYNC_TTL_MS? → return it
  → else: read every table in one transaction (synchronous), validate, cache
    → schedule a background re-read at 0.8 × ADMIN_SYNC_TTL_MS
      → success: fresh copy (requests never wait on SQLite in steady state)
      → failure: drop the copy → the next request reads now and fails closed (503)
```

A snapshot is never served older than `ADMIN_SYNC_TTL_MS`.

**Source:** `lib/admin-db.js` → `getSnapshot()`, `scheduleRefresh()`

### Idle Timer (client-side)

```
public/assets/js/idle-timer.js IdleTimer.start(minutes, onTimeout)
  → monitors mousemove, keydown, scroll, touchstart, pointerdown
  → checkExpiration() every 10 seconds (CHECK_INTERVAL_MS = 10000)
  → on timeout: calls onTimeout callback (typically ResourceService.logout())
```

**Source:** `public/assets/js/idle-timer.js` → `IdleTimer.start()`, `public/assets/js/home.js` → `IdleTimer.start(30, ...)`

### Rate Limiting

```
lib/rate-limiter.js checkLimit(req)
  → keyed by getClientIp() (trusted-proxy X-Forwarded-For, else socket address)
  → RATE_LIMIT_MAX_REQUESTS per aligned RATE_LIMIT_WINDOW_MS window
  → counts locally, flushes to lib/state-store.js every 1 s or 20 requests
    → reads back the total from every process sharing PORTAL_DATA_DIR
  → returns false if exceeded → 429 response
```

State is **shared and persistent** (`portal-state.sqlite`); if the store fails, counting
falls back to this process. See [ADR-013](decisions/ADR-013-shared-sqlite-security-state.md).

**Source:** `lib/rate-limiter.js` → `checkLimit()`, `lib/api-router.js` → `rateLimiter.checkLimit(req)`

### Path Containment (per filesystem request)

```
Any request-derived path
  → splitRel()        → reject "." / ".." / null bytes        → 400 INVALID_PATH
  → path.resolve()    → path.relative() containment check    → 403 PATH_TRAVERSAL
  → fs.realpathSync() → path.relative() containment re-check → 403 SYMLINK_TRAVERSAL
```

See [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md). This is the single
most security-critical flow in the application.

**Source:** `lib/files-service.js` → `resolveInsideRoot()`
