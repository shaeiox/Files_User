# Deployment

## Deployment Architecture

```
Internet
  → nginx (HTTPS :443)
    ├── /api/* → proxy_pass http://127.0.0.1:3000 (Node.js)
    ├── static assets (CSS, JS, images) → served directly by nginx
    └── SPA fallback → rewrite to index.html
  → Node.js HTTP server (127.0.0.1:3000)
    └── filesystem (FILES_ROOT)
```

**Source:** `nginx.conf` → `location /api/`, `location /`, `location @spa`; `server.js` → `http.createServer()`

---

## Prerequisites

| Requirement | Source |
|-------------|--------|
| Node.js runtime | `server.js` → `require("http")` |
| npm dependencies: `bcrypt`, `dotenv` | `package.json` → `dependencies` |
| `FILES_ROOT` environment variable | `lib/files-service.js` → `resolveConfiguredRoot()` |
| `data/` directory (for users.json) | `lib/auth-service.js` → `getUsersFilePath()` |

**Note:** No specific Node.js version is established by the repository.

---

## Installation

```bash
npm install
```

**Source:** `package.json` → `dependencies`

---

## Environment Configuration

For the complete environment-variable inventory, see [ARCHITECTURE.md](ARCHITECTURE.md#environment-variables).

### Production-Relevant Variables

| Variable | Required | Default | Security-Sensitive | Notes |
|----------|----------|---------|-------------------|-------|
| `FILES_ROOT` | Yes | — | No | Absolute path to file repository |
| `RELEASE_PVM` | No | — | No | Protected release directory |
| `AUTH_ENABLED` | No | `false` | No | Enable auth gate |
| `AUTH_JWT_SECRET` | If auth on | — | **Yes** | HMAC signing key (min 32 chars) |
| `AUTH_SESSION_MINUTES` | No | `30` | No | Session idle timeout |
| `AUTH_USERS_FILE` | No | `./data/users.json` | No | Path to users database |
| `AUTH_MAX_FAILED_ATTEMPTS` | No | `5` | No | Brute-force threshold |
| `AUTH_LOCKOUT_MINUTES` | No | `15` | No | Lockout duration |
| `PORT` | No | `3000` | No | HTTP server port |

**Source:** `lib/auth-service.js` → `getJwtSecret()`, `getSessionTtlSeconds()`, `getBruteForceConfig()`; `server.js` → `process.env.PORT || 3000`

---

## Filesystem / Content Layout

```
FILES_ROOT/
├── category-1/          → browsable category
│   ├── file1.zip
│   └── subfolder/
├── category-2/
│   └── ...
└── ...

RELEASE_PVM/            → protected releases (when AUTH_ENABLED=true)
├── el8/
│   └── pvm-release-7.1.15-el8-*.tgz
└── el9/
    └── pvm-release-7.1.15-el9-*.tgz

data/
└── users.json           → user credentials (schema unresolved)
```

**Source:** `lib/files-service.js` → `listCategories()`, `listLatestReleases()`, `resolveReleaseRoot()`

---

## Production Process

### Startup

```bash
npm start
```

**Source:** `package.json` → `scripts.start`

### Lifecycle

- `SIGINT` (Ctrl+C) triggers graceful shutdown: `server.close()` then `process.exit(0)`
- Boot-time health check: `filesService.peekRootSync()` logs `FILES_ROOT` status

**Source:** `server.js` → `process.on("SIGINT", ...)`, `server.listen()`

### Process Supervision

**Unresolved:** The repository does not define process supervision (systemd, PM2, Docker, Kubernetes). This is outside the repository's documented scope.

---

## nginx

**Source:** `nginx.conf`

### API Proxying

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
}
```

### SPA Fallback

```nginx
location / {
    try_files $uri $uri/ @spa;
}

location @spa {
    rewrite ^ /index.html last;
}
```

### Static File Handling

```nginx
location ~* \.(?:css|js|png|jpg|jpeg|svg|ico)$ {
    root /var/www/html/files-server-web;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Security Headers (nginx)

| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | SAMEORIGIN |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |

### Denied Paths (nginx)

- `location ~ /\.` — hidden files (`.git`, `.env`, `.htaccess`)
- `location ~ \.(php|pl|py|cgi)$` — script execution
- `location ~* \.(backup|bak|sql|env|log)$` — sensitive files

**Note:** The `nginx.conf` in the repository uses `server_name files.cloudavid.com` and specific SSL certificate paths. Production environments may customize these.

---

## Health / Verification

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Returns `{ status: "ok", uptime: ... }` |
| `GET /__health` | Same handler as `/api/health` |
| `GET /api/auth/status` | Returns auth state |

**Source:** `lib/api-router.js` → `if (pathname === "/__health" || pathname === "/api/health")`

---

## Logging

`lib/logger.js` → `logAccess(method, status, url, extra)`:
- Logs to stdout with ANSI colors
- Called after each request from `lib/api-router.js`
- Format: `TIME METHOD STATUS URL EXTRA`

**Note:** No log rotation, centralized logging, retention, monitoring, or alerting is established by the repository.

---

## Production Security Notes

- `AUTH_JWT_SECRET` must be at least 32 characters when auth is enabled
- `AUTH_ENABLED=true` protects `RELEASE_PVM` paths
- nginx terminates TLS and proxies to Node.js over localhost
- Security headers are set by both nginx and the application
- Sensitive paths (`/.env`, `/lib/*`, `/data/*`) are blocked at the application level

**Source:** `lib/auth-service.js` → `getJwtSecret()`, `lib/api-router.js` → sensitive path check, `nginx.conf` → `add_header`, `lib/http-utils.js` → `securityHeaders()`
