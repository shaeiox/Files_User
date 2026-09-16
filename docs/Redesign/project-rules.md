# 🛡️ Project Rules — files-server-web

> **Purpose:** Safe AI-assisted UI/UX redesign guidelines for the CloudAvid File Portal.
> **Scope:** Frontend-only static SPA (HTML/CSS/Vanilla JS) served via Nginx.
> **Audience:** AI assistants, contributors, and reviewers performing visual redesigns.
> **Last Verified:** Based on the actual source code inspection (18 source files).

---

## 1. Actual Project Architecture

This project is **NOT** a modern SPA framework application (no React, Vue, Svelte, or Angular).
It is a **hand-crafted Vanilla JavaScript SPA** using the IIFE module pattern.

| Concern | Actual Implementation | Evidence |
|---|---|---|
| **Framework** | None — Vanilla JavaScript (ES6+) | No `package.json` dependencies for UI frameworks |
| **Language** | Plain JavaScript (no TypeScript, no JSX) | All `.js` files use IIFE modules |
| **Build System** | **None** — no bundler, no transpiler | Files are served as-is via Nginx / `server.js` |
| **Module Pattern** | IIFE (Immediately Invoked Function Expression) exposing a single global object per file | e.g., `const HomePage = (function() { ... })()` |
| **UI Framework** | None — hand-written HTML strings via `container.innerHTML` | See `home.js` `render()`, `browse.js` `render()` |
| **Styling System** | Hand-written CSS with CSS Custom Properties (Design Tokens); shadcn/ui-*inspired* naming | `assets/css/tokens.css` |
| **Component Architecture** | Page-level "component objects" returning `{ render }` methods; DOM built via template literals | `HomePage`, `BrowsePage`, `Autocomplete`, `CavBanner` |
| **Routing** | Custom client-side router intercepting `<a>` clicks and using `history.pushState` | `assets/js/router.js` |
| **State Management** | Module-scoped variables inside each IIFE (e.g. `let activeCategory`, `let rawResources`) | Local to each module; no global store |
| **Hooks** | None (not a hooks-based framework) | N/A |
| **API Services** | `fetch()` calls to Nginx `autoindex_format json` endpoint under `/__list/*` | `resource-service.js`, `browse.js`, `home.js`, `autocomplete.js` |
| **Authentication** | **None** — public read-only portal | No auth code exists |
| **Authorization** | **None** — Nginx-level access controls only | See `nginx.conf` deny rules |
| **Data Validation** | Minimal — defensive checks like `Array.isArray()`, `Number(x.size \|\| 0)` | `resource-service.js`, `browse.js` |
| **Business Logic** | Directory listing parsing, sorting, filtering, FPS-based adaptive performance tiering | `performance-monitor.js`, `resource-service.js`, `browse.js` `applyFiltersAndRender()` |
| **Shared Utilities** | Global helper functions (`getLang`, `getDict`) exposed by `i18n.js` | `assets/js/i18n.js` |
| **Testing Setup** | **None detected** — no test framework, no test files | No `*.test.js`, no `jest.config`, no CI test step |
| **Dev Server** | Node.js mock server with `MOCK_FS` in-memory tree | `server.js` |
| **Production Server** | Nginx with `autoindex_format json` for directory listings | `nginx.conf` |

### Key Runtime Dependencies (Load Order Matters)

Defined in `index.html`:
1. `resource-service.js` (defer)
2. `performance-monitor.js` (defer)
3. `theme.js` (defer)
4. `i18n.js` (defer)
5. `autocomplete.js` (defer)
6. `banner.js` (NOT defer — intentional early boot)
7. `home.js` (defer)
8. `browse.js` (defer)
9. `router.js` (defer — bootstraps the SPA)

### Global Objects Exposed
`Theme`, `Router`, `HomePage`, `BrowsePage`, `Autocomplete`, `CavBanner`, `PerformanceMonitor`, `ResourceService`, `i18n`, `getLang()`, `getDict()`, `applyLang()`.

---

## 2. File Classification

### 🟢 UI / Presentation (Safe to Restyle Freely)

Pure styling files. Redesign here is low-risk.

