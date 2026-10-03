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
| npm dependencies: `bcrypt`, `dotenv`, `lenis` | `package.json` → `dependencies` |
| `FILES_ROOT` environment variable | `lib/files-service.js` → `resolveConfiguredRoot()` |
| `RELEASE_PVM` environment variable (if release protection is wanted) | `lib/files-service.js` → `resolveReleaseRoot()` |
| `data/` directory and `users.json` (only if `AUTH_ENABLED=true`) | `lib/auth-service.js` → `getUsersFilePath()` |
| nginx | `nginx.conf` |
| **Something that supervises the Node process** — not provided, see below | — |

**Note:** No specific Node.js version is established by the repository.

---

## Port Mismatch: Reconcile Before Deploying

**The shipped configuration is internally inconsistent:**

| Source | Value |
|--------|-------|
| `server.js` → `process.env.PORT \|\| 4000` | defaults to **4000** |
| `nginx.conf` → `proxy_pass http://127.0.0.1:3000` | targets **3000** |
| `ARCHITECTURE.md` env table | documented as `3000` — **incorrect**, now corrected |

**Consequence:** with no `PORT` set in the environment, Node listens on 4000 and every
`/api/` request through nginx returns **502 Bad Gateway**.

**Fix — pick one:**

```bash
# Option A: match nginx (least churn — nginx.conf is already written for 3000)
PORT=3000

# Option B: match the code default
# edit nginx.conf: proxy_pass http://127.0.0.1:4000;
```

Whichever you choose, make `PORT` explicit in the environment rather than relying on the
default, so the two cannot drift again. See also
[ADR-007](decisions/ADR-007-nginx-static-and-proxy.md).

### Binding

`server.js` hardcodes `HOST = "0.0.0.0"` — **not configurable via env**. The process
listens on all interfaces regardless of intent.

This matters for security, not just tidiness. `lib/rate-limiter.js` keys on
`x-forwarded-for` **before** `socket.remoteAddress`, which is safe only because nginx sets
that header. If the Node port is reachable directly, a client can spoof a fresh IP per
request and bypass rate limiting entirely.

**Ensure `PORT` is bound to loopback, firewalled, or otherwise unreachable except via
nginx.** Nothing in the repository enforces this.

---

## Pre-Deploy Checklist

