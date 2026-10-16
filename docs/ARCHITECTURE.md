# Architecture

## System Overview

`files-server-web` is a single-server file portal built on Node.js (no framework) with a vanilla JS single-page application (SPA) frontend. It serves files from a configurable filesystem directory (`FILES_ROOT`) via a REST API and a client-side rendered UI.

**Source:** `server.js` → `http.createServer()` → `lib/api-router.js` → `handleRequest()`

## Technology Stack

| Layer | Technology | Source |
|-------|-----------|--------|
| Runtime | Node.js (no framework) | `server.js` |
| HTTP | `http` module (built-in) | `server.js` |
| Frontend | Vanilla JS (IIFE modules, no framework) | `public/assets/js/*.js` |
| Auth | bcrypt + JWT (HMAC-SHA256) + HttpOnly cookies | `lib/auth-service.js` |
| `lib/auth/*.js` | Auth internals behind the `auth-service` facade: `jwt`, `passwords`, `lockout`, `users-legacy`, `users-admin`, `session` | `lib/auth/` |
| Deployment | nginx reverse proxy + Node.js process | `nginx.conf` |

## Backend Module Structure

| Module | Purpose | Source |
|--------|---------|--------|
| `server.js` | Entry point, HTTP server, boot sequence | `server.js` |
| `lib/api-router.js` | Request pipeline and route dispatch | `lib/api-router.js` |
| `lib/routes/*.js` | Route table (`index.js`, in dispatch order) and one handler per endpoint | `lib/routes/` |
| `lib/request-context.js` | Per-request sessions (cookie, CLI Basic) and the access gates | `lib/request-context.js` |
| `lib/settings.js` | Declaration, parsing and startup validation of every configuration variable | `lib/settings.js` |
| `lib/files-service.js` | Filesystem abstraction: listing, download, search, releases | `lib/files-service.js` |
| `lib/auth-service.js` | Authentication: bcrypt, JWT, cookies, brute-force | `lib/auth-service.js` |
| `lib/rate-limiter.js` | In-memory IP-based rate limiting | `lib/rate-limiter.js` |
| `lib/http-utils.js` | Response formatters, JSON body parser, security headers | `lib/http-utils.js` |
| `lib/static-handler.js` | SPA serving, 404, static files, downloads | `lib/static-handler.js` |
| `lib/load-env.js` | `.env` file loading with dotenv fallback | `lib/load-env.js` |
| `lib/logger.js` | Terminal logging with ANSI colors | `lib/logger.js` |
| `public/assets/js/idle-timer.js` | Client-side session auto-lock | `public/assets/js/idle-timer.js` |
| `lib/hash-password.js` | CLI utility for password hashing | `lib/hash-password.js` |

## Backend Dependency Relationships

Confirmed from `require()` calls in source:

```
server.js
├── lib/load-env.js
├── lib/settings.js            (startup validation, --check-config)
├── lib/logger.js
├── lib/api-router.js
│   ├── lib/rate-limiter.js
│   ├── lib/http-utils.js
│   ├── lib/request-context.js
│   │   ├── lib/auth-service.js
│   │   ├── lib/access-policy.js
│   │   └── lib/files-service.js
│   └── lib/routes/index.js
│       ├── auth.js     (sign-in, before the request context)
│       ├── catalog.js  (health, nav, categories, search)
│       ├── releases.js (releases, /release*/latest)
│       ├── content.js  (files, download, hash, download-zip)
│       └── static.js   (404, SPA, static fallback)
├── lib/admin-db.js           (boot-time validation)
└── lib/files-service.js      (boot-time health check)
```

**Source:** `server.js` → `require("./lib/api-router")`, `lib/api-router.js` → `require("./files-service")`, `require("./auth-service")`, etc.

## HTTP Request Routing

```
HTTP Request
  → server.js (http.createServer)
    → lib/api-router.js handleRequest()
      → lib/rate-limiter.js checkLimit()
      → CORS preflight, method check, sensitive paths
      → lib/routes/auth.js (sign-in routes, no session yet)
      → lib/request-context.js createRequestContext() (sessions, gates)
      → legacy release gate (auth-service pathRequiresAuth)
      → first matching route in lib/routes/index.js ROUTES
        → lib/files-service.js / archive-service / hash-service
        → lib/static-handler.js (SPA, 404, static files; last entry)
```

**Source:** `lib/api-router.js` → `handleRequest()`, `lib/routes/index.js` → `ROUTES`

## Frontend SPA Structure