| File | Role |
|---|---|
| `assets/css/tokens.css` | Design tokens (colors, spacing, radius, shadows, motion). **Editable, but token *names* are consumed everywhere — see restrictions below.** |
| `assets/css/base.css` | Reset, typography, page container, backdrop, scrollbar |
| `assets/css/components.css` | Nav, buttons, inputs, badges, dropdowns, autocomplete visual styles |
| `assets/css/home.css` | Hero, resource cards, releases table, status bar |
| `assets/css/browse.css` | File browser table & grid mode |
| `assets/css/performance-modes.css` | Progressive visual degradation per performance tier — **UI-only, but tightly coupled to `data-perf` attribute values** |

### 🟡 Mixed Responsibility (UI + Logic — Edit With Care)

These files build DOM via template literals AND contain business logic.
UI markup can be changed, but **only inside the render helper functions**, not in the data pipeline.

| File | UI Portions (Safe) | Logic Portions (Protected) |
|---|---|---|
| `assets/js/home.js` | `renderHeroSection()`, `renderResourcesSection()`, `renderBottomSection()`, `renderSearchResultsPanel()`, `renderStatusBar()`, `renderSkeletonCards()`, `resourceCard()`, `releaseRow()`, `quickItem()`, `getResourceIcon()` — SVG icons and HTML strings | `loadResources()`, `applyFiltersAndRender()`, `scanAll()`, `bindSearchEvents()`, filter/sort logic |
| `assets/js/browse.js` | `render()` template literal, `svgIcon()`, `renderSkeletons()`, `showEmpty()`, `buildCrumbs()` DOM | `fetchList()`, `applyFiltersAndRender()`, sort comparator, `isHidden()`, `humanSize()`, `fmtDate()` |
| `assets/js/autocomplete.js` | `renderDropdown()` markup, `highlightMatch()`, dropdown item HTML | `initCache()`, `fetchDir()`, `search()`, keyboard navigation, `bindInput()` |
| `assets/js/banner.js` | `BANNER_CSS` string, `show()` HTML template, icons | `CONFIG` (delay, storage keys), `startTrigger()`, `fireTrigger()`, session tracking, `showOnce()` |
| `index.html` | Nav markup, dropdowns, aura backdrop, footer, `<meta>` tags | Inline `<script>` for **theme/perf FOUC prevention** — **do not remove or reorder** |
| `browse.html` | Nav, footer (legacy standalone entry — mostly unused in SPA flow) | Script load order |

### 🔴 Protected Logic (Requires Explicit Approval)

**Do NOT modify these without an explicit human-approved reason.**
Changing them will break the app's core behavior, routing, i18n, or performance model.

| File | Why Protected |
|---|---|
| `assets/js/router.js` | Custom SPA router. Controls link interception, `pushState`, back/forward navigation, and mounts pages into `#app`. Regex `fileExtensions` decides file-vs-route behavior. |
| `assets/js/i18n.js` | i18n dictionary (`en` / `fa`), `applyLang()` DOM patcher, `data-i18n`/`data-i18n-ph`/`data-i18n-html` attribute contract. Every visible string in the app depends on these keys. |
| `assets/js/theme.js` | Theme resolver, `localStorage` key `cav_theme`, wipe animation trigger, meta `theme-color` sync. |
| `assets/js/services/resource-service.js` | Data layer. Registry of resource paths, cache TTL, `/__list/` fetch contract, stats computation. |
| `assets/js/services/performance-monitor.js` | Adaptive performance engine. Hardware detection, FPS monitoring, tier classification, `data-perf` attribute contract, localStorage key `cav_perf_tier`. |
| `server.js` | Dev/mock server. `MOCK_FS` tree, `/__list/` API contract, MIME map, SPA fallback logic. |
| `nginx.conf` | Production configuration. TLS, security headers, `autoindex_format json`, SPA fallback via `@spa`, deny rules. **Any change is a production infra concern.** |

### 🖼️ Static Assets (Non-Code)

Located in `assets/icon/`. Twelve images (`.webp`, `.png`). Safe to replace visually, but **filenames are hard-coded** in:
- `home.js` → `/assets/icon/avid-logo-dark.webp`, `/assets/icon/avid-logo-light.webp`
- `index.html`, `browse.html` → `/assets/icon/logo.webp`, `/assets/icon/files-logo.webp`

Renaming assets requires updating every reference.

---

## 3. Redesign Safety Rules

### ✅ Allowed Changes (No Approval Needed)

