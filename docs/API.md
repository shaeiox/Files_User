# API Reference

REST endpoint reference for the `files-server-web` server. All endpoints are handled by `lib/api-router.js` → `handleRequest()`.

## Authentication

**Every endpoint below is public unless marked Conditional.** Protection is opt-in via
`pathRequiresAuth()` in `lib/auth-service.js`, which gates only paths under `RELEASE_PVM`.
See [ADR-004](decisions/ADR-004-path-scoped-auth.md) for the model and its fail-open
behaviour when `RELEASE_PVM` is unset.

| Endpoint | Auth Required |
|----------|---------------|
| `GET /__health` | No |
| `GET /api/health` | No |
| `GET /api/auth/status` | No |
| `POST /api/auth/login` | No (but requires `AUTH_ENABLED=true`) |
| `POST /api/auth/logout` | No |
| `GET /api/categories` | No |
| `GET /api/releases` | Conditional |
| `GET /release9/latest`, `GET /release8/latest` | Conditional |
| `GET /api/search` | No |
| `GET /api/files/*` | Conditional |
| `GET /api/download/*` | Conditional |
| `GET /api/hash/*` | Conditional |
| `GET /api/download-zip` | Conditional |
| `GET /`, `/index.html`, `/browse/*`, `/download/release` | No (SPA) |
| `GET /404`, `/404.html` | No |

**Conditional auth:** When `AUTH_ENABLED=true`, `RELEASE_PVM` and `FILES_ROOT` are both set,
and the requested path falls under the `RELEASE_PVM` subtree, `pathRequiresAuth()` returns
true and the request requires a valid session. The check is **string-prefix based and runs
before any filesystem resolution** — path containment does not protect it.

**Integration mode:** `pathRequiresAuth()` is off; the admin lock on the `RELEASE_PVM` folder
decides instead (see `docs/integration-admin-files-manager.md`). `/api/releases` answers
`401 AUTH_REQUIRED` when the release root (or `?os=` subfolder) is locked for the caller and
`200 {items: []}` when it is hidden.

### Command-line clients (HTTP Basic)

`GET`/`HEAD` on `/api/download/*`, `/api/hash/*`, `/api/download-zip` and `/release{8,9}/latest`
also accept `Authorization: Basic`, so `curl -u <username>` prompts for the password in the
terminal and the download proceeds. Basic is used only when there is no valid session cookie,
goes through the same `login()` (lockout, admin account status), is authorized under the same
policy, and never sets a cookie. It is ignored on every other route.

- A `401` on those routes adds `WWW-Authenticate: Basic realm="CloudAvid Downloads", charset="UTF-8"`
  **only when the request has no `Sec-Fetch-Mode` header** (i.e. not a browser), so browsers keep
  the portal's sign-in modal instead of a native dialog.
- For such clients the error body is one line of `text/plain` unless `Accept` includes
  `application/json`: `Invalid username or password.`, `Too many failed sign-in attempts…`, or
  the re-run hint for `AUTH_REQUIRED`.
- `400 INSECURE_TRANSPORT`: Basic credentials over plain HTTP are refused (the password is not
  checked) unless the request is TLS (`X-Forwarded-Proto: https`) or comes directly from loopback
  with no proxy headers.

```bash
curl.exe -fLOJ -u alice "https://files.example.com/release9/latest"
```

```powershell
Invoke-WebRequest "https://files.example.com/release9/latest" -Credential (Get-Credential) -Authentication Basic -OutFile pkg.rpm
```

Limitations: plain curl prompts only for the password (the username is on the command line);
Windows PowerShell 5.1 `Get-Credential` opens a dialog; each command asks again (no stored CLI
session).

**When adding an endpoint, classify its auth requirement explicitly.** Anything not listed as
Conditional is reachable without a session.

## Response Conventions

| Convention | Detail |
|------------|--------|
| Success | JSON via `sendJSON(res, status, data)` — `200` unless noted |
| Error | JSON via `sendServiceError(res, err)`, status from `err.httpStatus` |
| Error body | `{ "error": "<human-readable>", "code": "<MACHINE_READABLE>" }` |
| Rate limited | `429` `{ "error": "Too many requests.", "code": "RATE_LIMITED" }` |
| Headers | `securityHeaders()` applied to SPA, 404, static, and download responses |

