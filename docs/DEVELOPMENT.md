# Development

## Repository Structure

```
files-server-web/
├── server.js                 # Entry point
├── lib/                      # Backend modules
│   ├── api-router.js         # HTTP router
│   ├── files-service.js      # Filesystem abstraction
│   ├── auth-service.js       # Authentication
│   ├── rate-limiter.js       # Rate limiting
│   ├── http-utils.js         # Response utilities
│   ├── static-handler.js     # Static file serving
│   ├── load-env.js           # Environment loading
│   ├── logger.js             # Logging
│   ├── idle-timer.js         # Client-side session timer
│   └── hash-password.js      # CLI password hashing
├── assets/
│   ├── js/                   # Frontend modules
│   │   ├── router.js         # SPA router
│   │   ├── home.js           # HomePage component
│   │   ├── browse.js         # BrowsePage component
│   │   ├── resource-service.js # API client
│   │   ├── i18n.js           # Internationalization
│   │   ├── theme.js          # Theme toggle
│   │   ├── autocomplete.js   # Search autocomplete
│   │   ├── banner.js         # Banner component
│   │   └── services/
│   │       └── performance-monitor.js
│   ├── css/                  # Stylesheets
│   └── icon/                 # Image assets
├── data/                     # Runtime data (users.json)
├── docs/                     # Project Brain documentation
├── nginx.conf                # Production nginx config
├── package.json              # Dependencies and scripts
└── .env                      # Environment variables (not in git)
```

---

## Local Setup

### Prerequisites

- Node.js runtime
- npm

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
FILES_ROOT=/path/to/your/files
PORT=3000
```

**Source:** `lib/load-env.js` → `loadEnv()`, `parseEnvText()`

### Startup

```bash
npm start
```

Or directly:

```bash
node server.js
```

**Source:** `package.json` → `scripts.start`

---

## Development Workflow

### Backend Changes

Backend modules are in `lib/`. Each module exports a public API via `module.exports`.

- **Adding a route:** Add an `if (pathname === "/api/...")` block in `lib/api-router.js` → `handleRequest()`
- **Adding a file operation:** Add an exported function to `lib/files-service.js`
- **Adding auth logic:** Extend `lib/auth-service.js`

### Frontend Changes

Frontend modules are in `assets/js/`. Each module is an IIFE that attaches to `window`.

- **Adding a page component:** Create `assets/js/myPage.js` (IIFE pattern), add `<script>` tag in `index.html`
- **Adding an API method:** Extend `assets/js/resource-service.js`

### No Build Step

There is no build/bundling step. Frontend files are served directly by the application or nginx.

### Manual Verification

1. Start the server: `npm start`
2. Check health: `curl http://localhost:3000/api/health`
3. Check categories: `curl http://localhost:3000/api/categories`
4. Browse files: `curl http://localhost:3000/api/files/`
5. Check auth status: `curl http://localhost:3000/api/auth/status`

---

## Tests and Validation

**No test suite was identified in the repository.** There are no test files, no test framework configuration, and no test scripts in `package.json`.

### Manual Validation

- Start server and verify health endpoint returns `200 OK`
- Verify `FILES_ROOT` is configured (startup banner shows status)
- Test file listing, download, search endpoints
- Test auth flow (login, status, logout) when `AUTH_ENABLED=true`

---

## Code Conventions

### Observed Conventions

| Convention | Example | Source |
|------------|---------|--------|
| `'use strict'` at module top | All `lib/*.js` files | `lib/api-router.js` |
| JSDoc headers for modules | `@file`, `@module`, `@brief`, `@description` | `lib/files-service.js` |
| IIFE module pattern (frontend) | `const Module = (function () { ... })()` | `assets/js/home.js` |
| `serviceError()` for errors | `serviceError(httpStatus, code, message)` | `lib/files-service.js` |
| `sendJSON()` for responses | `sendJSON(res, status, data)` | `lib/http-utils.js` |
| Environment via `process.env` | `process.env.FILES_ROOT` | `lib/files-service.js` |
| Lowercase module names | `lib/api-router.js`, `lib/files-service.js` | Repository structure |
| camelCase functions | `listCategories()`, `getDownloadTarget()` | `lib/files-service.js` |
| PascalCase frontend modules | `HomePage`, `BrowsePage`, `Router` | `assets/js/*.js` |

