# Development

## Repository Structure

```
files-server-web/
├── server.js                 # Entry point — HTTP server, boot sequence, SIGINT handling
├── index.html                # SPA shell — the primary page (script + stylesheet order is load-bearing)
├── 404.html                  # 404 page, served by serve404()
├── nginx.conf                # Production nginx config (template — ships with real hostnames/cert paths)
├── package.json              # Dependencies and scripts
├── readme.md                 # Project overview and quick start
├── .env                      # Environment variables — MUST NOT be committed (currently tracked, see SECURITY.md)
├── lib/                      # Backend modules
│   ├── api-router.js         # HTTP request pipeline + route dispatch
│   ├── files-service.js      # Filesystem abstraction, path containment
│   ├── auth-service.js       # JWT sessions, bcrypt, brute-force lockout
│   ├── rate-limiter.js       # In-memory per-IP rate limiting
│   ├── http-utils.js         # Response helpers, JSON body parser, security headers
│   ├── static-handler.js     # SPA shell, 404, static files, download streaming
│   ├── load-env.js           # .env loading (dotenv + built-in fallback parser)
│   ├── logger.js             # ANSI terminal logging
│   ├── idle-timer.js         # Client-side session auto-lock
│   └── hash-password.js      # CLI password hashing
├── public/assets/
│   ├── js/                   # Frontend modules (IIFE, no build step)
│   │   ├── router.js         # SPA router — MUST load last
│   │   ├── home.js           # HomePage component
│   │   ├── browse.js         # BrowsePage component
│   │   ├── file-actions.js   # File Actions module (per-item actions)
│   │   ├── i18n.js           # Internationalization (en, fa); sets lang + dir
│   │   ├── theme.js          # Dark/light toggle, localStorage-backed
│   │   ├── autocomplete.js   # Search autocomplete
│   │   ├── banner.js         # Banner component
│   │   ├── smooth-scroll.js  # Lenis wrapper, gated by perf tier + reduced motion
│   │   ├── services/
│   │   │   ├── resource-service.js   # API client
│   │   │   └── performance-monitor.js # Runtime tier detection → data-perf
│   │   └── vendor/
│   │       └── lenis.min.js  # Vendored third-party smooth-scroll library
│   ├── css/                  # Stylesheets — order is load-bearing, no @import
│   │   ├── tokens.css        # Design tokens + @font-face — MUST be first
│   │   ├── base.css          # Reset, typography, container, ambient backdrop
│   │   ├── components.css    # Navbar, buttons, inputs, cards, footer
│   │   ├── home.css          # Home page
│   │   ├── browse.css        # Browse page (partially frozen)
│   │   ├── performance-modes.css  # [data-perf] overrides
│   │   └── lenis.css         # Upstream Lenis requirements — do not edit
│   ├── fonts/                # Self-hosted WOFF2 (Inter, Vazirmatn, JetBrains Mono, Cinzel)
│   └── icon/                 # Image assets
├── data/                     # Runtime data
│   └── users.json            # User database (bcrypt hashes) — gitignored in intent, see SECURITY.md
├── docs/                     # Project Brain documentation
│   ├── decisions/            # Architecture Decision Records
│   └── *.md                  # Reference documents
├── openspec/                 # OpenSpec change proposals (see Change Workflow below)
│   ├── config.yaml
│   ├── specs/
│   └── changes/              # Active + archived proposals
├── graphify-out/             # Generated knowledge graph — analysis artifact, not source
├── .opencode/                # Agent skills configuration
└── node_modules/             # Installed dependencies
```

### Generated and Non-Source Paths

These exist in the tree but are not application source. Do not edit them, and do not treat
them as authoritative:

| Path | What it is |
|------|------------|
| `graphify-out/` | Generated knowledge graph (`graph.json`, `graph.html`, `GRAPH_REPORT.md`). An analysis/navigation aid — **not** an architectural source of truth. |
| `openspec/changes/archive/` | Completed, archived proposals |
| `server-out.log`, `server-err.log` | Local run artifacts |
| `doxygen_warnings.log` | Local doc-generation artifact |
| `.opencode/skills/` | Vendored agent skills |

---

## Local Setup

### Prerequisites

- Node.js runtime
- npm

No specific Node.js version is pinned by the repository.

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
FILES_ROOT=/path/to/your/files
PORT=4000
```

> **Do not commit `.env`.** It holds `AUTH_JWT_SECRET`. The repository's `.gitignore`
> currently has this rule commented out and the file is tracked — see
> [SECURITY.md → Known Security Debt §1](SECURITY.md#1-env-is-tracked-in-git-with-a-live-signing-secret-high).

> **`loadEnv()` is env-first.** An existing `process.env` value is never overwritten by
> `.env`. If a variable seems ignored, check your ambient shell environment before editing
> the file.

For auth, also generate a secret (32 chars minimum) and create the user database:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # → AUTH_JWT_SECRET
mkdir data
node lib/hash-password.js admin123                                          # → paste into data/users.json
```

