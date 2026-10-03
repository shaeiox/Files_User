# Extending

## Purpose and Extension Model

This document explains how to safely extend the `files-server-web` system using its verified extension points and established patterns.

**No formal plugin mechanism was identified in the inspected repository.** Extensions are made by modifying existing modules or adding new modules that follow established patterns. There is no plugin registry, hook system, or external extension API.

---

## Adding or Changing an API Endpoint

### Where Routing Is Handled

All HTTP routing is in `lib/api-router.js` → `handleRequest()`. Routes are registered as `if (pathname === "/api/...")` blocks.

**Route blocks are ordered and none of them fall through** — a new block placed before the
SPA fallback will shadow static paths, and a block placed after an existing prefix match will
never be reached. Placement is a correctness concern, not a style preference.

### Classifying the Auth Requirement

**Routes are public by default.** Protection is opt-in via `pathRequiresAuth()`, which gates
only paths under `RELEASE_PVM` when `AUTH_ENABLED=true`. When adding an endpoint:

1. Does it expose release content? If yes, confirm the protected-prefix matching in
   `pathRequiresAuth()` covers your path shape — the check is **string-prefix based and runs
   before any file resolution**, so path containment does not protect it.
2. Does it expose anything else that should be confidential? If so, this is a **gap in the
   current model**, not something to fix quietly — see
   [ADR-004](decisions/ADR-004-path-scoped-auth.md).

Note the fail-open behaviour: with `RELEASE_PVM` unset, `pathRequiresAuth()` returns `false`
for everything.

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

There is no bundler and no module system. Modules coordinate through globals, which means
**nothing enforces the references between them** — a renamed global is a runtime
`ReferenceError`, not a build error. See
[ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md).

### Module Loading

Scripts are declared in `index.html` in dependency order. Three constraints are load-bearing:

1. **`assets/js/router.js` must load last** — it drives navigation and assumes every page
   module is registered.
2. **`assets/js/vendor/lenis.min.js` must precede `assets/js/smooth-scroll.js`** — reversing
   them silently disables smooth scrolling, because `smooth-scroll.js` degrades gracefully
   when `Lenis` is undefined rather than throwing.
3. **Stylesheet `tokens.css` must be the first `<link>`** — there is no `@import` and no
   bundler, so `<link>` order *is* the cascade order. If tokens load after consumers, the
   entire semantic layer resolves to nothing.