### Error Handling Pattern

```javascript
// Create typed error
const err = new Error(message);
err.httpStatus = httpStatus;
err.code = code;
throw err;

// Or use serviceError helper
throw serviceError(404, 'NOT_FOUND', 'Path not found.');
```

**Source:** `lib/files-service.js` → `serviceError()`

### Logging Pattern

```javascript
logger.logAccess(method, status, url, extra);
```

**Source:** `lib/logger.js` → `logAccess()`

---

## Adding/Changing API Behavior

For API endpoint documentation, see [API.md](API.md).

To add a new endpoint:

1. Add route handler in `lib/api-router.js` → `handleRequest()`
2. Implement business logic in the appropriate service module (`lib/files-service.js`, `lib/auth-service.js`)
3. Return response via `sendJSON()` or `sendText()` from `lib/http-utils.js`
4. Update [API.md](API.md) with the new endpoint

**Source:** `lib/api-router.js` → `handleRequest()`

---

## Frontend Development

### Module Loading

Scripts are loaded in order via `<script>` tags in `index.html`. The `router.js` must load last.

**Source:** `index.html` → `<script>` tags

### Component Pattern

```javascript
const MyComponent = (function () {
    'use strict';

    function render(container) {
        // Render logic
    }

    return { render };
})();
```

**Source:** `assets/js/home.js` → `HomePage`

### API Client

Use `ResourceService` for all API calls:

```javascript
const resources = await ResourceService.getResources();
const files = await ResourceService.listFiles(relPath);
await ResourceService.login(username, password);
```

**Source:** `assets/js/resource-service.js`

---

## Debugging / Troubleshooting

### Startup Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FILES_ROOT is not set` | `FILES_ROOT` env var missing | Add to `.env` file |
| `FILES_ROOT path was not found` | Path does not exist | Create the directory |
| `FILES_ROOT is not a directory` | Path is a file | Point to a directory |
| `AUTH_JWT_SECRET must be at least 32 characters` | Secret too short | Generate longer secret |

**Source:** `lib/files-service.js` → `resolveConfiguredRoot()`, `lib/auth-service.js` → `getJwtSecret()`

### Auth Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `AUTH_DISABLED` | `AUTH_ENABLED` not set to `true` | Set `AUTH_ENABLED=true` in `.env` |
| `LOCKED_OUT` | Too many failed attempts | Wait for lockout to expire |
| `INVALID_CREDENTIALS` | Wrong username/password | Verify credentials |

**Source:** `lib/auth-service.js` → `login()`, `checkLockout()`

### nginx/API Routing

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 on API routes | nginx not proxying `/api/` | Check `location /api/` in `nginx.conf` |
| SPA routes not working | Missing `@spa` fallback | Check `location @spa` in `nginx.conf` |
| Static assets 404 | Wrong root path | Check `root` directive in `nginx.conf` |

**Source:** `nginx.conf` → `location /api/`, `location @spa`

---

## Documentation Maintenance

When behavior changes, update the relevant reference document:

| Change | Update |
|--------|--------|
| New API endpoint | [API.md](API.md), [ARCHITECTURE.md](ARCHITECTURE.md) |
| New module/dependency | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Auth/Security change | [SECURITY.md](SECURITY.md), [DATAFLOWS.md](DATAFLOWS.md) |
| New env var | [ARCHITECTURE.md](ARCHITECTURE.md), [DEPLOYMENT.md](DEPLOYMENT.md) |
| Deployment change | [DEPLOYMENT.md](DEPLOYMENT.md) |
| New frontend component | [ARCHITECTURE.md](ARCHITECTURE.md), [DATAFLOWS.md](DATAFLOWS.md) |
| Error handling change | [DEVELOPMENT.md](DEVELOPMENT.md) |
| New extension pattern | [EXTENDING.md](EXTENDING.md) |

JSDoc in source files remains the source of truth for module/function implementation details.
