# Architecture

## System Overview

`files-server-web` is a single-server file portal built on Node.js (no framework) with a vanilla JS single-page application (SPA) frontend. It serves files from a configurable filesystem directory (`FILES_ROOT`) via a REST API and a client-side rendered UI.

**Source:** `server.js` → `http.createServer()` → `lib/api-router.js` → `handleRequest()`

## Technology Stack

| Layer | Technology | Source |
|-------|-----------|--------|
| Runtime | Node.js (no framework) | `server.js` |
| HTTP | `http` module (built-in) | `server.js` |
| Frontend | Vanilla JS (IIFE modules, no framework) | `assets/js/*.js` |
| Auth | bcrypt + JWT (HMAC-SHA256) + HttpOnly cookies | `lib/auth-service.js` |
| Deployment | nginx reverse proxy + Node.js process | `nginx.conf` |

## Backend Module Structure

| Module | Purpose | Source |
|--------|---------|--------|
| `server.js` | Entry point, HTTP server, boot sequence | `server.js` |
| `lib/api-router.js` | Main HTTP request router and middleware pipeline | `lib/api-router.js` |
| `lib/files-service.js` | Filesystem abstraction: listing, download, search, releases | `lib/files-service.js` |
| `lib/auth-service.js` | Authentication: bcrypt, JWT, cookies, brute-force | `lib/auth-service.js` |
| `lib/rate-limiter.js` | In-memory IP-based rate limiting | `lib/rate-limiter.js` |
| `lib/http-utils.js` | Response formatters, JSON body parser, security headers | `lib/http-utils.js` |
| `lib/static-handler.js` | SPA serving, 404, static files, downloads | `lib/static-handler.js` |
| `lib/load-env.js` | `.env` file loading with dotenv fallback | `lib/load-env.js` |
| `lib/logger.js` | Terminal logging with ANSI colors | `lib/logger.js` |
| `lib/idle-timer.js` | Client-side session auto-lock | `lib/idle-timer.js` |
| `lib/hash-password.js` | CLI utility for password hashing | `lib/hash-password.js` |

## Backend Dependency Relationships

Confirmed from `require()` calls in source:

```
server.js
├── lib/load-env.js
├── lib/logger.js
├── lib/api-router.js
│   ├── lib/rate-limiter.js
│   ├── lib/http-utils.js
│   ├── lib/static-handler.js
│   │   └── lib/http-utils.js
│   ├── lib/files-service.js
│   └── lib/auth-service.js
└── lib/files-service.js (boot-time health check)
```

**Source:** `server.js` → `require("./lib/api-router")`, `lib/api-router.js` → `require("./files-service")`, `require("./auth-service")`, etc.

## HTTP Request Routing

```
HTTP Request
  → server.js (http.createServer)
    → lib/api-router.js handleRequest()
      → lib/rate-limiter.js checkLimit()
      → lib/auth-service.js (auth gate for protected paths)
      → lib/files-service.js (file operations)
      → lib/static-handler.js (SPA, 404, static files)
```

**Source:** `lib/api-router.js` → `handleRequest()` function

## Frontend SPA Structure

| Module | Purpose | Source |
|--------|---------|--------|
| `router.js` | SPA routing, page navigation | `assets/js/router.js` |
| `home.js` | HomePage component, resource cards, search | `assets/js/home.js` |
| `browse.js` | BrowsePage component, file table | `assets/js/browse.js` |
| `resource-service.js` | API client, caching, auth status | `assets/js/resource-service.js` |
| `i18n.js` | Internationalization (en/fa) | `assets/js/i18n.js` |
| `theme.js` | Dark/light theme toggle | `assets/js/theme.js` |
| `autocomplete.js` | Search autocomplete | `assets/js/autocomplete.js` |
| `banner.js` | Banner component | `assets/js/banner.js` |
| `performance-monitor.js` | Performance monitoring | `assets/js/services/performance-monitor.js` |

### Frontend Script Loading Order

Confirmed from `<script>` tags in `index.html`:

