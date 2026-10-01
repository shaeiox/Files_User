# Extending

## Purpose and Extension Model

This document explains how to safely extend the `files-server-web` system using its verified extension points and established patterns.

**No formal plugin mechanism was identified in the inspected repository.** Extensions are made by modifying existing modules or adding new modules that follow established patterns. There is no plugin registry, hook system, or external extension API.

---

## Adding or Changing an API Endpoint

### Where Routing Is Handled

All HTTP routing is in `lib/api-router.js` → `handleRequest()`. Routes are registered as `if (pathname === "/api/...")` blocks.

### Pattern

```javascript
// In lib/api-router.js → handleRequest()
if (pathname === "/api/my-endpoint") {
    const result = await myService.myMethod(projectRoot);
    return sendJSON(res, 200, result);
}
```

### Where Domain/File Operations Belong

Business logic belongs in the appropriate service module:
- File operations → `lib/files-service.js`
- Authentication → `lib/auth-service.js`
- HTTP utilities → `lib/http-utils.js`

### How Responses/Errors Are Produced

- Success: `sendJSON(res, status, data)` from `lib/http-utils.js`
- Errors: `throw serviceError(httpStatus, code, message)` from `lib/files-service.js`
- Error formatting: `sendServiceError(res, err)` from `lib/http-utils.js`

### Where Authentication Checks Belong

Auth checks are in `lib/auth-service.js` → `pathRequiresAuth()` and `verifySession()`. Protected routes are gated in `lib/api-router.js` before the route handler.

### Documentation to Update

- [API.md](API.md) — new endpoint
- [ARCHITECTURE.md](ARCHITECTURE.md) — if module structure changes
- [DATAFLOWS.md](DATAFLOWS.md) — if request flow changes
- [SECURITY.md](SECURITY.md) — if auth behavior changes

**Source:** `lib/api-router.js` → `handleRequest()`, `lib/http-utils.js` → `sendJSON()`, `sendServiceError()`

---

## Extending File/Content Behavior

### Verified Responsibilities

All filesystem operations go through `lib/files-service.js`:

| Function | Responsibility |
|----------|----------------|
| `resolveConfiguredRoot()` | Resolves `FILES_ROOT` env var to absolute path |
| `resolveReleaseRoot()` | Resolves `RELEASE_PVM` env var |
| `getRoot()` | Validates root exists and is directory |
| `resolveInsideRoot()` | Path containment and traversal prevention |
| `listPath()` | Directory listing |
| `getDownloadTarget()` | File download resolution |
| `listCategories()` | Category listing with stats |
| `listLatestReleases()` | Release listing with version sort |
| `searchEntries()` | Recursive search |
| `assertCategoryStructure()` | Validates root has categories |

### Path Containment

All file operations use `resolveInsideRoot()` which:
1. Splits path into segments
2. Rejects `.`, `..`, null bytes
3. Resolves against `FILES_ROOT`
4. Verifies result is inside root via `path.relative()`
5. Checks symlinks via `realpathSync()`

**Do not bypass `resolveInsideRoot()` or root-containment mechanisms.**

### Adding a New File Operation

1. Add exported function to `lib/files-service.js`
2. Use `resolveInsideRoot()` for any path-based operation
3. Use `serviceError()` for error responses
4. Add route handler in `lib/api-router.js` → `handleRequest()`

**Source:** `lib/files-service.js` → `resolveInsideRoot()`, `serviceError()`

---

## Adding Authentication-Protected Behavior

### Where Auth Is Implemented

All authentication logic is in `lib/auth-service.js`:

| Function | Responsibility |
|----------|----------------|
| `isAuthEnabled()` | Checks `AUTH_ENABLED` env var |
| `login()` | Authenticates user, returns JWT |
| `verifySession()` | Validates session cookie |
| `verifyJwt()` | Validates JWT signature and claims |
| `pathRequiresAuth()` | Determines if path requires auth |
| `checkLockout()` | Checks brute-force lockout |
| `recordFailedAttempt()` | Records failed login |
| `clearFailedAttempts()` | Clears failed attempts on success |

### Extension Points

- **New protected path:** Modify `pathRequiresAuth()` in `lib/auth-service.js`
- **New auth method:** Extend `login()` and `verifyPassword()` in `lib/auth-service.js`
- **New session behavior:** Extend `verifySession()` and `renewSession()` in `lib/auth-service.js`

### Documentation to Update

Security-sensitive changes require updates to:
- [SECURITY.md](SECURITY.md) — security model changes
- [API.md](API.md) — if endpoint behavior changes
- [DATAFLOWS.md](DATAFLOWS.md) — if auth flow changes

**Note:** No authorization/role framework is implemented beyond the `role` field in user objects. Do not invent role-based access control.

**Source:** `lib/auth-service.js` → `pathRequiresAuth()`, `verifySession()`, `login()`

---

## Extending Frontend Behavior

### Verified Frontend Structure

Frontend modules are in `assets/js/` using the IIFE pattern:

```javascript
const MyModule = (function () {
    'use strict';
    // ...
    return { /* public API */ };
})();
```

### Module Loading

Scripts load in order via `<script>` tags in `index.html`. The router (`assets/js/router.js`) must load last.

### Existing Modules