- Modifying property **values** in any `.css` file (colors, spacing, sizing, borders, shadows, transitions).
- Changing HTML **markup structure** inside render functions (`renderHeroSection`, `resourceCard`, `renderSkeletonCards`, `svgIcon`, etc.) **as long as**:
  - All `data-i18n*` attributes are preserved.
  - All element `id`s referenced elsewhere in JS are preserved (see §4).
  - All CSS class names that trigger JS behavior are preserved.
- Swapping inline SVG icons for new SVG icons.
- Adjusting responsive breakpoints and media queries.
- Adding new visual states (`:hover`, `:focus-visible`, `:active`) via CSS.
- Reordering DOM elements *within* a section, provided no JS query selectors break.
- Adjusting animation durations, easing curves, and `@keyframes`.
- Enhancing accessibility (adding `aria-*`, improving focus rings, contrast).

### ⛔ Restricted Changes (Require Approval)

- Changing any **fetch URL** (`/__list/*`, `/download/*`, `/files/*`).
- Modifying the **response shape** expected from `/__list/` (`name`, `type`, `size`, `mtime`).
- Modifying the **`RESOURCE_REGISTRY`** array in `resource-service.js` (paths, IDs, icon types, i18n keys).
- Changing **localStorage / sessionStorage keys**:
  - `cav_theme` (theme.js)
  - `cav_perf_tier` (performance-monitor.js)
  - `cav_resources_cache` (resource-service.js)
  - `ui_lang` (i18n.js)
  - `view_mode` (browse.js)
  - `session_cav_banner_shown`, `cav_banner_session` (banner.js)
- Renaming or removing i18n **keys** in `i18n.js` — many are referenced in templates via `d.keyName`.
- Modifying the **filter/sort pipeline** in `home.js#applyFiltersAndRender()` or `browse.js#applyFiltersAndRender()`.
- Modifying the **search engine** logic in `home.js#scanAll()`.
- Modifying **hardware detection or FPS thresholds** in `performance-monitor.js#CONFIG` or `classifyDevice()`.
- Changing the **link-interception regex** in `router.js` (`fileExtensions`).
- Editing `nginx.conf` (production infrastructure).
- Editing the `MOCK_FS` tree in `server.js` (unless adding demo data explicitly requested).
- Removing or reordering the **inline FOUC-prevention script** in `index.html <head>`.

### 🟠 Approval Required (Discuss Before Doing)

- Moving files between directories.
- Renaming any file in `assets/js/` or `assets/css/`.
- Renaming any global object (`HomePage`, `Router`, `Theme`, etc.).
- Changing the signature of a `render(container [, path])` function.
- Adding a new external dependency (CDN or npm) — the project is intentionally dependency-free apart from Google Fonts.
- Introducing a build step or transpiler.
- Splitting a page module into sub-modules.
- Introducing TypeScript, JSX, or any framework.
- Modifying script load order in `index.html` or `browse.html`.

---

## 4. Functionality Preservation Rules

The following behaviors **must remain functional** after any redesign. If a design change appears to break one, **stop and report before proceeding**.

### Critical DOM Contracts (IDs Referenced by JS)

These `id` attributes MUST exist in rendered output — JS will fail silently otherwise:

**Global (in `index.html`):**
- `#app` — SPA mount point (router.js)
- `#themeBtn` — theme toggle (theme.js)
- `#currentLangLabel` — language pill label (i18n.js)
- `#currentPerfLabel` — performance pill label (performance-monitor.js)

**Home Page (rendered by `home.js`):**
- `#globalSearch`, `#searchBtn`, `#stopBtn`
- `#logoSwap` — theme wipe animation target (theme.js)
- `#catFilterWrap`, `#sortFilterWrap`
- `#refreshResourcesBtn`, `#viewGridBtn`, `#viewListBtn`
- `#resourcesGrid`, `#resultsBox`, `#resultsList`, `#resultsTitle`, `#progress`
- `#lastSyncTime`

**Browse Page (rendered by `browse.js`):**
- `#breadcrumb`, `#folderName`, `#folderCount`, `#fileCount`
- `#localSearchInput`
- `#typeFilterWrap`, `#sortFilterWrap`
- `#viewList`, `#viewGrid`
- `#tableContainer`, `#rows`, `#empty`

### Critical CSS Class Contracts

