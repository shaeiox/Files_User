# Deployment

Everything needed to put the CloudAvid File Portal on a Linux server behind nginx,
in the order you do it. The nginx side lives in the Admin Files Manager repository
(`scripts/nginx/cloudavid.conf` + its `README.md`); this page covers the portal and
what nginx expects from it.

---

## 1. Topology

```
Internet
  └─ nginx :80  → 301 to https
  └─ nginx :443  files.cloudavid.com
       ├─ /index.html, /404.html, /assets/**                → files from  <checkout>/public/
       ├─ /api/**, /release8/latest, /release9/latest        → proxy  127.0.0.1:4000 (this portal)
       └─ anything else                                       → /index.html (SPA shell)
     nginx :443  adminfiles.cloudavid.com  (HTTP Basic)       → proxy  127.0.0.1:3000 (Admin Files Manager)

Portal (Node, 127.0.0.1:4000)
  ├─ reads files under FILES_ROOT (never writes)
  ├─ reads the admin database ADMIN_DB_PATH read-only (integration mode)
  └─ writes only PORTAL_DATA_DIR (users.json lastLogin in legacy mode, portal.log)
```

- **Web root = `<checkout>/public/`.** `server.js`, `lib/`, `package.json`, `data/` and
  `docs/` sit one level above it and cannot be served by nginx or by Node.
- **All file content goes through Node.** Never point an nginx `root`/`alias` at
  `FILES_ROOT`: that bypasses sign-in and every admin policy.
- **One process.** Rate limits, login lockouts, logout revocations and the admin
  snapshot are kept in memory per process ([ADR-012](decisions/ADR-012-in-memory-rate-limiting.md)).
  Run exactly one instance; do not use cluster mode or several workers.

---

## 2. Server prerequisites

| Requirement | Check |
|---|---|
| Linux with systemd | `systemctl --version` |
| **Node.js ≥ 22.16** (`node:sqlite` with `timeout`; `package.json` → `engines`) | `node -v` |
| npm + a C/C++ toolchain for `bcrypt` (native module) | `npm -v`, `gcc --version` (Debian/Ubuntu: `build-essential python3`) |
| nginx ≥ 1.24 | `nginx -v` |
| TLS certificate covering `files.cloudavid.com` **and** `adminfiles.cloudavid.com` | `openssl x509 -in <cert> -noout -ext subjectAltName` |
| A service user (e.g. `portal`) that can **read** `FILES_ROOT` and the admin DB, and **write** `PORTAL_DATA_DIR` | see §4 |
| Ports 3000 and 4000 closed to the outside (both apps listen on `0.0.0.0`) | `ufw status` / `nft list ruleset` |

Ubuntu's own `nodejs` package is too old. Install Node 22 or 24 from NodeSource or
the official tarball.

---

## 3. Get the code on the server

```bash
sudo mkdir -p /var/www/html
sudo git clone https://github.com/shaeiox/Files_User.git /var/www/html/files-server-web
cd /var/www/html/files-server-web
sudo npm ci --omit=dev        # on the server itself: bcrypt compiles for this OS/Node
```

Never copy `node_modules` from Windows or another Node version. `bcrypt` will not load.

Updating later:

```bash
cd /var/www/html/files-server-web
sudo git pull --ff-only
sudo npm ci --omit=dev
sudo systemctl restart files-portal
```

---

## 4. Directories and permissions

```bash
sudo useradd --system --home /var/lib/files-portal --shell /usr/sbin/nologin portal
sudo install -d -o portal -g portal -m 0750 /var/lib/files-portal          # PORTAL_DATA_DIR
sudo install -d -o root   -g portal -m 0750 /etc/files-portal              # .env lives here
# FILES_ROOT: the portal only reads it
sudo setfacl -R -m u:portal:rX  /srv/storage && sudo setfacl -R -d -m u:portal:rX /srv/storage
```