| Module | Purpose |
|--------|---------|
| `router.js` | SPA routing |
| `home.js` | HomePage component |
| `browse.js` | BrowsePage component |
| `resource-service.js` | API client |
| `i18n.js` | Internationalization |
| `theme.js` | Theme toggle |
| `autocomplete.js` | Search autocomplete |
| `banner.js` | Banner component |

### Adding a Frontend Component

1. Create `assets/js/myComponent.js` using IIFE pattern
2. Add `<script src="/assets/js/myComponent.js"></script>` in `index.html` before `router.js`
3. Register with router if it's a page component

### API Client

Use `ResourceService` from `assets/js/resource-service.js` for all API calls.

**Source:** `index.html` → `<script>` tags, `assets/js/router.js`, `assets/js/resource-service.js`

---

## Adding Configuration

### How Configuration Is Loaded

`lib/load-env.js` → `loadEnv(projectRoot)`:
1. Tries `require('dotenv').config()` first
2. Falls back to built-in `parseEnvText()` parser
3. Existing `process.env` values are never overwritten (env-first policy)

### Access Pattern

```javascript
const value = process.env.MY_VARIABLE || 'default';
```

### Documentation to Update

- Complete env var inventory → [ARCHITECTURE.md](ARCHITECTURE.md)
- Production deployment implications → [DEPLOYMENT.md](DEPLOYMENT.md)

**Source:** `lib/load-env.js` → `loadEnv()`, `parseEnvText()`

---

## Extending Security-Sensitive Behavior

### Security-Sensitive Modules

| Module | Responsibility |
|--------|----------------|
| `lib/auth-service.js` | Authentication, JWT, cookies, brute-force |
| `lib/rate-limiter.js` | IP-based rate limiting |
| `lib/http-utils.js` | Security headers, response formatting |
| `lib/files-service.js` | Path containment, filesystem boundaries |
| `nginx.conf` | Reverse proxy, TLS, security headers |

### Required Documentation Updates

Changes affecting authentication, cookies, JWT validation, rate limiting, filesystem containment, or security headers require updates to [SECURITY.md](SECURITY.md).

**Source:** `lib/auth-service.js`, `lib/rate-limiter.js`, `lib/http-utils.js`, `lib/files-service.js`, `nginx.conf`

---

## Extending Logging / Operational Behavior

### Existing Logging

`lib/logger.js` → `logAccess(method, status, url, extra)`:
- Logs to stdout with ANSI colors
- Called from `lib/api-router.js` after each request

### Extension Point

Add logging calls using `logger.logAccess()` or `logger.info()`/`logger.warn()`/`logger.error()`.

**Note:** No centralized logging, log rotation, metrics, tracing, or monitoring systems are established by the repository.

**Source:** `lib/logger.js` → `logAccess()`, `lib/api-router.js` → `logger.logAccess()`

---

## Adding Dependencies

### Verified Dependency Model

Runtime dependencies are declared in `package.json` → `dependencies`:

```json
{
  "dependencies": {
    "bcrypt": "^6.0.0",
    "dotenv": "^16.4.7"
  }
}
```

### Installation

```bash
npm install
```

### Notes

- No build tooling or bundler is present
- No development dependencies are declared
- No lock file is present in the repository

**Source:** `package.json` → `dependencies`

---

## Documentation Update Matrix

| Change | Documentation to Review |
|--------|------------------------|
| Architecture/module boundary | [ARCHITECTURE.md](ARCHITECTURE.md) |
| API route/response/auth behavior | [API.md](API.md) |
| Request/data flow | [DATAFLOWS.md](DATAFLOWS.md) |
| Security behavior | [SECURITY.md](SECURITY.md) |
| Deployment/configuration | [DEPLOYMENT.md](DEPLOYMENT.md) + [ARCHITECTURE.md](ARCHITECTURE.md) |
| Development workflow/convention | [DEVELOPMENT.md](DEVELOPMENT.md) |
| Extension point | [EXTENDING.md](EXTENDING.md) |

---

## Verification After an Extension

### Application Startup

```bash
npm start
```

Verify startup banner shows `FILES_ROOT is configured`.

### API/Manual Checks

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/categories
curl http://localhost:3000/api/auth/status
```

### Filesystem/Content Checks

```bash
curl http://localhost:3000/api/files/
curl -I http://localhost:3000/api/download/path/to/file
```

### Authentication Checks (when `AUTH_ENABLED=true`)

```bash
curl -X POST http://localhost:3000/api/auth/login -d '{"username":"...","password":"..."}'
curl -b "avid_session=..." http://localhost:3000/api/auth/status
```

### Frontend/Manual Checks

- Load `http://localhost:3000/` in browser
- Verify SPA renders and API calls succeed
- Test browse navigation and file downloads

### Documentation Consistency

- Verify [API.md](API.md) matches actual endpoint behavior
- Verify [ARCHITECTURE.md](ARCHITECTURE.md) matches module structure
- Verify [SECURITY.md](SECURITY.md) matches security behavior

**Note:** No repository test suite or build pipeline was identified. Manual verification is the only validation approach.

---

## Non-Extension Boundaries

The following are **not** established extension mechanisms:

- **No formal plugin system** — no plugin registry, hook system, or extension API was identified
- **No build/plugin registry** — no build tooling or bundler is present
- **No external extension API** — no mechanism for external code to register extensions at runtime

Extensions require modifying existing source files or adding new files that follow established patterns.