JS toggles these classes — do not repurpose them:
- `.show` on `.perf-dropdown-wrap`, `.filter-dropdown-wrap`, `.lang-dropdown-wrap`, `.ac-dropdown`, `.perf-debug-panel`, `.perf-toast`
- `.active` on tabs, filter options, view toggle buttons, lang options
- `.wiping` on `#logoSwap`
- `.spinning` on `#refreshResourcesBtn`
- `.cav-out` on `.cav-banner`
- `.grid-mode` on `#tableContainer`

### Critical HTML Attribute Contracts

- `data-i18n`, `data-i18n-ph`, `data-i18n-html` — consumed by `applyLang()` in `i18n.js`
- `data-theme` on `<html>` — set by `theme.js`, styled by `tokens.css`
- `data-perf` on `<html>` — set by `performance-monitor.js`, styled by `performance-modes.css`
- `data-lang` on `.lang-option` buttons
- `data-perf-val` on `.perf-option` buttons
- `data-val` on `.filter-option` buttons
- `data-link`, `data-file` on `<a>` — consumed by `router.js`
- `dir="rtl"` / `dir="ltr"` on `<html>` — set by `i18n.js`, styled everywhere

### Functional Flows That Must Continue Working

1. **SPA navigation** — clicking any internal `<a>` transitions without page reload; back/forward buttons work.
2. **Directory browsing** — `/download/*` and `/files/*` paths render `BrowsePage`.
3. **File downloads** — links matching `fileExtensions` regex trigger real browser download (not routed).
4. **Autocomplete search** — typing in `#globalSearch` shows filtered results from pre-cached directories.
5. **Full recursive search** — clicking Search button scans all `SEARCH_ROOTS` recursively.
6. **Filter & sort** — dropdowns on both Home and Browse pages re-render lists correctly.
7. **View toggles** — grid/list modes persist to `localStorage`.
8. **Theme switching** — light/dark toggle with wipe animation on `#logoSwap`.
9. **Language switching** — EN/FA switch flips `dir`, translates all `data-i18n*`, re-renders active page.
10. **Performance tiering** — auto-detects on load, adjusts on FPS drop, respects `prefers-reduced-motion` and Battery API.
11. **Banner** — appears once per session after 10s cumulative time; dismissible; auto-hides.
12. **FOUC prevention** — inline `<head>` script sets `data-theme` and `data-perf` before first paint.
13. **Resource cards** — show live stats, "Updated"/"Offline" status, error fallback on API failure.
14. **Breadcrumbs** — rebuild correctly for nested paths, respect RTL chevron flip.

### Conflict Resolution Protocol

If a redesign requirement would break any of the above:
1. **Stop immediately.**
2. Describe the conflict in plain language.
3. Propose 2–3 alternative approaches.
4. Wait for human decision before proceeding.

---

## 5. AI Workflow Rules

Every redesign task must follow this sequence:

### Step 1 — Inspect
- Read the relevant CSS file(s).
- Read the relevant `render*()` function(s).
- Identify which IDs, classes, and `data-*` attributes are in scope.

### Step 2 — Identify Affected Components
- List every file that will be touched.
- List every dependent module (via grep for IDs/classes/globals).

### Step 3 — Explain Planned Changes
Present a written plan **before writing code**, covering:
- What will change visually.
- Which files will change.
- Which selectors/attributes will be preserved.
- Which behaviors are considered untouched.

### Step 4 — Identify Risks
Explicitly call out:
- Any DOM contract at risk.
- Any performance-tier CSS rule affected.
- Any RTL/i18n implications.
- Any load-order or FOUC concern.

### Step 5 — Implement Only Approved Scope
- Do not opportunistically refactor.
- Do not "clean up" unrelated code.
- Do not add libraries.
- Preserve IIFE module pattern.
- Preserve existing indentation and code style.

### Step 6 — Review Changed Files
- Diff each change mentally against §3 restrictions.
- Confirm every JS-referenced ID/class still exists.
- Confirm all `data-i18n*` attributes preserved.

### Step 7 — Run Available Validation
This project has **no automated tests**. Manual validation checklist:
- Load `index.html` → does the Home page render?
- Toggle theme → does wipe animation fire?
- Switch language to `fa` → does layout flip to RTL?
- Navigate to `/download/download-User/ISO/` → does Browse page render?
- Change performance tier manually → do styles update?
- Trigger a filter and sort → do results update?