---

## Every response: `X-Request-Id`

Every response carries `X-Request-Id`. A well-formed id (`[A-Za-z0-9._-]{1,128}`) sent by a
trusted proxy (`TRUSTED_PROXIES`) is reused; otherwise the portal generates a UUID. The same id is
the `requestId` field of that request's one line in the JSON trace (`LOG_FILE`).

**Source:** `lib/api-router.js` → `requestIdFor()`, `handleRequest()`

---

## `GET /livez`

**Auth:** None. Not rate limited. Never proxied by nginx (probe it on `127.0.0.1:4000`).

**Response:** `200 OK` whenever the process accepts requests. It touches neither the filesystem nor the admin database.
```json
{ "status": "ok" }
```

**Source:** `lib/routes/ops.js` → route `livez`

---

## `GET /readyz`

**Auth:** None. Not rate limited.

**Response:** `200 OK` when `FILES_ROOT` is a readable directory and, in integration mode, the admin
snapshot can be read and validated; `503 Service Unavailable` otherwise. The body names each check
by a fixed identifier only (no paths or error text). `adminPolicy` is `"skipped"` in legacy mode.
```json
{ "status": "ready", "checks": { "filesRoot": "ok", "adminPolicy": "ok" } }
{ "status": "not_ready", "checks": { "filesRoot": "fail", "adminPolicy": "ok" } }
```

**Source:** `lib/routes/ops.js` → route `readyz`

---

## `GET /metrics`

**Auth:** Served only to loopback callers, or to a trusted proxy's own socket with no
`X-Forwarded-For` / `X-Real-IP`. Everyone else gets exactly the response for an unknown path.

**Response:** `200 OK`, `Content-Type: text/plain; version=0.0.4`. Labels are route templates
(for example `/api/download/*`) and status classes, never a path, file name or user.

| Series | Type | Meaning |
|---|---|---|
| `portal_http_requests_total{route,status_class}` | counter | Requests answered |
| `portal_http_request_duration_seconds{route}` | histogram | Time to the response closing |
| `portal_auth_login_failures_total` | counter | Failed sign-ins (modal and CLI) |
| `portal_auth_lockouts_total` | counter | Accounts locked out |
| `portal_downloads_active` | gauge | Open download and archive streams |
| `portal_admin_snapshot_age_seconds` | gauge | Age of the admin snapshot in use (integration mode only) |

Pseudo-routes label requests answered before routing: `(rate-limited)`, `(bad-request)`,
`(preflight)`, `(method-not-allowed)`, `(forbidden)`. Each process exposes its own series.

**Source:** `lib/routes/ops.js` → route `metrics`, `lib/metrics.js`

---

## `GET /__health`

**Auth:** None

**Parameters:** None

**Response:** `200 OK`
```json
{ "status": "ok", "uptime": 123.45 }
```

**Source:** `lib/routes/catalog.js` → route `health`

---

## `GET /api/health`

**Auth:** None

**Parameters:** None

**Response:** `200 OK`
```json
{ "status": "ok", "uptime": 123.45 }
```

**Source:** `lib/routes/catalog.js` → route `health`

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

**Freshness:** counts and dates come from a directory cache and reflect filesystem changes within `CONTENT_INDEX_TTL_MS` (default 30 s). Which entries a caller may see is decided on every request. The same applies to `GET /api/search`.

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

## `GET /release9/latest`, `GET /release8/latest`

**Auth:** Conditional — both paths are in `pathRequiresAuth()`'s protected prefixes, so they
are gated whenever `/api/releases` is (requires `RELEASE_PVM` under `FILES_ROOT`).

Stable CLI URLs that stream the newest artifact from the `el9` / `el8` subfolder of
`RELEASE_PVM`. "Newest" is `listLatestReleases(root, 1, os)`: highest `pvm-release-<version>`
(numeric segment compare), ties broken by most recent `mtime`.

```bash
curl -fLOJ https://<host>/release9/latest   # -J keeps the real filename
```

| Status | Code | When |
|--------|------|------|
| `200` | — | File streamed; `Content-Disposition` names the selected file |
| `401` | `AUTH_REQUIRED` | Auth enabled and no valid session (no bytes streamed) |
| `404` | `NO_RELEASE` | The OS folder is missing or holds no files |
| `503` | `FILES_ROOT_MISSING` | `FILES_ROOT` not configured |