> `browse.html` is a separate, **unrouted** page with its own script and style set that does
> not stay in sync. **Change `index.html`.** See
> [ARCHITECTURE.md → Standalone HTML Pages](ARCHITECTURE.md#standalone-html-pages).

### Existing Modules

| Module | Purpose |
|--------|---------|
| `router.js` | SPA routing |
| `home.js` | HomePage component |
| `file-actions.js` | File Actions module (dedicated per-item actions) |
| `browse.js` | BrowsePage component |
| `services/resource-service.js` | API client |
| `i18n.js` | Internationalization (`en`, `fa`); sets `lang` and `dir` |
| `theme.js` | Theme toggle, `localStorage`-backed |
| `autocomplete.js` | Search autocomplete |
| `banner.js` | Banner component |
| `smooth-scroll.js` | Lenis wrapper, gated by `data-perf` and reduced motion |
| `services/performance-monitor.js` | Runtime tier detection → `data-perf` |
| `vendor/lenis.min.js` | Vendored third-party library — do not edit |

### Adding a Frontend Component

1. Create `assets/js/myComponent.js` using the IIFE pattern, exposing a single global
2. Add `<script src="/assets/js/myComponent.js" defer></script>` in `index.html` **before
   `router.js`**. Forgetting this fails silently — the module is simply undefined.
3. Register with the router if it is a page component
4. If it adds styles, add the stylesheet in `index.html` **after `tokens.css`**
5. Verify the change in both themes, both text directions, and at `data-perf="potato"` —
   local development only ever shows the `high` tier. See
   [STYLEGUIDE.md → Checklist](STYLEGUIDE.md#9-checklist-for-a-ui-change).
6. Update the module table in `ARCHITECTURE.md` **and** the script load order in the same file

### Adding a Stylesheet or Design Token

- **Tokens go in `assets/css/tokens.css`**, in the foundation or semantic layer. Never
  hardcode a colour, radius, or spacing value in a component rule — use `var(--token)`, and
  reference semantic tokens rather than foundation ramps.
- **New expensive visual effects need a `POTATO` override** in
  `assets/css/performance-modes.css`. An effect without one defeats the entire mechanism on
  exactly the devices it was built for.
- **If you change a colour token, re-measure the contrast ratios** quoted in its comment in
  `tokens.css`. Those comments document measured values for the token that is there now, not
  for the one you are about to write.
- Respect `prefers-reduced-motion` for any new animation.
- Use **logical properties** (`margin-inline-start`, `inset-inline-start`) so RTL works
  without a parallel override.

See [STYLEGUIDE.md](STYLEGUIDE.md) and
[ADR-008](decisions/ADR-008-css-custom-property-tokens.md).

### Browse Row Targets: Two Separate Categories

Before extending anything in a Browse row, identify which category you are changing:

| Category | What it is | Owner |
|----------|-----------|-------|
| **Primary navigation target** | The item **name** and the **icon beside it** — two sibling anchors resolving to the *same* destination (directory → browse target, file → download target) | `BrowsePage` (`assets/js/browse.js`) |
| **Dedicated File Action** | An independent per-item control rendered into a dedicated trailing column by the module | `FileActions` (`assets/js/file-actions.js`) |

The primary Browse icon is **not** a File Action and must not be implemented as one. Changing where an item
navigates to — including the icon target — is a `BrowsePage` / Browse-row-rendering change in
`renderFilesList()`, not an entry in the module's `ACTIONS` list.

**Current state:** directories have **no** dedicated File Action, and there is **no** dedicated `Open`
action; directory navigation is reached through the primary icon and name targets. The only dedicated
File Action today is **Download, for files**.

### Adding a Dedicated Browse File Action

Dedicated File Actions are owned by `assets/js/file-actions.js` (`FileActions`). `browse.js` only renders whatever the module returns for each row — action knowledge never moves into the Browse Page.

1. Add or modify an entry in the module's internal `ACTIONS` list (`id`, `appliesTo(item)`, `render(item, d)`)
2. Base applicability on the existing item model (`item.type` — `"directory"` | `"file"`); do not introduce a second capability/permission model
3. Build resource URLs only with `ResourceService.browseHref()` / `ResourceService.downloadHref()` — never concatenate URL strings
4. Use `<a>` for navigation/download actions: the router intercepts `a[href]` for SPA navigation, and downloads carry `data-file="true"` to bypass the router (native browser download)
5. Use `<button type="button">` only for future non-navigation actions (the router ignores non-anchor elements)
6. Keep action-specific behavior — markup, labels, escaping, event handling — inside `FileActions`; each control gets `aria-label`/`title` of the form `"{verb} {item name}"` and its SVG gets `aria-hidden="true"`
7. Add any new localized label to `assets/js/i18n.js` for both `en` and `fa`; do not reuse `btnOpen` as an action label — it belongs to `BrowsePage`'s primary icon
8. Do not duplicate action markup, URLs, or handlers in `browse.js` — the row already renders the module's output as its sixth cell
9. Keep the module a flat definition list; do not introduce a generic action/command framework unless a future requirement genuinely demands one

**Layout constraint (future consideration, not current behavior):** every `.trow` is an independent grid
container and the sixth (action) track is a **fixed `26px`**. A second action that does not fit inside 26px
will be squeezed by `flex-shrink` rather than expanding the track. If you add or widen a dedicated action,
revisit that track width (and `.f-actions`) in `assets/css/browse.css` so the header and every row keep
identical column boundaries.

**Source:** `assets/js/file-actions.js`, `assets/js/browse.js` → `renderFilesList()`, `assets/js/router.js`

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
    "dotenv": "^16.4.7",
    "lenis": "^1.3.26"
  }
}
```

| Dependency | Used by the server? | Notes |
|------------|---------------------|-------|
| `bcrypt` | Yes | `lib/auth-service.js` → password hashing. Falls back to `crypto.scrypt()` if unavailable. |
| `dotenv` | Yes | `lib/load-env.js` → `.env` parsing, with a built-in fallback parser if unavailable. |
| `lenis` | **No** | **Declared but unused.** The served smooth-scroll library is the vendored `assets/js/vendor/lenis.min.js`. The npm version is the only signal of what the vendored copy should be. |

### Installation

```bash
npm install
```

### Notes

- **Adding a backend dependency is an architectural decision.** Read
  [ADR-001](decisions/ADR-001-no-web-framework.md) first — the three-dependency list is
  deliberate, not incidental. A new runtime dependency should come with an ADR explaining
  what it replaces.
- **Frontend libraries cannot be imported from npm.** There is no bundler
  ([ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md)), so a browser-side library must
  be vendored into `assets/js/vendor/` and loaded as a same-origin script. The CSP
  (`script-src 'self' 'unsafe-inline'`, `font-src 'self' data:`) also forbids CDN hosts. A
  vendored file is a manual-update obligation with no integrity check — see
  [ADR-010](decisions/ADR-010-vendored-lenis-smooth-scroll.md).
- No build tooling or bundler is present.
- No development dependencies are declared.
- `package-lock.json` is present.

**Source:** `package.json` → `dependencies`

---

## Documentation Update Matrix

| Change | Documentation to Review |
|--------|------------------------|
| Architecture/module boundary | [ARCHITECTURE.md](ARCHITECTURE.md) + a **new ADR** |
| API route/response/auth behavior | [API.md](API.md), [SECURITY.md](SECURITY.md) |
| Filesystem access | [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) — mandatory |
| Request/data flow | [DATAFLOWS.md](DATAFLOWS.md) |
| Security behavior | [SECURITY.md](SECURITY.md), [ADR-003](decisions/ADR-003-hand-rolled-jwt.md), [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md) |
| Deployment/configuration | [DEPLOYMENT.md](DEPLOYMENT.md) + [ARCHITECTURE.md](ARCHITECTURE.md) |
| Frontend module or script order | [ARCHITECTURE.md](ARCHITECTURE.md) (table **and** load order) |
| CSS, design tokens, theming, RTL | [STYLEGUIDE.md](STYLEGUIDE.md) |
| `data-perf` behaviour | [STYLEGUIDE.md](STYLEGUIDE.md), [ADR-009](decisions/ADR-009-runtime-performance-tiers.md) |
| Development workflow/convention | [DEVELOPMENT.md](DEVELOPMENT.md) |
| Extension point | [EXTENDING.md](EXTENDING.md) (this file) |

**An architectural decision change requires a new ADR superseding the old one.** Never edit
an accepted ADR in place — see [decisions/README.md](decisions/README.md).

---

## Verification After an Extension

### Application Startup

```bash
npm start
```

Verify startup banner shows `FILES_ROOT is configured`.

### API/Manual Checks

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/categories
curl http://localhost:4000/api/auth/status
```