| Path | Owner / access | Why |
|---|---|---|
| `/var/www/html/files-server-web` | root, world-readable | code; nginx reads `public/` |
| `PORTAL_DATA_DIR` (`/var/lib/files-portal`) | `portal`, rw | `users.json`, `portal.log` |
| `FILES_ROOT` | `portal` read (`r` files, `rX` dirs) | served content |
| `ADMIN_DB_PATH` **and its directory** | `portal` read (`r` file, `rx` dir) | The admin keeps `/var/lib/dimension` at `dimension:dimension 0750`. Grant read with `sudo usermod -aG dimension portal`, and check that `admin.sqlite` is group-readable. SQLite also needs to see the `-journal` file next to it |
| `/etc/files-portal/portal.env` | root:portal `0640` | secrets |

---

## 5. Configuration (`.env`)

The portal reads `<checkout>/.env` at startup, and real environment variables win
over it (env-first). On the server, keep the file **outside** the checkout and load it
with systemd `EnvironmentFile=` (§6). Never commit it.

**Every value is checked at startup** (`lib/settings.js`). A number outside its range, a
boolean that is not `true/false`, `1/0`, `yes/no` or `on/off`, or `AUTH_ENABLED=true` with an
`AUTH_JWT_SECRET` under 32 characters refuses startup, with every problem listed at once.
Secret values are never printed. Check a file before deploying it, without starting the server:

```bash
set -a; . /etc/files-portal/portal.env; set +a; node server.js --check-config
```

> **Upgrade note (BREAKING for operations):** before this check, a malformed value silently fell
> back to its default (and `AUTH_ENABLED=ture` silently turned sign-in off). Run
> `--check-config` against the production env file before upgrading.

### 5.1 Production template, admin integration (recommended)

`/etc/files-portal/portal.env`:

```ini
NODE_ENV=production
PORT=4000

# Content: the admin's STORAGE_ROOT, or any folder inside it. Absolute path.
FILES_ROOT=/srv/storage

# Portal-owned data (portal.log; users.json in legacy mode). Absolute, outside the checkout.
PORTAL_DATA_DIR=/var/lib/files-portal

# Sign-in
AUTH_ENABLED=true
# 64+ random hex chars. Generate:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
AUTH_JWT_SECRET=<generate-a-fresh-one>
AUTH_SESSION_MINUTES=30
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCKOUT_MINUTES=15

# Admin Files Manager link (read-only)
ADMIN_INTEGRATION_ENABLED=true
ADMIN_DB_PATH=/var/lib/dimension/admin.sqlite
ADMIN_SYNC_TTL_MS=5000

# Trace log read by the admin's Logs pane (admin PORTAL_LOG_FILE must name the same file)
LOG_FILE=/var/lib/files-portal/portal.log

# nginx on this host is the only trusted proxy
TRUSTED_PROXIES=127.0.0.1,::1
```

With a v5 admin, set and **lock** the release folder in *Admin → File portal*. That
lock is what makes releases require sign-in. `RELEASE_PVM` is ignored there.

### 5.2 Production template, legacy mode (no admin)

```ini
NODE_ENV=production
PORT=4000
FILES_ROOT=/srv/storage
RELEASE_PVM=/srv/storage/release         # inside FILES_ROOT; unset = releases are public
PORTAL_DATA_DIR=/var/lib/files-portal
AUTH_ENABLED=true
AUTH_JWT_SECRET=<generate-a-fresh-one>
AUTH_SESSION_MINUTES=30
# AUTH_USERS_FILE defaults to <PORTAL_DATA_DIR>/users.json
TRUSTED_PROXIES=127.0.0.1,::1
```

Create the users file:

```bash
cd /var/www/html/files-server-web
node lib/hash-password.js '<password>'           # prints a bcrypt hash
sudo -u portal tee /var/lib/files-portal/users.json >/dev/null <<'JSON'
{ "users": [ { "id": "u1", "username": "alice", "passwordHash": "<hash>", "role": "user" } ] }
JSON
sudo chmod 600 /var/lib/files-portal/users.json
```

