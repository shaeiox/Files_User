# API Reference

REST endpoint reference for the `files-server-web` server. All endpoints are handled by `lib/api-router.js` → `handleRequest()`.

## Authentication

| Endpoint | Auth Required |
|----------|---------------|
| `GET /__health` | No |
| `GET /api/health` | No |
| `GET /api/auth/status` | No |
| `POST /api/auth/login` | No |
| `POST /api/auth/logout` | No |
| `GET /api/categories` | No |
| `GET /api/releases` | Conditional |
| `GET /api/search` | No |
| `GET /api/files/*` | No |
| `GET /api/download/*` | Conditional |
| `GET /`, `/index.html`, `/browse/*` | No (SPA) |
| `GET /404`, `/404.html` | No |

**Conditional auth:** When `AUTH_ENABLED=true` and the path targets the `RELEASE_PVM` directory tree, `lib/auth-service.js` → `pathRequiresAuth()` returns true and the request requires a valid session.

---

## `GET /__health`

**Auth:** None

**Parameters:** None

**Response:** `200 OK`
```json
{ "status": "ok", "uptime": 123.45 }
```

**Source:** `lib/api-router.js` → `if (pathname === "/__health" || pathname === "/api/health")`

---

## `GET /api/health`

**Auth:** None

**Parameters:** None

**Response:** `200 OK`
```json
{ "status": "ok", "uptime": 123.45 }
```

**Source:** `lib/api-router.js` → `if (pathname === "/__health" || pathname === "/api/health")`

---

## `GET /api/auth/status`

**Auth:** None

**Parameters:** None

**Response (auth disabled):** `200 OK`
```json
{ "enabled": false, "authenticated": true }
```

**Response (auth enabled, valid session):** `200 OK`
```json
{ "enabled": true, "authenticated": true, "user": { "id": "...", "username": "...", "role": "..." }, "reason": null }
```

**Response (auth enabled, invalid/missing session):** `200 OK`
```json
{ "enabled": true, "authenticated": false, "user": null, "reason": "NO_SESSION" }
```

**Source:** `lib/api-router.js` → `if (pathname === "/api/auth/status")` → `lib/auth-service.js` → `isAuthEnabled()`, `verifySession()`

---

## `POST /api/auth/login`

**Auth:** None (but requires `AUTH_ENABLED=true`)

**Request Body:**
```json
{ "username": "string", "password": "string" }
```

**Response (success):** `200 OK`
```json
{ "ok": true, "user": { "id": "...", "username": "...", "role": "..." }, "expiresIn": 1800 }
```

Also sets `Set-Cookie` header with JWT session token.

**Error Responses:**
- `403 AUTH_DISABLED` — auth is disabled
- `400 MISSING_FIELDS` — username or password missing
- `401 INVALID_CREDENTIALS` — wrong username or password
- `429 LOCKED_OUT` — account locked due to too many failed attempts

**Source:** `lib/api-router.js` → `if (pathname === "/api/auth/login" && req.method === "POST")` → `lib/auth-service.js` → `login()`

---

## `POST /api/auth/logout`

**Auth:** None

**Parameters:** None

**Response:** `200 OK`
```json
{ "ok": true }
```

Also sets `Set-Cookie` header to clear the session cookie.

**Source:** `lib/api-router.js` → `if (pathname === "/api/auth/logout" && req.method === "POST")` → `lib/auth-service.js` → `makeClearCookieHeader()`

---

## `GET /api/categories`

**Auth:** None

**Parameters:** None

**Response:** `200 OK`
```json
[
  {
    "name": "category-name",
    "path": "category-name",
    "type": "directory",
    "fileCount": 42,
    "folderCount": 3,
    "mtime": "2025-01-01T00:00:00.000Z",
    "latestModified": "2025-01-01T00:00:00.000Z"
  }
]
```

**Error Responses:**
- `503 FILES_ROOT_MISSING` — `FILES_ROOT` env var not set
- `503 FILES_ROOT_NOT_FOUND` — path does not exist
- `503 FILES_ROOT_NOT_DIRECTORY` — path is not a directory
- `503 FILES_ROOT_EMPTY` — root directory is empty
- `503 FILES_ROOT_NO_CATEGORIES` — no subdirectories found

**Source:** `lib/api-router.js` → `if (pathname === "/api/categories")` → `lib/files-service.js` → `listCategories()`

---

## `GET /api/releases`