- [ ] `PORT` set explicitly, and matching `nginx.conf`'s `proxy_pass`
- [ ] **`.env` is not deployed from git** — see [SECURITY.md → Known Security Debt §1](SECURITY.md#1-env-is-tracked-in-git-with-a-live-signing-secret-high)
- [ ] `AUTH_JWT_SECRET` is a fresh, securely generated value (32+ chars), **not** the one in git history
- [ ] `FILES_ROOT` set and pointing at the real artifact tree; startup banner confirms `FILES_ROOT is configured`
- [ ] `RELEASE_PVM` set if release protection is required — **it silently does nothing if unset**
- [ ] `AUTH_ENABLED` set to the intended value
- [ ] `data/users.json` present with valid bcrypt hashes if auth is on
- [ ] `nginx.conf` `server_name` and SSL certificate paths updated for this environment
- [ ] Static asset regex includes every asset class in use — `woff2` and `webp` are currently **missing** from
      `~* \.(?:css|js|png|jpg|jpeg|svg|ico)$`, so fonts/icons fall through to `location /` and miss the 30-day immutable cache
- [ ] Process supervision configured (not provided by this repository)
- [ ] Node port not directly reachable — only via nginx

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
| `PORT` | No | `4000` | No | HTTP server port — **must match nginx `proxy_pass`**, see [Port Mismatch](#%EF%B8%8F-port-mismatch--reconcile-before-deploying) |

**Source:** `lib/auth-service.js` → `getJwtSecret()`, `getSessionTtlSeconds()`, `getBruteForceConfig()`; `server.js` → `process.env.PORT || 4000`

### Environment Notes

- **`loadEnv()` is env-first.** An existing `process.env` value is never overwritten by
  `.env`. In production, prefer real environment variables (systemd `Environment=`,
  Docker `-e`, etc.) over shipping a `.env` file. If a value appears to be ignored, check
  the ambient environment first.
- **`AUTH_JWT_SECRET` is the entire trust anchor.** Sessions are stateless HS256 JWTs signed
  with this one symmetric key — see [ADR-003](decisions/ADR-003-hand-rolled-jwt.md). It must
  be generated securely and never committed. It currently is; see
  [SECURITY.md §1](SECURITY.md#1-env-is-tracked-in-git-with-a-live-signing-secret-high).

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

RELEASE_PVM/            → protected releases (when AUTH_ENABLED=true AND RELEASE_PVM is set)
├── el8/
│   └── pvm-release-7.1.15-el8-*.tgz
└── el9/
    └── pvm-release-7.1.15-el9-*.tgz

data/
└── users.json           → user credentials
    { "users": [ { "id", "username", "passwordHash", "role", "createdAt", "lastLogin" } ] }
```

Only directories directly under `FILES_ROOT` are browsable categories — files there are
ignored, and dotfiles / `index.html` / `index.php` are hidden from listings.

**`RELEASE_PVM` unset makes release protection silently inert.** `pathRequiresAuth()`
returns `false` unconditionally in that case; there is no fail-closed behaviour and no
startup warning. Verify it on every deploy — see
[ADR-004](decisions/ADR-004-path-scoped-auth.md).

The `users.json` schema is documented in
[ARCHITECTURE.md](ARCHITECTURE.md#datausersjson-schema).

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

**Not provided by this repository.** There is no systemd unit, PM2 config, Dockerfile, or
Kubernetes manifest. Deployment must supply it.

This matters more than usual for this application: the in-memory rate limiter and
brute-force lockout are **per-process and lost on restart** (see
[ADR-012](decisions/ADR-012-in-memory-rate-limiting.md)). A supervisor configured to restart
the process on crash will silently reset all rate limits and lockouts. A supervisor
configured with multiple workers or cluster mode will make the limiter per-worker, so users
effectively get N× the intended limit.

**A single process, restarted rarely, is the correct shape for the current design.** If you
move to multiple workers, the rate limiter and lockout must move to shared storage first.

---

## Frontend Assets in Production

Two filesystems are in play, and it is easy to deploy only one of them:

| Path | Served by | In production |
|------|-----------|---------------|
| `/api/*` | Node.js | via `proxy_pass` |
| `/assets/*`, `/lib/idle-timer.js`, `*.html` | nginx | directly from `root` |

The nginx `root` is `/var/www/html/files-server-web`. **The whole repository tree must exist
at that path**, not just `assets/` — `index.html`, `404.html`, and `lib/idle-timer.js` are
all read from it. `lib/` additionally being reachable is why `location ~ /\.` and the
application-level `/lib/` deny both exist; see
[ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md).

The application can serve all of this itself in development (`lib/static-handler.js`), so
`npm start` proves nothing about whether production asset delivery works. Verify against a
real nginx.

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
    access_log off;
    try_files $uri =404;
}
```

**`woff2` and `webp` are missing from this regex.** Requests for `assets/fonts/*.woff2` and
`assets/icon/*.webp` fall through to `location /` → `try_files $uri $uri/ @spa`, where they
*are* resolved from disk and served correctly — so nothing is broken. But they miss
`expires 30d`, `Cache-Control: public, immutable`, and `access_log off`, so every page load
revalidates ten font files and every icon against nginx's default `ETag`/`Last-Modified`
handling.

Add both extensions to the regex to match the intent already expressed for every other
static asset class:

```nginx
location ~* \.(?:css|js|png|jpg|jpeg|svg|ico|woff2|webp)$ {
```

See [ADR-011](decisions/ADR-011-self-hosted-fonts.md) for the font rationale and
[ADR-007](decisions/ADR-007-nginx-static-and-proxy.md) for the topology trade-offs.

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