| Module | Purpose | Source |
|--------|---------|--------|
| `router.js` | SPA routing, page navigation | `public/assets/js/router.js` |
| `home.js` | HomePage component, resource cards, search | `public/assets/js/home.js` |
| `file-actions.js` | File Actions module (dedicated per-item actions: Download for files) | `public/assets/js/file-actions.js` |
| `browse.js` | BrowsePage component, file table | `public/assets/js/browse.js` |
| `resource-service.js` | API client, caching, auth status | `public/assets/js/services/resource-service.js` |
| `i18n.js` | Internationalization (`en`, `fa`); sets `<html lang>` and `dir` | `public/assets/js/i18n.js` |
| `theme.js` | Dark/light theme toggle, persisted to `localStorage` | `public/assets/js/theme.js` |
| `autocomplete.js` | Search autocomplete | `public/assets/js/autocomplete.js` |
| `banner.js` | Banner component | `public/assets/js/banner.js` |
| `smooth-scroll.js` | Lenis wrapper; gated by `prefers-reduced-motion` and `data-perf` | `public/assets/js/smooth-scroll.js` |
| `performance-monitor.js` | Runtime performance-tier detection; publishes `data-perf` | `public/assets/js/services/performance-monitor.js` |
| `vendor/lenis.min.js` | Vendored third-party smooth-scroll library | `public/assets/js/vendor/lenis.min.js` |

All modules are IIFEs exposing a single global. There is no build step and no bundler —
see [ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md).

### Frontend Script Loading Order

Confirmed from `<script>` tags in `public/index.html`:

```
index.html
├── public/assets/js/banner.js                        (no defer — runs immediately)
├── public/assets/js/services/resource-service.js     defer
├── public/assets/js/services/performance-monitor.js  defer
├── public/assets/js/theme.js                         defer
├── public/assets/js/i18n.js                          defer
├── public/assets/js/autocomplete.js                  defer
├── public/assets/js/home.js                          defer
├── public/assets/js/file-actions.js                  defer
├── public/assets/js/browse.js                        defer
├── public/assets/js/vendor/lenis.min.js              defer   ← must precede smooth-scroll.js
├── public/assets/js/smooth-scroll.js                 defer
├── public/assets/js/idle-timer.js                          (no defer)
└── public/assets/js/router.js                        defer   ← must be last
```

**Two ordering constraints are load-bearing:**

1. **`router.js` must load last.** It drives navigation and assumes every page module is
   already registered.
2. **`vendor/lenis.min.js` must precede `smooth-scroll.js`.** Reversing them silently
   disables smooth scrolling — `smooth-scroll.js` gates on `typeof Lenis !== 'undefined'`
   and degrades to native scrolling rather than throwing. There is no error to notice.

`defer` preserves execution order while allowing parallel download. `banner.js` and
`public/assets/js/idle-timer.js` intentionally load without it.

### Frontend Stylesheet Loading Order

```
index.html
├── public/assets/css/tokens.css             ← must be first
├── public/assets/css/base.css
├── public/assets/css/components.css
├── public/assets/css/home.css
├── public/assets/css/browse.css
├── public/assets/css/performance-modes.css
└── public/assets/css/lenis.css
```

There is no build step, so layering is achieved **solely by `<link>` order**. `tokens.css`
defines every design token; if it loads after a consumer stylesheet, the whole semantic
layer resolves to nothing and the page renders unstyled or broken.