### Filesystem/Content Checks

```bash
curl http://localhost:4000/api/files/
curl -I http://localhost:4000/api/download/path/to/file
```

### Authentication Checks (when `AUTH_ENABLED=true`)

```bash
curl -X POST http://localhost:4000/api/auth/login -d '{"username":"...","password":"..."}'
curl -b "avid_session=..." http://localhost:4000/api/auth/status
```

> **Port:** `server.js` defaults to `4000`. Substitute your configured `PORT` if you have set
> one.

### Frontend/Manual Checks

- Load `http://localhost:4000/` in browser
- Verify SPA renders and API calls succeed
- Test browse navigation and file downloads
- **For any visual change:** verify in both themes, both directions (`dir="rtl"` and
  default), and at `data-perf="potato"`. Local development only shows the `high` tier. Use
  `document.documentElement.setAttribute('data-perf', 'potato')` to force a tier. Full
  checklist: [STYLEGUIDE.md](STYLEGUIDE.md#9-checklist-for-a-ui-change).
- **If you touched script or stylesheet loading:** confirm the page still works, and that
  the console shows no `X is not defined` — load-order breakage is silent

### Production Checks

`npm start` alone does not exercise nginx. If the change touches anything nginx handles
(proxying, TLS, static assets, deny rules, caching), verify against a real nginx — see
[ADR-007](decisions/ADR-007-nginx-static-and-proxy.md).

### Documentation Consistency

- Verify [API.md](API.md) matches actual endpoint behavior
- Verify [ARCHITECTURE.md](ARCHITECTURE.md) matches module structure
- Verify [SECURITY.md](SECURITY.md) matches security behavior

**Note:** No repository test suite or build pipeline was identified. Manual verification is the only validation approach.

---

## Non-Extension Boundaries

The following are **not** established extension mechanisms:

- **No formal plugin system** — no plugin registry, hook system, or extension API
- **No build step** — no bundler or transpiler, so no npm-importable frontend code path
- **No external extension API** — no mechanism for external code to register extensions at
  runtime
- **No generic action/command framework** — `FileActions` is a flat definition list and
  should stay one unless a requirement genuinely demands otherwise
- **No role-based authorization** — `users.json` carries a `role` field but nothing enforces
  it. Do not build on the assumption that roles are meaningful
- **No test harness** — no test framework is configured; verification is manual

Extensions require modifying existing source files or adding new files that follow
established patterns.