Usernames: 3–32 characters, `[a-zA-Z0-9_-]`. Removing a user from the file ends their
sessions on the next request.

### 5.3 All variables

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | — | `production` requires `PORTAL_DATA_DIR` and absolute paths for every path variable, or startup is refused |
| `PORT` | `4000` | Must match nginx `proxy_pass` (range 1–65535) |
| `FILES_ROOT` | — | **Required.** Served content, read-only |
| `RELEASE_PVM` | — | Legacy / pre-v5 admin only: release folder (inside `FILES_ROOT`) that needs sign-in |
| `PORTAL_DATA_DIR` | `<checkout>/data` | Base for `users.json` and `portal.log` |
| `AUTH_ENABLED` | `false` | `true` turns sign-in on |
| `AUTH_JWT_SECRET` | — | **Required with auth**, ≥ 32 chars. Signs session cookies. Rotating it logs everyone out |
| `AUTH_SESSION_MINUTES` | `30` | Idle timeout (sliding). A v5 admin's value overrides it (range 1–10080) |
| `AUTH_MAX_FAILED_ATTEMPTS` | `5` | Failed logins before lockout. A v5 admin overrides it (range 1–1000) |
| `AUTH_LOCKOUT_MINUTES` | `15` | Lockout length. A v5 admin overrides it (range 1–10080) |
| `AUTH_USERS_FILE` | `<PORTAL_DATA_DIR>/users.json` | Legacy mode only |
| `AUTH_BASIC_ALLOW_HTTP` | `false` | `true` accepts `curl -u` over plain HTTP. Leave off behind TLS |
| `AUTH_MAX_FAILED_ENTRIES` | `5000` | Cap on tracked usernames (locked accounts are evicted last) (range 100–10000000) |
| `AUTH_FAILED_IDLE_MS` | `86400000` | Forget failed-attempt counters after this idle time (range 60000–2678400000) |
| `ADMIN_INTEGRATION_ENABLED` | `false` | Set together with `ADMIN_DB_PATH`; setting only one refuses startup |
| `ADMIN_DB_PATH` | — | Admin SQLite database, opened read-only |
| `ADMIN_SYNC_TTL_MS` | `5000` | How often admin changes are re-read (1000–60000) |
| `LOG_FILE` | `<PORTAL_DATA_DIR>/portal.log` | JSON-lines trace; `off` disables it |
| `TRUSTED_PROXIES` | `127.0.0.1,::1,::ffff:127.0.0.1` | Peers whose `X-Forwarded-For/-Proto` are believed |
| `CORS_ALLOWED_ORIGINS` | empty | Cross-origin API callers (CSV). Leave empty behind nginx |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Per-IP rate-limit window (range 1000–3600000) |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Requests per IP per window (range 1–1000000) |
| `RATE_LIMIT_MAX_IPS` | `10000` | Cap on tracked IPs (range 100–10000000) |
| `HASH_MAX_BYTES` | `536870912` (512 MiB) | Largest file `/api/hash` will checksum |
| `CONTENT_INDEX_TTL_MS` | `30000` | How long a directory listing is cached for home-page counts and search (range 0–600000; `0` = no cache). Access decisions are never cached |
| `CONTENT_INDEX_MAX_DIRS` | `20000` | Most directories kept in that cache, least recently used out (range 100–1000000) |

`ADMIN_STORAGE_ROOT` is obsolete: it is ignored, and a warning is logged.

### 5.4 Admin storage volume (v5 admin)

The admin stamps its `STORAGE_ROOT` with a `.dimension-volume` marker. The portal
refuses to start unless `FILES_ROOT` (or a parent) carries the **same** marker, so a
wrong mount can never serve another tree under the admin's policies. Order when
upgrading: **deploy the portal first** (it accepts admin schema v4 and v5), then the
admin.

---

## 6. systemd unit