`public/browse.html` loads a reduced set (`tokens`, `base`, `components`, `home`, `browse`,
`lenis`) and omits `performance-modes.css`. See
[Standalone HTML Pages](#standalone-html-pages) below.

See [STYLEGUIDE.md](STYLEGUIDE.md) for the token contract and [ADR-008](decisions/ADR-008-css-custom-property-tokens.md)
for the rationale.

## Runtime Performance Tiers

`public/assets/js/services/performance-monitor.js` classifies device capability and measured frame
rate, then publishes the result as a `data-perf` attribute on `<html>`. Tiers are
`high` / `medium` / `low` / `potato`.

**Three independent systems read this attribute:**

| Consumer | Effect |
|----------|--------|
| `public/assets/css/performance-modes.css` | Progressively strips blur, aura glows, logo shader, hero clouds, shadows, transitions |
| `public/assets/js/smooth-scroll.js` | Disables Lenis entirely at `potato` |
| Manual override UI | Lets the user pin a tier via `data-perf-val` |

The tier can change **after** load — `smooth-scroll.js` therefore observes the attribute
with a `MutationObserver` and also listens for `prefers-reduced-motion` changes, starting
and stopping Lenis accordingly.

Classification inputs: measured FPS, `navigator.connection.effectiveType`, hardware
concurrency, touch capability and screen size, and battery status. Adaptive tier changes use
hysteresis (3 consecutive low-FPS samples to downgrade, 5 to upgrade).

See [ADR-009](decisions/ADR-009-runtime-performance-tiers.md).

## Standalone HTML Pages

Three HTML files exist in the repository root:

| File | How it is served |
|------|------------------|
| `public/index.html` | `GET /`, `GET /index.html`, and **all** `GET /browse/*` paths, via `lib/static-handler.js` → `serveSPA()` |
| `public/404.html` | `GET /404`, `GET /404.html`, via `serve404()` |
| `public/browse.html` | **Not routed.** |

**`public/browse.html` is effectively dead.** `lib/api-router.js` serves `public/index.html` for every
`/browse/*` request, and there is no `public/browse.html` reference anywhere in `lib/` or
`server.js`. Under the shipped `nginx.conf` the file is reachable only as a literal static
request to `/browse.html` (which falls through to `location /` → `try_files`), and nothing
links to it. It appears to be a leftover standalone browse page that predates the router.

It carries its own `<script>` and `<link>` set and does **not** stay in sync with
`public/index.html`. **When changing frontend loading order or stylesheets, change `public/index.html`;
do not treat `public/browse.html` as a second entry point.** It should either be deleted or wired
up deliberately — but that is a behavioural decision, not a documentation fix.

### Frontend Cross-Cutting Conventions

| Concern | Mechanism |
|---------|-----------|
| Theme | `data-theme` attribute on `<html>`, `localStorage`-backed, applied pre-paint by an inline script in `public/index.html` |
| Direction | `dir` attribute on `<html>`, set by `public/assets/js/i18n.js` → `document.documentElement.dir`; initial value `ltr` hardcoded in `public/index.html` |
| Language | `lang` attribute on `<html>`; dictionaries `en` and `fa` in `public/assets/js/i18n.js` |
| Fonts | Self-hosted WOFF2 in `public/assets/fonts/`, `@font-face` in `tokens.css`, `font-display: swap` — see [ADR-011](decisions/ADR-011-self-hosted-fonts.md) |
| Content-Security-Policy | `script-src 'self' 'unsafe-inline'`; `font-src 'self' data:` — this is why fonts are self-hosted and Lenis is vendored |

### Browse Row Targets and File Actions

Each Browse item exposes **two distinct categories of interactive target**. They are deliberately kept in
separate owners and must not be collapsed:

1. **Primary Browse navigation target** — the item **name** and the **icon beside it**. Both resolve to the
   *same* primary destination. Owned by `BrowsePage`; **not** a File Action.
2. **Dedicated File Actions** — rendered by the `FileActions` module into a dedicated trailing column.
   Currently **Download for files only**; directories have **no** dedicated File Action.

#### Primary navigation target (BrowsePage-owned)

```
BrowsePage (browse.js) renderFilesList()
  href     = type === "directory" ? ResourceService.browseHref(relPath)
                                  : ResourceService.downloadHref(relPath)
  linkAttr = type === "directory" ? `href="${href}"`
                                  : `href="${href}" data-file="true"`
  ├─ cell 1  .f-icon > a.f-icon-link ${linkAttr}   ← primary icon target (always present)
  └─ cell 2  .f-name  > a.f-link       ${linkAttr}   ← primary name target (always present)
```

The icon and the name are **two sibling anchors**, never nested, each appearing exactly once in the tab
order. Both interpolate the same `linkAttr`, so the two primary targets cannot diverge. The icon's
accessible name is composed by `BrowsePage` from the existing `btnOpen` / `btnDownload` i18n keys plus the
item name. `btnOpen` here labels the **primary icon**; it does **not** imply a File Action named `Open`.

#### Dedicated File Actions

`browse.js` only places the module's output into each row as its sixth cell; all action knowledge lives in
`file-actions.js`. Relationship: **BrowsePage → FileActions → ResourceService / Router**.

```
BrowsePage (browse.js) renderFilesList()
  └─ FileActions.render(item, d)   → '<div class="f-actions">…</div>' — sixth grid child of the row
       ├─ applicability: item.type === "file"  → Download; directories render an empty container
       └─ href: ResourceService.downloadHref(relPath)
Router (router.js) intercepts the anchor:
  Download (href + data-file="true")     → router bypass → native browser download
```

| Concern | Owner | Source |
|---------|-------|--------|
| Primary navigation target for an item: the name link and the icon beside it, the shared `href`/`data-file` attributes, and the icon's accessible label | `BrowsePage` | `public/assets/js/browse.js` → `renderFilesList()` |
| Dedicated File Action definitions, applicability, markup, accessible labels (`aria-label`/`title`), escaping, action SVG | `FileActions` | `public/assets/js/file-actions.js` |
| Row construction; single integration call `FileActions.render(item, d)` as the sixth cell | `BrowsePage` | `public/assets/js/browse.js` → `renderFilesList()` |
| Resource URLs (`browseHref`, `downloadHref`) | `ResourceService` | `public/assets/js/services/resource-service.js` |
| SPA navigation and the `data-file="true"` native-download bypass | `Router` | `public/assets/js/router.js` |

- Current actions: **file rows render a Download anchor; directory rows render none.** Action controls are siblings of the file-name link (never nested); `browse.js` contains no action-specific URLs or handlers. There is no dedicated `Open` action — directory navigation is reached through the primary icon and name targets.
- The module is a flat action-definition list exposing only `render(item, d)` — no generic command/action framework.
- Labels come from the i18n dictionary (`public/assets/js/i18n.js`): the Download action uses `btnDownload`; `btnOpen` is used by `BrowsePage` for the primary icon's accessible label, not by the module.
- Layout note: every `.trow` is an independent grid container, so the sixth (action) track is pinned to a fixed `26px` in both the list and the ≤640px templates. A content-sized track would let rows with and without an action resolve different column boundaries.

**Source:** `public/assets/js/file-actions.js` → `render()`, `public/assets/js/browse.js` → `renderFilesList()`, `public/assets/js/router.js` → document click interceptor

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
| `PORT` | No | `4000` | `server.js` → `process.env.PORT \|\| 4000` | HTTP server port |

**Note:** Defaults marked above are confirmed from source code constants in `lib/auth-service.js` (`DEFAULT_SESSION_MINUTES`, `DEFAULT_MAX_ATTEMPTS`, `DEFAULT_LOCKOUT_MINUTES`) and `server.js` (`process.env.PORT || 4000`).

> **Port.** `server.js` defaults to `4000`, and the nginx config (`scripts/nginx/cloudavid.conf`, Admin Files Manager repository) proxies `/api/` and `/release{8,9}/latest` to `127.0.0.1:4000`. Keep `PORT` explicit so the two cannot drift. See [DEPLOYMENT.md → nginx](DEPLOYMENT.md#7-nginx).

`server.js` also binds `HOST = "0.0.0.0"` (hardcoded, not configurable), so the process
listens on all interfaces. Behind nginx that is fine, but if the port is ever exposed
directly, `x-forwarded-for` becomes client-controlled and the per-IP rate limiter is
bypassable — see [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md).

## Extension Points

| Extension | Pattern | Source |
|-----------|---------|--------|
| New API endpoint | Add a route to `lib/routes/` and list it in `lib/routes/index.js` | [EXTENDING.md](EXTENDING.md) |
| New file operation | Add exported function to `files-service.js` | `lib/files-service.js` |
| New auth method | Extend `auth-service.js` | `lib/auth-service.js` |
| New frontend component | Create IIFE module in `public/assets/js/`, add `<script>` in `public/index.html` | `public/assets/js/*.js` |
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
- `data/users.json` schema (see below)
- Frontend stylesheet and script load order from `public/index.html` and `public/browse.html`

### `data/users.json` Schema

**Resolved** — previously listed as an unresolved implementation detail. Confirmed from
`lib/auth-service.js` → `loadUsers()`, `findUser()`, `saveUsers()` and cross-checked
against the runtime file:

```json
{
  "users": [
    {
      "id":        "string",
      "username":  "string",
      "passwordHash": "string",
      "role":      "string",
      "createdAt": "string",
      "lastLogin": "string"
    }
  ]
}
```

| Field | Notes |
|-------|-------|
| `users` | Top-level array. `loadUsers()` expects exactly this shape. |
| `username` | Matched **case-insensitively** by `findUser()`; lockout keys are lowercased |
| `passwordHash` | bcrypt (`$2…`) or scrypt (`scrypt$…`). Auto-detected by prefix. Generate with `node lib/hash-password.js <password>` |
| `role` | **Present but unenforced.** No authorization logic reads it — see [ADR-004](decisions/ADR-004-path-scoped-auth.md) |
| `lastLogin` | Written on successful login |
| `createdAt` | Set at creation |

Note `lib/hash-password.js` requires a minimum of **6 characters** and exits non-zero
below that.

### Assumptions (not fully verified)

- Production deployment uses the exact `nginx.conf` in the repo (it ships
  `server_name files.cloudavid.com` and concrete SSL certificate paths, so it is a template)
- No database or external service dependencies beyond filesystem
- `.env` in the working tree is representative of production shape (its `PORT=4000` and
  `FILES_ROOT` point at a developer machine)

### Unresolved

- **Process supervision** — no systemd unit, PM2 config, or Dockerfile exists. Deployment
  must supply it.
- **`public/browse.html` intent** — whether it should be deleted or wired up is a product
  decision, not a technical one.
- **`lenis` in `package.json` is unused.** The served file is the vendored
  `public/assets/js/vendor/lenis.min.js`; no server code requires the npm package. The npm version
  is the only signal of what the vendored copy should be — see
  [ADR-010](decisions/ADR-010-vendored-lenis-smooth-scroll.md).

## Maintenance Mapping

| Change Type | Documents to Update |
|-------------|-------------------|
| New API endpoint | `API.md`, `ARCHITECTURE.md`, `SECURITY.md` (classify auth — see [ADR-004](decisions/ADR-004-path-scoped-auth.md)) |
| New module or dependency | `ARCHITECTURE.md`, `EXTENDING.md` |
| Auth/Security change | `SECURITY.md`, `DATAFLOWS.md`, and the relevant ADR |
| New env var | `ARCHITECTURE.md` (complete inventory), `DEPLOYMENT.md` (if production-relevant) |
| Deployment change | `DEPLOYMENT.md`, [ADR-007](decisions/ADR-007-nginx-static-and-proxy.md) |
| New frontend component | `ARCHITECTURE.md` (module table **and** script load order), `DATAFLOWS.md` |
| New CSS file or stylesheet | `ARCHITECTURE.md` (load order), `STYLEGUIDE.md` |
| New or changed design token | `STYLEGUIDE.md` — re-measure contrast if a colour changed |
| Change to `data-perf` behaviour | `STYLEGUIDE.md`, [ADR-009](decisions/ADR-009-runtime-performance-tiers.md) |
| Error handling change | `DEVELOPMENT.md` |
| New extension pattern | `EXTENDING.md` |
| Architectural decision change | **New ADR** superseding the old one — never edit an accepted ADR in place. See [decisions/README.md](decisions/README.md) |

## Enterprise-Readiness Status

Re-scored on 2026-10-16 against the review rubric that scored the portal 58/100 the same day,
after the `enterprise-readiness-hardening` change
([openspec](../openspec/changes/enterprise-readiness-hardening/proposal.md)).

| Area | Before | Now | What changed / what is left |
|---|---|---|---|
| Security design | 8 | 8.5 | Startup refuses weak or malformed config; revocation and lockout fail closed. **Left:** rotate `AUTH_JWT_SECRET` on every server (it is in git history) |
| Documentation | 8 | 9 | ADR-013, probes, metrics, container and config checks documented; stale `.env` claim fixed |
| Testing and CI | 7 | 8.5 | ESLint, `tsc --noEmit` (JSDoc), coverage floor 89 % (measured 91.98 %), route-gate test, multi-process tests |
| Code structure | 5 | 7.5 | Route table (`lib/routes/`), request context, settings module, auth split into `lib/auth/`. **Left:** `files-service.js` is still ~1,000 lines |
| Configuration | 6 | 8.5 | One declaration table, every value validated at startup, `--check-config` |
| Deployment and ops | 5 | 6.5 | Dockerfile, probes for supervisor and load balancer. **Left:** image not yet built in CI, `public/` move not yet committed |
| Scalability and failover | 3 | 6.5 | Shared SQLite security state (multi-process on one host), content index, snapshot refreshed off the request path. **Left:** multi-host without a shared disk needs Redis (ADR-013) |
| Monitoring | 3 | 7.5 | `X-Request-Id`, one trace line per request with duration, Prometheus `/metrics`, `/readyz` |
| Repo hygiene | 4 | 5.5 | `graphify-out/` untracked. **Left:** the pending uncommitted work tree |

**Score: about 74/100.** The remaining gap to ~82 is operational: rotate the secret, commit and
tag, build the image in CI, and run the two-instance check behind nginx (tasks 1.1, 1.2, 1.4,
2.4, 11.x, 12.1 in the change).