### Step 8 — Report Unverified Behavior
- If a change cannot be visually verified, **say so explicitly**.
- Never claim a feature "still works" without confirming it.
- List any behaviors that depend on real Nginx (not mock server) and cannot be verified locally.

---

## 6. Report Summary

### 🔴 Critical Protected Files
1. **`assets/js/router.js`** — one bug here breaks all navigation.
2. **`assets/js/i18n.js`** — dictionary key removals silently break translated UI.
3. **`assets/js/services/resource-service.js`** — API contract & registry.
4. **`assets/js/services/performance-monitor.js`** — hardware detection, FPS engine, `data-perf` attribute contract.
5. **`assets/js/theme.js`** — FOUC prevention depends on `data-theme` synchronization.
6. **`nginx.conf`** — production infrastructure with SSL, security headers, and the crucial `autoindex_format json` API.
7. **`index.html` inline `<head>` script** — prevents theme/perf flash on load; deleting it causes visible flicker.

### ⚠️ Potential Architecture Risks

1. **Zero test coverage.** No automated verification exists — every change relies on manual testing.
2. **Vanilla JS + IIFE globals.** Cannot tree-shake; any renamed global breaks its consumers silently.
3. **`innerHTML` for rendering** in `autocomplete.js`, `browse.js`, `home.js` — flagged as high-severity XSS risk in the earlier security audit. Redesigns that pass user-controlled data (filenames, search queries) through templates must continue to be treated as unsafe surfaces. **Filenames from the server are rendered without escaping.**
4. **Hard-coded resource paths** in `resource-service.js#RESOURCE_REGISTRY` mirror production Nginx paths — dev/prod drift is a real risk.
5. **Load-order-dependent scripts** in `index.html` — `banner.js` intentionally lacks `defer`; changing this breaks the session-time trigger.
6. **CSS specificity coupling.** `[data-theme]` × `[data-perf]` selectors chain deeply in `performance-modes.css`; adding new state attributes can create specificity wars.
7. **Two HTML entry points** (`index.html`, `browse.html`) with different script sets — `browse.html` is missing `theme.js` and `performance-monitor.js`, which is likely a **pre-existing bug**.
8. **RTL implementation is manual.** Every new UI must be tested in both `ltr` and `rtl` — no automatic mirroring exists.
9. **Mock server (`server.js`) diverges from Nginx.** Some Nginx-specific behavior (e.g., `try_files` fallback, real large-file streaming) cannot be reproduced locally.
10. **CORS wildcard `Access-Control-Allow-Origin: *`** in `server.js` — dev-only, flagged in security audit.

### 👀 Areas Requiring Human Review Before Any Change

1. Any change to the **`RESOURCE_REGISTRY`** — must match production Nginx paths.
2. Any change to **`nginx.conf`** — production deployment.
3. Any modification to the **inline `<head>` script** in `index.html`.
4. **Discrepancy between `index.html` and `browse.html`** — should `browse.html` load `theme.js` and `performance-monitor.js`? Needs human decision.
5. Any decision to escape user-controlled content in `innerHTML` templates — this is a **behavior change** that could affect filename display with special characters.
6. Any change to `autoindex_format json` response parsing — `mtime`, `size`, `type` field expectations.

### ❓ Assumptions and Unknowns

1. **Assumption:** The project has no test suite. → *Verified: none found.*
2. **Assumption:** `browse.html` is a legacy/standalone entry point, not the primary route. → *Unverified — needs confirmation from the team.*
3. **Assumption:** All `assets/icon/*.webp` files are actively used. → *Partially unverified — `Log.webp`, `template.webp`, `sandbox.webp`, `iso.webp`, `images.webp`, `fyladLogo2.webp`, `rakaard-logo.webp`, `plaividlogo.png` do not appear referenced in scanned source files.*
4. **Unknown:** Whether Nginx production actually returns `mtime` in the expected format for `date-desc` sorting.
5. **Unknown:** Whether the `SEARCH_ROOTS` array in `home.js` matches actual production directory structure.
6. **Unknown:** Whether the CI/CD pipeline (if any exists) performs any linting or validation before deploy.
7. **Unknown:** The intended behavior when a user's browser blocks `localStorage` — all modules degrade gracefully via `try/catch`, but the UX impact hasn't been characterized.

---

*This document reflects the state of the codebase as inspected. It must be updated whenever the architecture materially changes.*