`/etc/systemd/system/files-portal.service`:

```ini
[Unit]
Description=CloudAvid File Portal
After=network.target

[Service]
Type=simple
User=portal
Group=portal
WorkingDirectory=/var/www/html/files-server-web
EnvironmentFile=/etc/files-portal/portal.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=3
# SIGTERM → server.close(); open downloads get 5 s before exit
TimeoutStopSec=15

# Hardening: the portal only writes PORTAL_DATA_DIR
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/files-portal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now files-portal
journalctl -u files-portal -n 50 --no-pager      # startup banner and any refusal reasons
```

If the admin database lives under a path `ProtectSystem=strict` makes read-only,
that's fine, because the portal only reads it. If startup logs "Configuration is not
usable", it lists every problem. Fix them and restart.

---

## 7. nginx

Use `scripts/nginx/cloudavid.conf` from the Admin Files Manager repository and follow
its `README.md` (certificate, `htpasswd`, `nginx -t`, reload). What it must keep
for this portal:

| Setting | Value |
|---|---|
| `root` (portal vhost) | `/var/www/html/files-server-web/public` |
| Proxy location | `location ~ ^/(?:api/\|release[89]/latest$)` → `proxy_pass http://127.0.0.1:4000` (**first** regex location) |
| `X-Forwarded-For` | `$remote_addr` |
| `X-Forwarded-Proto` | `$scheme` (CLI `curl -u` is refused unless this says https) |
| Static locations | allowlist only: `/(index\|browse\|404).html`, `/assets/**`; `location /` rewrites to `/index.html` |
| Buffering / timeouts | `proxy_buffering off`, 3600 s read/send (large downloads, ZIP streams) |

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Operational endpoints stay private.** The proxy location forwards only `/api/` and
`/release[89]/latest`, so `/livez`, `/readyz` and `/metrics` are never reachable through
nginx. Probe and scrape them on `127.0.0.1:4000`. Keep it that way when editing the config;
the portal also refuses `/metrics` to any request carrying `X-Forwarded-For`.

**Deploy order:** the nginx config serves `…/public`. Deploy (or `git pull`) the
portal **before** reloading nginx, or the site has no pages.

---

## 8. Firewall

```bash
sudo ufw allow 80,443/tcp
sudo ufw deny 3000/tcp
sudo ufw deny 4000/tcp
```

If 4000 is reachable from outside, clients skip TLS and the security headers nginx adds.

---

## 9. Verify after deploy

```bash
# Node directly
curl -s http://127.0.0.1:4000/api/health                     # {"status":"ok",...}
curl -s http://127.0.0.1:4000/livez                          # {"status":"ok"}
curl -s http://127.0.0.1:4000/readyz                         # {"status":"ready","checks":{...}}
curl -s http://127.0.0.1:4000/metrics | head -3              # # HELP portal_http_requests_total ...

# Through nginx
curl -s  https://files.cloudavid.com/api/health
curl -sI https://files.cloudavid.com/ | grep -iE 'content-security|strict-transport'
curl -sI https://files.cloudavid.com/assets/js/idle-timer.js | head -1   # 200

# The checkout is not published: each must print the SPA shell (<!doctype html>) or a 404
for p in /server.js /package.json /lib/auth-service.js /.env /data/users.json; do
  printf '%s ' "$p"; curl -s https://files.cloudavid.com$p | head -c 15; echo
done

# Releases ask for sign-in when locked; CLI with credentials over HTTPS works
curl -sI https://files.cloudavid.com/release9/latest | head -1            # 401 if locked
curl -sfu alice https://files.cloudavid.com/release9/latest -o /tmp/r.tgz && echo ok
```

In a browser:
1. Sign in, browse a folder, and download a file.
2. Sign out.
3. Re-sending the old cookie must now give `authenticated:false` with reason `SESSION_REVOKED`.

---

## 10. Pre-deploy checklist