```
index.html
├── assets/js/banner.js
├── assets/js/services/resource-service.js
├── assets/js/services/performance-monitor.js
├── assets/js/theme.js
├── assets/js/i18n.js
├── assets/js/autocomplete.js
├── assets/js/home.js
├── assets/js/browse.js
├── lib/idle-timer.js
└── assets/js/router.js
```

## Environment Variables

Complete inventory verified from `process.env` reads and JSDoc `@env` declarations:

| Variable | Required | Default | Used By | Description |
|----------|----------|---------|---------|-------------|
| `FILES_ROOT` | Yes | — | `lib/files-service.js` → `resolveConfiguredRoot()` | Absolute path to file repository |
| `RELEASE_PVM` | No | — | `lib/files-service.js` → `resolveReleaseRoot()` | Dedicated PVM release path |
| `AUTH_ENABLED` | No | `false` | `lib/auth-service.js` → `isAuthEnabled()` | Enable/disable auth gate |
| `AUTH_JWT_SECRET` | If auth on | — | `lib/auth-service.js` → `getJwtSecret()` | HMAC signing secret (min 32 chars) |
| `AUTH_SESSION_MINUTES` | No | `30` | `lib/auth-service.js` → `getSessionTtlSeconds()` | Session idle timeout |
| `AUTH_USERS_FILE` | No | `./data/users.json` | `lib/auth-service.js` → `getUsersFilePath()` | Path to users database |
| `AUTH_MAX_FAILED_ATTEMPTS` | No | `5` | `lib/auth-service.js` → `getBruteForceConfig()` | Brute-force threshold |
| `AUTH_LOCKOUT_MINUTES` | No | `15` | `lib/auth-service.js` → `getBruteForceConfig()` | Lockout duration |
| `PORT` | No | `3000` | `server.js` | HTTP server port |

**Note:** Defaults marked above are confirmed from source code constants in `lib/auth-service.js` (`DEFAULT_SESSION_MINUTES`, `DEFAULT_MAX_ATTEMPTS`, `DEFAULT_LOCKOUT_MINUTES`) and `server.js` (`process.env.PORT || 3000`).

## Extension Points

| Extension | Pattern | Source |
|-----------|---------|--------|
| New API endpoint | Add `if (pathname === ...)` block in `api-router.js` | `lib/api-router.js` → `handleRequest()` |
| New file operation | Add exported function to `files-service.js` | `lib/files-service.js` |
| New auth method | Extend `auth-service.js` | `lib/auth-service.js` |
| New frontend component | Create IIFE module in `assets/js/`, add `<script>` in `index.html` | `assets/js/*.js` |
| New env var | Add to `.env`, document in JSDoc `@env` tag | `lib/load-env.js` |

## Confirmed Facts vs. Assumptions

### Confirmed Facts (verified against source)

- Module dependency graph from `require()` calls
- API endpoints from `lib/api-router.js` route handlers
- Auth flow from `lib/auth-service.js` implementation
- Environment variables from JSDoc `@env` tags and `process.env` reads
- Frontend component structure from `<script>` tags and IIFE exports
- nginx configuration from `nginx.conf`
- Error handling pattern from `serviceError()` usage

### Assumptions (not fully verified)

- Production deployment uses the exact `nginx.conf` in the repo (may be customized per environment)
- No database or external service dependencies beyond filesystem

### Unresolved Implementation Details

- `data/users.json` exact schema — not directly verified from source; treat as an unresolved implementation detail

## Maintenance Mapping

| Change Type | Documents to Update |
|-------------|-------------------|
| New API endpoint | `API.md`, `ARCHITECTURE.md` |
| New module or dependency | `ARCHITECTURE.md` |
| Auth/Security change | `SECURITY.md`, `DATAFLOWS.md` |
| New env var | `ARCHITECTURE.md` (complete inventory), `DEPLOYMENT.md` (if production-relevant) |
| Deployment change | `DEPLOYMENT.md` |
| New frontend component | `ARCHITECTURE.md`, `DATAFLOWS.md` |
| Error handling change | `DEVELOPMENT.md` |
| New extension pattern | `EXTENDING.md` |