**Auth:** Conditional (when `AUTH_ENABLED=true` and path targets `RELEASE_PVM`)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `5` | Max releases to return (capped at 50) |
| `os` | string | — | OS filter (e.g., "el8", "el9") |

**Response:** `200 OK`
```json
{
  "browsePath": "release/el9",
  "items": [
    {
      "name": "pvm-release-7.1.15-el9-20260817-163318.tgz",
      "path": "release/el9/pvm-release-7.1.15-el9-20260817-163318.tgz",
      "category": "el9",
      "type": "file",
      "size": 12345678,
      "mtime": "2026-08-17T16:33:18.000Z",
      "version": "7.1.15"
    }
  ]
}
```

**Source:** `lib/api-router.js` → `if (pathname === "/api/releases")` → `lib/files-service.js` → `listLatestReleases()`

---

## `GET /api/search`

**Auth:** None

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | — | Search query (case-insensitive substring, min 3 chars) |
| `limit` | number | `200` | Max results (capped at 200) |

**Response:** `200 OK`
```json
{
  "results": [
    { "name": "file.txt", "path": "folder/file.txt", "type": "file" }
  ],
  "scanned": 42,
  "truncated": false
}
```

**Source:** `lib/api-router.js` → `if (pathname === "/api/search")` → `lib/files-service.js` → `searchEntries()`

---

## `GET /api/files/*`

**Auth:** None

**Path Parameters:**
| Parameter | Description |
|-----------|-------------|
| `*` | Relative path within `FILES_ROOT` (e.g., `/api/files/el9/packages`) |

**Response:** `200 OK`
```json
[
  {
    "name": "file.txt",
    "path": "el9/packages/file.txt",
    "type": "file",
    "size": 1234,
    "mtime": "2025-01-01T00:00:00.000Z"
  },
  {
    "name": "subfolder",
    "path": "el9/packages/subfolder",
    "type": "directory",
    "size": 0,
    "mtime": "2025-01-01T00:00:00.000Z"
  }
]
```

**Error Responses:**
- `400 INVALID_PATH` — path contains `..`, `.`, or null bytes
- `403 PATH_TRAVERSAL` — resolved path is outside `FILES_ROOT`
- `403 SYMLINK_TRAVERSAL` — symlink target is outside `FILES_ROOT`
- `404 NOT_FOUND` — path does not exist
- `400 NOT_A_DIRECTORY` — path is a file, not a directory

**Source:** `lib/api-router.js` → `if (pathname.startsWith("/api/files"))` → `lib/files-service.js` → `listPath()`

---

## `GET /api/download/*`

**Auth:** Conditional (when `AUTH_ENABLED=true` and path targets `RELEASE_PVM`)

**Path Parameters:**
| Parameter | Description |
|-----------|-------------|
| `*` | Relative path of file within `FILES_ROOT` (e.g., `/api/download/el9/packages/file.zip`) |

**Response:** `200 OK` with file stream (binary data)

Headers:
- `Content-Type`: based on file extension
- `Content-Length`: file size in bytes
- `Content-Disposition`: `attachment; filename="..."`
- `Cache-Control`: `private, max-age=0, must-revalidate`

**Error Responses:**
- `400 INVALID_PATH` — empty path
- `400 NOT_A_FILE` — path is a directory
- `404 NOT_FOUND` — file does not exist

**Source:** `lib/api-router.js` → `if (pathname.startsWith("/api/download"))` → `lib/files-service.js` → `getDownloadTarget()` → `lib/static-handler.js` → `streamDownload()`

---

## `GET /`, `GET /index.html`, `GET /browse/*`

**Auth:** None

**Response:** `200 OK` with `index.html` content (SPA shell)

**Source:** `lib/api-router.js` → `if (pathname === "/" || pathname === "/index.html" || pathname.startsWith("/browse"))` → `lib/static-handler.js` → `serveSPA()`

---

## `GET /404`, `GET /404.html`

**Auth:** None

**Response:** `404 Not Found` with `404.html` content

**Source:** `lib/api-router.js` → `if (pathname === "/404" || pathname === "/404.html")` → `lib/static-handler.js` → `serve404()`

---

## Error Response Format

All error responses use the `serviceError()` pattern from `lib/files-service.js`:

```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

With HTTP status code set by `err.httpStatus`.

**Source:** `lib/http-utils.js` → `sendServiceError()`