- [ ] Code is committed and pushed, and CI is green on `master`
- [ ] `node -v` ≥ 22.16 on the server; `npm ci --omit=dev` ran **on the server**
- [ ] `/etc/files-portal/portal.env` exists, mode `0640`, `NODE_ENV=production`, `PORT=4000`
- [ ] `node server.js --check-config` with the production env prints `Configuration is usable.`
- [ ] `AUTH_JWT_SECRET` is freshly generated, **not** any value that was ever in git history
- [ ] `FILES_ROOT`, `PORTAL_DATA_DIR`, `ADMIN_DB_PATH` (or `AUTH_USERS_FILE`) are absolute and accessible to the `portal` user
- [ ] Integration: the release folder is locked in *Admin → File portal*. Legacy: `RELEASE_PVM` is set
- [ ] `files-portal.service` is enabled; `journalctl` shows the banner with `FILES_ROOT is configured`
- [ ] nginx `root` is `…/files-server-web/public`, `proxy_pass` is `:4000`, and `nginx -t` passes
- [ ] Ports 3000/4000 are closed externally
- [ ] §9 checks pass

---

## 11. Operations

| Topic | Notes |
|---|---|
| Logs | stdout → journald (`journalctl -u files-portal`); JSON trace at `LOG_FILE` for the admin's Logs pane, one line per request with `requestId` and `durationMs` (match it to the response's `X-Request-Id`). Rotate `portal.log` with logrotate `copytruncate` |
| Restart effects | None for security state: rate limits, login lockouts and logout revocations live in `<PORTAL_DATA_DIR>/portal-state.sqlite` and are shared by every process using that directory ([ADR-013](decisions/ADR-013-shared-sqlite-security-state.md)). Keep `PORTAL_DATA_DIR` on local disk |
| Secret rotation | Change `AUTH_JWT_SECRET` and restart. Every session ends |
| Revoke one user | Integration: *Admin → Revoke sessions* or deactivate the user. Legacy: remove the user from `users.json` |
| Rollback | `git checkout <previous-tag> && npm ci --omit=dev && systemctl restart files-portal`. If that version predates `public/`, roll nginx `root` back too |
| Health | `GET /livez` (process up) for the supervisor; `GET /readyz` (`FILES_ROOT` readable, admin snapshot valid) for a load balancer. Both on `127.0.0.1:4000`, never through nginx. `/api/health` stays as a liveness alias |
| Metrics | Scrape `http://127.0.0.1:4000/metrics` (Prometheus text). Series and labels: [API.md](API.md#get-metrics) |

---

## 12. Container (alternative to systemd)

The `Dockerfile` builds a `node:22.16-bookworm-slim` image that runs as the `node` user with
`NODE_ENV=production`, `FILES_ROOT=/srv/files` and `PORTAL_DATA_DIR=/var/lib/files-portal` (a
volume). Its `HEALTHCHECK` calls `/livez`. nginx stays in front, exactly as in §7.

```bash
docker build -t files-portal .
```

```bash
docker run -d --name files-portal --restart unless-stopped \
  --env-file /etc/files-portal/portal.env \
  -v /srv/files:/srv/files:ro \
  -v files-portal-data:/var/lib/files-portal \
  -p 127.0.0.1:4000:4000 \
  files-portal
```

```bash
curl -s http://127.0.0.1:4000/readyz
```

- Mount content **read-only**. The portal writes only `PORTAL_DATA_DIR`.
- In integration mode, also mount the admin database read-only and point `ADMIN_DB_PATH` at
  the in-container path (for example `-v /srv/admin/admin.sqlite:/srv/admin/admin.sqlite:ro`).
- Publish on `127.0.0.1` only. nginx proxies `/api/` and `/release[89]/latest` as in §7, so
  `/metrics` is never public.
- Run several containers on one host by sharing the same `files-portal-data` volume: they then
  share rate limits, lockouts and logout revocations ([ADR-013](decisions/ADR-013-shared-sqlite-security-state.md)).