**Source:** `lib/api-router.js` → `latestOs` branch → `listLatestReleases()` → `getDownloadTarget()` → `streamDownload()`

**Check:** `npm run check:releases` (seeds a temp tree, asserts selection, empty folder, and auth).

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

**Auth:** Conditional (when `AUTH_ENABLED=true` and the path targets `RELEASE_PVM`)

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

## `GET /api/hash/*`

**Auth:** Conditional (when `AUTH_ENABLED=true` and path targets `RELEASE_PVM`)

Computes a SHA-256 digest over the file's real bytes. **On demand only** — listing a directory
never hashes anything, and selecting a file in the UI issues no request until the user activates
**Verify SHA-256**.

**Path Parameters:**
| Parameter | Description |
|-----------|-------------|
| `*` | Relative path of file within `FILES_ROOT` (e.g., `/api/hash/el9/packages/file.zip`) |

**Response:** `200 OK`
```json
{
  "algorithm": "sha256",
  "digest": "499bf8a7…",
  "size": 106430464,
  "relPath": "el9/packages/file.zip",
  "fileName": "file.zip"
}
```

The file is streamed through `crypto.createHash('sha256')` and is never read into memory, so peak
memory is one read chunk regardless of file size.

**Error Responses:**
| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_PATH` | 400 | empty or malformed path |
| `NOT_A_FILE` | 400 | path is a directory |
| `PATH_TRAVERSAL` / `SYMLINK_TRAVERSAL` | 403 | resolves outside `FILES_ROOT` |
| `FORBIDDEN_ENTRY` | 403 | hidden-file policy |
| `NOT_FOUND` / `NOT_HASHABLE` | 404 | file does not exist or became unreadable |
| `FILE_TOO_LARGE` | 413 | file exceeds `HASH_MAX_BYTES` |

**Config:** `HASH_MAX_BYTES` — maximum size to hash, in bytes. Default `536870912` (512 MiB).
Raising it increases I/O per verification; this is the calibration knob for the host.

**Source:** `lib/api-router.js` → `if (pathname.startsWith("/api/hash"))` → `lib/hash-service.js` → `hashFile()` → `lib/files-service.js` → `resolveReadableFile()`

**Verification:** `node test/checks/hash-service.check.js` (correctness vs. an independent hash, binary and
empty files, size cap, path policy, and flat memory on a 128 MiB file).

---

## `GET /api/download-zip`

**Auth:** Conditional (when `AUTH_ENABLED=true` and the browsed directory or any requested entry
targets `RELEASE_PVM`)

Streams a classic ZIP archive of a multi-file selection. The archive is produced on the fly and is
never materialised on disk.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `dir` | Relative path of the directory being browsed (e.g. `el9/packages`) |
| `items` | Comma-separated relative paths of the selected files |

Items are percent-encoded per path segment by the client and decoded per item by the server. Commas
are safe as a separator because `encodeURIComponent` encodes them as `%2C`.

**Response:** `200 OK` with a streamed ZIP archive.

Headers:
- `Content-Type`: `application/zip`
- `Content-Disposition`: `attachment; filename="<dir>-<n>-files.zip"`
- No `Content-Length` — the size is not known up front, so the response is chunked.

**Error Responses:**
| Code | Status | Meaning |
|------|--------|---------|
| `NO_ENTRIES` | 400 | empty selection |
| `INVALID_PATH` / `NOT_A_FILE` | 400 | malformed path, or a directory was requested |
| `PATH_TRAVERSAL` / `SYMLINK_TRAVERSAL` | 403 | resolves outside `FILES_ROOT` |
| `FORBIDDEN_ENTRY` | 403 | hidden-file policy |
| `ENTRY_OUTSIDE_DIR` | 403 | an entry is not inside the browsed directory |
| `NOT_FOUND` | 404 | an entry does not exist |
| `DUPLICATE_ENTRY` | 409 | two selections map to one archive entry name |
| `TOO_MANY_ENTRIES` | 413 | more than 65535 entries requested |
| `ARCHIVE_TOO_LARGE` | 413 | total exceeds the 4 GiB classic-ZIP limit |

Classic ZIP only — no ZIP64. Oversized selections are refused rather than truncated, so a corrupt
archive is never produced.

**Source:** `lib/api-router.js` → `if (pathname === "/api/download-zip")` → `lib/archive-service.js` → `createArchive()` → `lib/files-service.js` → `resolveReadableFile()` → `lib/static-handler.js` → `streamArchive()`

**Verification:** `node test/checks/archive-service.check.js` (validates the output against both `unzip`
and .NET `ZipArchive`, checks byte-identical extraction, duplicate entry names, both ceilings, and
the path policy).

---

## `GET /`, `GET /index.html`, `GET /browse/*`, `GET /download/release`

**Auth:** None

**Response:** `200 OK` with `public/index.html` content (SPA shell)

**Note:** `public/browse.html` is **not** served by any route. All `/browse/*` requests resolve to
`public/index.html`; the SPA router then renders `BrowsePage` client-side. The standalone
`public/browse.html` file in the repository root is unrouted. `/download/release` (exact match) renders
`ReleasePage` the same way — see
[ARCHITECTURE.md → Standalone HTML Pages](ARCHITECTURE.md#standalone-html-pages).

**Source:** `lib/api-router.js` → `if (pathname === "/" || pathname === "/index.html" || pathname.startsWith("/browse") || pathname === "/download/release")` → `lib/static-handler.js` → `serveSPA()`

---

## `GET /404`, `GET /404.html`

**Auth:** None

**Response:** `404 Not Found` with `public/404.html` content

**Source:** `lib/api-router.js` → `if (pathname === "/404" || pathname === "/404.html")` → `lib/static-handler.js` → `serve404()`

---

## Blocked Paths

Requests matching these are rejected with `403 Forbidden` **before routing**, independently
of any handler:

| Pattern | Rationale |
|---------|-----------|
| `/.env` | Holds `AUTH_JWT_SECRET` — currently tracked in git, see [SECURITY.md §1](SECURITY.md#1-env-is-tracked-in-git-with-a-live-signing-secret-high) |
| `/lib/*` | Server source code |
| `/data/*` | `users.json` — password hashes |
| `/node_modules/*` | Dependencies |

This is a coarse prefix deny-list — defence in depth only. The real filesystem control is
`resolveInsideRoot()`; see
[ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md).

**Source:** `lib/api-router.js` → `if (pathname === "/.env" || pathname.match(/^\/(lib|data|node_modules)\//))`

---

## Error Response Format

All error responses use the `serviceError()` pattern from `lib/files-service.js`:

```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

With HTTP status code set by `err.httpStatus`.

### Verified Error Codes

| Status | Code | Meaning |
|--------|------|---------|
| `400` | `INVALID_PATH` | Path contains `.`, `..`, or null bytes |
| `400` | `MISSING_FIELDS` | Login body missing username or password |
| `400` | `NOT_A_DIRECTORY` | Path is a file, not a directory |
| `400` | `NOT_A_FILE` | Path is a directory, not a file |
| `401` | `INVALID_CREDENTIALS` | Wrong username or password |
| `400` | `INSECURE_TRANSPORT` | Basic credentials sent over plain HTTP |
| `403` | `AUTH_DISABLED` | Auth is off; login not possible |
| `403` | `PATH_TRAVERSAL` | Resolved path is outside `FILES_ROOT` |
| `403` | `SYMLINK_TRAVERSAL` | Symlink target is outside `FILES_ROOT` |
| `404` | `NOT_FOUND` | Path does not exist |
| `429` | `RATE_LIMITED` | Per-IP request cap exceeded |
| `429` | `LOCKED_OUT` | Brute-force lockout active |
| `503` | `FILES_ROOT_MISSING` | `FILES_ROOT` not set |
| `503` | `FILES_ROOT_NOT_FOUND` | `FILES_ROOT` does not exist |
| `503` | `FILES_ROOT_NOT_DIRECTORY` | `FILES_ROOT` is not a directory |
| `503` | `FILES_ROOT_EMPTY` | `FILES_ROOT` is empty |
| `503` | `FILES_ROOT_NO_CATEGORIES` | No browsable subdirectories |

**Source:** `lib/http-utils.js` → `sendServiceError()`