Full variable reference: [ARCHITECTURE.md → Environment Variables](ARCHITECTURE.md#environment-variables).
Schema for `data/users.json`: [ARCHITECTURE.md](ARCHITECTURE.md#datausersjson-schema).

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

The startup banner prints the resolved port and the `FILES_ROOT` status. Confirm it says
`FILES_ROOT is configured` — every file endpoint fails without it.

> **Port note.** `server.js` defaults to `4000`, which is what production nginx proxies
> to. Keep `PORT=4000` explicit when deploying — see [DEPLOYMENT.md → nginx](DEPLOYMENT.md#7-nginx).

---

## Development Workflow

### Backend Changes

Backend modules are in `lib/`. Each module exports a public API via `module.exports`.

- **Adding a route:** Add an `if (pathname === "/api/...")` block in `lib/api-router.js` → `handleRequest()`
- **Adding a file operation:** Add an exported function to `lib/files-service.js`
- **Adding auth logic:** Extend `lib/auth-service.js`

### Frontend Changes

Frontend modules are in `public/assets/js/`. Each module is an IIFE that attaches to `window`.

- **Adding a page component:** Create `public/assets/js/myPage.js` (IIFE pattern), add `<script>` tag in `public/index.html`
- **Adding an API method:** Extend `public/assets/js/resource-service.js`

### No Build Step

There is no build, bundling, or transpilation step. Frontend files and CSS are served
directly by the application (development) or nginx (production).

**Two ordering contracts follow from this, and both fail silently when broken:**

- `<script>` order in `public/index.html` — `router.js` must be last, and
  `vendor/lenis.min.js` must precede `smooth-scroll.js`.
- `<link>` order in `public/index.html` — `tokens.css` must be first, or the entire design-token
  layer resolves to nothing.

Adding a frontend module means adding a `<script>` tag; forgetting it produces an undefined
global, not an error. See [ARCHITECTURE.md → Frontend Script Loading Order](ARCHITECTURE.md#frontend-script-loading-order).

### Change Workflow (OpenSpec)

Non-trivial changes are proposed through [OpenSpec](https://github.com/Fission-AI/OpenSpec)
before implementation. Each proposal lives in `openspec/changes/<change-name>/`:

```
openspec/changes/<name>/
├── proposal.md     # What and why — the problem, scope, and approach
├── design.md       # Technical design and trade-offs
├── tasks.md        # Implementation checklist
└── specs/          # Capability specs (delta specs per capability)
```

Configuration is in `openspec/config.yaml`. Completed proposals move to
`openspec/changes/archive/`.

Currently in flight: `enterprise-ui-redesign`, `a11y-ux-debt`, `browse-file-actions`,
`project-brain-documentation`.

This workflow does not replace the docs maintenance mapping — a change usually needs both a
proposal and updates to the `docs/` set.

### Manual Verification

1. Start the server: `npm start` — confirm the banner shows `FILES_ROOT is configured`
2. `curl http://localhost:4000/api/health`
3. `curl http://localhost:4000/api/categories`
4. `curl http://localhost:4000/api/files/`
5. `curl http://localhost:4000/api/auth/status`
6. Load `http://localhost:4000/` — verify SPA renders, browse navigation works, downloads work

---

## Tests and Validation

**No test suite exists.** There are no test files, no test framework configuration, no test
scripts in `package.json`, and no CI configuration. Manual verification is the only
validation approach.

This is an accepted consequence of the no-framework, no-build posture
([ADR-001](decisions/ADR-001-no-web-framework.md),
[ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md)). The compensating control is
manual verification discipline — treat the checklists in this document and in
[EXTENDING.md → Verification After an Extension](EXTENDING.md#verification-after-an-extension)
as the test plan.

### Manual Validation

- Startup banner reports `FILES_ROOT is configured`
- `/api/health` returns `200 OK`
- File listing, download, and search endpoints behave
- Auth flow (login, status, logout) when `AUTH_ENABLED=true`
- SPA renders, browse navigation and downloads work
- **Frontend visual changes:** verify in both themes, both directions (`dir="rtl"` and
  default), and at `data-perf="potato"` — see the
  [STYLEGUIDE.md checklist](STYLEGUIDE.md#9-checklist-for-a-ui-change). Local development
  only ever shows the `high` tier.

### Coverage Gaps Worth Knowing

| Area | Why it is untested | Risk if broken |
|------|--------------------|----------------|
| Path containment (`resolveInsideRoot()`) | Security-critical, no tests | Arbitrary file read — see [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) |
| JWT sign/verify, algorithm-confusion rejection | Hand-rolled crypto | Session forgery — see [ADR-003](decisions/ADR-003-hand-rolled-jwt.md) |
| Version comparison in `listLatestReleases()` | Non-trivial sorting | Wrong release shown as "latest" |
| `summarizeTree()` recursion and depth cap | O(tree), depth-sensitive | Stack overflow or hang on deep trees |
| Frontend modules | No module system to test without a DOM harness | Silent `ReferenceError` from global-scope coupling |

The first two are the ones to watch in any future security review.

---

## Code Conventions

### Observed Conventions

| Convention | Example | Source |
|------------|---------|--------|
| `'use strict'` at module top | All `lib/*.js` files | `lib/api-router.js` |
| JSDoc headers for modules | `@file`, `@module`, `@brief`, `@description` | `lib/files-service.js` |
| IIFE module pattern (frontend) | `const Module = (function () { ... })()` | `public/assets/js/home.js` |
| `serviceError()` for errors | `serviceError(httpStatus, code, message)` | `lib/files-service.js` |
| `sendJSON()` for responses | `sendJSON(res, status, data)` | `lib/http-utils.js` |
| Environment via `process.env` | `process.env.FILES_ROOT` | `lib/files-service.js` |
| Lowercase module names | `lib/api-router.js`, `lib/files-service.js` | Repository structure |
| camelCase functions | `listCategories()`, `getDownloadTarget()` | `lib/files-service.js` |
| PascalCase frontend modules | `HomePage`, `BrowsePage`, `Router` | `public/assets/js/*.js` |
| Double quotes for requires, single for most strings | `require("http")` | `server.js` |
| Semantic CSS tokens, never literals | `var(--bg-card)` | `public/assets/css/tokens.css` |

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

1. **Decide the auth requirement explicitly.** Routes are public by default; protection is
   opt-in via `pathRequiresAuth()`. A route touching `RELEASE_PVM` content must be verified
   against the protected-prefix matching. See
   [ADR-004](decisions/ADR-004-path-scoped-auth.md).
2. Add the route handler in `lib/api-router.js` → `handleRequest()`. **Route order matters** —
   `handleRequest()` is a flat sequence of `if` blocks, so a new block placed before the SPA
   fallback will shadow static paths.
3. Implement business logic in the appropriate service module (`lib/files-service.js`,
   `lib/auth-service.js`).
4. Route any filesystem access through `resolveInsideRoot()`. A direct `fs` call on a
   request-derived path is a containment bypass — see
   [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md).
5. Return the response via `sendJSON()` or `sendText()` from `lib/http-utils.js`.
6. Update [API.md](API.md), [ARCHITECTURE.md](ARCHITECTURE.md), and — for anything
   auth-related — [SECURITY.md](SECURITY.md).

**Source:** `lib/api-router.js` → `handleRequest()`

---

## Frontend Development

### Module Loading

Scripts are declared in `public/index.html` in dependency order. Two constraints are load-bearing:

- **`public/assets/js/router.js` must load last** — it drives navigation and assumes every page
  module is registered.
- **`public/assets/js/vendor/lenis.min.js` must precede `public/assets/js/smooth-scroll.js`** — reversing
  them silently disables smooth scrolling, because `smooth-scroll.js` degrades gracefully
  when `Lenis` is undefined rather than throwing.

Stylesheets follow the same model: `tokens.css` must be the first `<link>`, or the entire
design-token layer resolves to nothing. There is no `@import` and no bundler, so `<link>`
order *is* the cascade order.

> The Browse group (`browse.js`, `browse-icons.js`, `bulk-download.js`, `selection-model.js`,
> `marquee-select.js`, `file-inspector.js`) and
> `releases.js` are ES modules that `router.js` imports when their route is entered; they have no
> `<script>` tag. Their stylesheets are loaded the same way.

**Source:** `public/index.html` → `<script>` and `<link>` tags

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

**Source:** `public/assets/js/home.js` → `HomePage`

### API Client

Use `ResourceService` for all API calls:

```javascript
const resources = await ResourceService.getResources();
const files = await ResourceService.listFiles(relPath);
await ResourceService.login(username, password);
```

**Source:** `public/assets/js/resource-service.js`

---

## Debugging / Troubleshooting

### Startup Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FILES_ROOT is not set` | `FILES_ROOT` env var missing | Add to `.env` file |
| `FILES_ROOT path was not found` | Path does not exist | Create the directory |
| `FILES_ROOT is not a directory` | Path is a file | Point to a directory |
| `FILES_ROOT is configured` but listings are empty | Root has no visible subdirectories | `assertCategoryStructure()` requires at least one non-hidden directory |
| `AUTH_JWT_SECRET must be at least 32 characters` | Secret too short | Generate a longer one |
| Env var ignored, `.env` looks right | Env-first policy — `process.env` wins | Check ambient shell exports; `unset` the variable |

**Source:** `lib/files-service.js` → `resolveConfiguredRoot()`, `lib/auth-service.js` → `getJwtSecret()`, `lib/load-env.js` → `loadEnv()`

### Auth Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `AUTH_DISABLED` | `AUTH_ENABLED` not set to `true` | Set `AUTH_ENABLED=true` in `.env` |
| `LOCKED_OUT` | Too many failed attempts | Wait out `AUTH_LOCKOUT_MINUTES`, or restart the process (lockouts are in-memory) |
| `INVALID_CREDENTIALS` | Wrong username/password | Verify credentials; username match is case-insensitive |
| Release downloads not protected | `RELEASE_PVM` unset — `pathRequiresAuth()` returns false | Set `RELEASE_PVM`; **there is no fail-closed behaviour** |
| All sessions invalid after a restart | Expected in dev: lockout/lock state is in-memory | — |

**Source:** `lib/auth-service.js` → `login()`, `checkLockout()`, `pathRequiresAuth()`

### nginx/API Routing

| Symptom | Cause | Fix |
|---------|-------|-----|
| 502 Bad Gateway | `proxy_pass` port doesn't match the Node port | nginx proxies to `127.0.0.1:4000`; check `PORT` in the portal environment and `systemctl status files-portal` |
| 404 on API routes | nginx not proxying `/api/` | Check `location /api/` in `nginx.conf` |
| SPA routes not working | Missing `@spa` fallback | Check `location @spa` in `nginx.conf` |
| Static assets 404 | Wrong root path | Check `root` directive in `nginx.conf` |
| Fonts load but revalidate every request | `.woff2` missing from the static-asset regex | Add `woff2` to `~* \.(?:css\|js\|png\|jpg\|jpeg\|svg\|ico)$` — see [ADR-007](decisions/ADR-007-nginx-static-and-proxy.md) |

**Source:** `nginx.conf` → `location /api/`, `location @spa`

### Frontend Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `X is not defined` in console | Module `<script>` tag missing or out of order | Check `<script>` order in `public/index.html`; `router.js` must be last |
| Page renders unstyled / wrong colours | `tokens.css` not first | Check `<link>` order in `public/index.html` |
| Smooth scrolling does nothing | `vendor/lenis.min.js` after `smooth-scroll.js`, or `data-perf="potato"`, or reduced-motion requested | Check script order, then `document.documentElement.dataset.perf` |
| Effects missing on a fast machine | `data-perf` is not `high` | Inspect `data-perf`; `performance-modes.css` is stripping effects by design |
| Persian text renders in a Latin font | Vazirmatn not loaded | Verify `public/assets/fonts/Vazirmatn-*.woff2` are served (nginx cache policy differs from local) |
| A component ignores theme or RTL | Rule uses a physical property or a raw literal | Use logical properties and semantic tokens — see [STYLEGUIDE.md](STYLEGUIDE.md) |

### Log Files

`server-out.log` and `server-err.log` in the repository root are local run artifacts from
previous `npm start` invocations. They are not consumed by the application.

---

## Documentation Maintenance

When behaviour changes, update the relevant reference document:

| Change | Update |
|--------|--------|
| New API endpoint | [API.md](API.md), [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md) |
| New module/dependency | [ARCHITECTURE.md](ARCHITECTURE.md), [EXTENDING.md](EXTENDING.md) |
| Auth/Security change | [SECURITY.md](SECURITY.md), [DATAFLOWS.md](DATAFLOWS.md), relevant ADR |
| New env var | [ARCHITECTURE.md](ARCHITECTURE.md) (complete inventory), [DEPLOYMENT.md](DEPLOYMENT.md) |
| Deployment change | [DEPLOYMENT.md](DEPLOYMENT.md), [ADR-007](decisions/ADR-007-nginx-static-and-proxy.md) |
| New frontend component | [ARCHITECTURE.md](ARCHITECTURE.md) (table **and** script order), [DATAFLOWS.md](DATAFLOWS.md) |
| New CSS file or token | [ARCHITECTURE.md](ARCHITECTURE.md) (link order), [STYLEGUIDE.md](STYLEGUIDE.md) |
| Change to `data-perf` behaviour | [STYLEGUIDE.md](STYLEGUIDE.md), [ADR-009](decisions/ADR-009-runtime-performance-tiers.md) |
| Error handling change | [DEVELOPMENT.md](DEVELOPMENT.md) |
| New extension pattern | [EXTENDING.md](EXTENDING.md) |
| Architectural decision change | **New ADR** superseding the old one — never edit an accepted ADR in place |

**JSDoc in source files remains the source of truth for module/function implementation
details.** The `docs/` set is authoritative for architecture and behaviour; ADRs are
authoritative for intent. Where an ADR and a reference document disagree, the ADR wins on
intent and the reference document should be corrected to match current behaviour.
