# 🎨 Redesign Plan — files-server-web

> **Purpose:** Phased, safe, and reviewable UI/UX redesign of the CloudAvid File Portal.
> **Scope:** Visual + layout only. Zero business logic changes without explicit approval.
> **Foundation:** Based on `ai/project-rules.md` + direct source inspection.
> **Prerequisites:** Read `ai/project-rules.md` before executing any task in this plan.

---

## ⚠️ Documentation Consistency Report

Before executing this plan, note the following:

| Item | Status | Notes |
|---|---|---|
| `ai/project-rules.md` | ✅ Read | Reflects source code accurately |
| `ai/design.md` | ❌ **Not available** | No design specification was provided. This plan assumes the redesign brief will be delivered before Phase 4. Tasks below are structured around *safe restyle patterns*, not a specific visual target. |

### Source-vs-Docs Inconsistencies Found

1. **`browse.html` script gap** — `browse.html` does NOT load `theme.js` or `performance-monitor.js`, while `index.html` does. This means theme toggling and performance tiering silently break if a user lands directly on `browse.html`. Flagged in `project-rules.md` §6 as a pre-existing bug. **Action:** documented — do not fix without approval.
2. **Unreferenced assets** — Several `.webp` and `.png` files in `assets/icon/` appear unreferenced (`Log.webp`, `template.webp`, `sandbox.webp`, `iso.webp`, `images.webp`, `fyladLogo2.webp`, `rakaard-logo.webp`, `plaividlogo.png`). **Action:** leave in place; do not delete during redesign.
3. **Two identical `sortFilterWrap` IDs** — `home.js` uses `#sortFilterWrap` and `browse.js` also uses `#sortFilterWrap`. Since they render on different routes, this does not currently collide, but it is fragile. **Action:** documented — do not rename without approval.
4. **Duplicate CSS blocks** — `.filter-dropdown-wrap` styles exist in both `browse.css` and `home.css`. Consolidation is a refactor, not a redesign. **Action:** documented — do not merge without approval.

---

## Phase 1 — Analysis (Read-Only)

**Goal:** Confirm every assumption before touching a pixel.

### 1.1 Confirm Architecture
- ✅ Vanilla JS + IIFE modules
- ✅ No build step, no framework, no TypeScript
- ✅ Nginx `autoindex_format json` as backing API
- ✅ SPA routed via custom `router.js`

### 1.2 Confirm Reusable Components
Pieces that are rendered in more than one place or expected to feel consistent:

| Component | Defined In | Used By |
|---|---|---|
| Navigation bar | `index.html`, `browse.html` | Both HTML shells |
| Buttons (`.btn`, `.btn-primary`, `.btn-sm`, `.btn-icon`) | `components.css` | Home, Browse, Banner |
| Inputs (`.input-wrap`) | `components.css` | Home search, Browse search |
| Filter dropdowns (`.filter-dropdown-wrap`, `.filter-pill`, `.filter-option`) | `home.css`, `browse.css` | Home + Browse |
| View toggles (`.view-toggle`, `.vt-btn`) | `browse.css`, `home.css` | Home + Browse |
| Cards (`.card`, `.resource-card`, `.panel`) | `components.css`, `home.css` | Home resources, Home releases panel, Home quick-access |
| Badges (`.badge`, `.badge-new`, `.badge-dir`, `.badge-file`) | `components.css` | Home releases, Browse rows, Autocomplete |
| Autocomplete dropdown (`.ac-dropdown`, `.ac-item`, `.ac-icon`) | `components.css` | Home search |
| Skeleton loaders (`.skeleton-box`, `.skeleton-line`) | `home.css` | Home resource cards, Browse rows |
| Empty state (`.empty-box`, `.empty-circle`) | `browse.css` | Browse |
| Language dropdown (`.lang-dropdown-wrap`) | `components.css` | Header only |
| Performance dropdown (`.perf-dropdown-wrap`) | `performance-modes.css` | Header only |
| Theme button (`.theme-btn`) | `components.css` | Header only |
| Status bar (`.status-bar`, `.status-item`) | `components.css`, `home.css` | Home footer |
| Banner (`.cav-banner-*`) | Injected via `banner.js` | Session-based popup |

### 1.3 Confirm Protected Logic
From `project-rules.md` §2 — do NOT modify:
- `assets/js/router.js`
- `assets/js/i18n.js`
- `assets/js/theme.js`
- `assets/js/services/resource-service.js`
- `assets/js/services/performance-monitor.js`
- `server.js`
- `nginx.conf`
- Inline `<head>` script in `index.html`

### 1.4 Confirm Redesign Scope
- ✅ In-scope: All `.css` files. HTML/JS **template literals only** inside `render*()` functions in `home.js`, `browse.js`, `autocomplete.js`, `banner.js`, plus static markup in `index.html` and `browse.html` (excluding the inline `<head>` script).
- ⛔ Out-of-scope: All JS logic outside template literals. All fetch calls. All state variables. All localStorage keys.

**Deliverable:** Confirmation note in the PR/commit that Phase 1 was completed.

---

## Phase 2 — Design System

**Goal:** Establish visual foundation before touching pages.

### 2.1 Review Existing Tokens
Files: `assets/css/tokens.css`

Review these categories:
- **Colors:** enterprise gold palette (`--a-1`…`--a-8`), semantic (`--danger`, `--success`, `--warning`), neutral (`--n-0`…`--n-12`), theme-scoped (`--bg`, `--bg-card`, `--text`, `--text-2`…).
- **Radius:** `--r1`…`--r6`, `--r-full`, `--radius`.
- **Spacing:** `--s1`…`--s24` (4px base).
- **Motion:** `--ease`, `--ease-out`, `--dur-1`…`--dur-3`.
- **Shadow:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-card`.
- **Typography:** `--font` (Inter), `--mono` (JetBrains Mono).

### 2.2 Define Required Visual Changes
> This section MUST be filled in once the design brief (`ai/design.md` or equivalent) is provided. Until then, defer.

Template:
```
Token: --a-5
Current value: #ffb800
New value: <to be defined>
Rationale: <to be defined>
```

### 2.3 Identify Shared Components
See §1.2 above. Any token change ripples through every entry in that table.

**Deliverable:** Updated `tokens.css` **only** (no consumer changes yet), verified visually across both themes.

**Validation:** Manual — load Home + Browse in both `data-theme="light"` and `data-theme="dark"`. Verify no unintended contrast regressions.

---

## Phase 3 — Shared Components

Each task below is atomic. Execute one at a time. Verify before moving on.

### Task 3.1 — Buttons
- **Files:** `assets/css/components.css` (button rules only)
- **Objective:** Refresh `.btn`, `.btn-primary`, `.btn-sm`, `.btn-icon`, `.theme-btn`, `.lang-pill`, `.perf-pill` visuals.
- **Dependencies:** Phase 2 tokens finalized.
- **Expected UI Changes:** Colors, radii, padding, shadows, hover/focus states.
- **Protected Functionality:**
  - `#themeBtn` click handler (see `theme.js`)
  - `.perf-option` and `.lang-option` click handlers
  - `data-perf-val` and `data-lang` attributes
- **Risks:** Changing button size can shift nav bar height and break `position: sticky` alignment.
- **Validation:** Manual — click theme, language, and performance dropdowns; verify no functional break.
- **Completion Criteria:** All buttons visually updated, no JS bindings broken, focus rings still visible.

### Task 3.2 — Inputs
- **Files:** `assets/css/components.css` (`.input-wrap`), `assets/css/browse.css` (`.browse-search`), `assets/css/home.css` (`.hero-search .input-wrap`)
- **Objective:** Unify input visual language.
- **Dependencies:** Phase 2.
- **Expected UI Changes:** Border, focus ring, padding, icon placement.
- **Protected Functionality:**
  - `#globalSearch`, `#localSearchInput` selectors
  - Autocomplete binding via `Autocomplete.bind()` — see `autocomplete.js`
  - `.search-keys` kbd shortcuts remain functional (Cmd/Ctrl+K)
- **Risks:** Padding changes break autocomplete dropdown alignment (positioned absolutely relative to `.input-wrap`).
- **Validation:** Manual — type in Home search → autocomplete dropdown must align correctly.
- **Completion Criteria:** Inputs consistent, autocomplete dropdown still anchored properly, RTL layout preserved.

### Task 3.3 — Cards & Panels
- **Files:** `assets/css/components.css` (`.card`), `assets/css/home.css` (`.resource-card`, `.panel`, `.hero-max`)
- **Objective:** Unified card language.
- **Dependencies:** Task 3.1 (buttons inside cards).
- **Expected UI Changes:** Border, shadow, spacing, hover elevation.
- **Protected Functionality:**
  - `.resource-card` is an `<a>` — clicking must still navigate via `router.js`.
  - `#resourcesGrid` container ID preserved.
  - `.resource-card-skeleton` and skeleton animation classes preserved.
- **Risks:** Removing `.stagger` class would kill entry animations. Removing `.resource-arrow` breaks translate-on-hover effect.
- **Validation:** Manual — click a resource card → should navigate to `/download/*` or `/files/*`.
- **Completion Criteria:** Cards restyled, navigation still works, skeleton state still renders.

### Task 3.4 — Tables
- **Files:** `assets/css/browse.css` (`.file-tbl`, `.trow`, `.thead`), `assets/css/home.css` (`.releases-table`)
- **Objective:** Refresh table styling.
- **Dependencies:** Phase 2.
- **Expected UI Changes:** Row height, borders, hover, header treatment.
- **Protected Functionality:**
  - `.file-tbl.grid-mode` class toggle (view mode)
  - `.trow` grid-template-columns (contract with `browse.js` DOM structure)
  - `#rows` container ID
  - `#empty` empty-state container
- **Risks:** Changing grid column count in `.trow` breaks alignment because `browse.js` builds rows with exactly 5 cells.
- **Validation:** Manual — switch view mode toggle → confirm grid/list transitions cleanly.
- **Completion Criteria:** List and grid modes both restyled, no column drift, empty state still renders.

### Task 3.5 — Dropdowns (Filter / Lang / Perf / Autocomplete)
- **Files:** `assets/css/components.css`, `assets/css/browse.css`, `assets/css/home.css`, `assets/css/performance-modes.css`
- **Objective:** Consistent dropdown UI across all four dropdown types.
- **Dependencies:** Task 3.1.
- **Expected UI Changes:** Menu positioning, option hover, active-state indicator.
- **Protected Functionality:**
  - `.show` class toggle contract (see `home.js`, `browse.js`, `performance-monitor.js`, `i18n.js`)
  - `.active` class on selected option
  - `data-val`, `data-lang`, `data-perf-val` attributes
  - RTL positioning via `[dir="rtl"]` selectors
- **Risks:** Duplicate `.filter-dropdown-wrap` rules in both `browse.css` and `home.css` — changes must be applied to both files consistently.
- **Validation:** Manual — open each dropdown in EN + FA; select items; verify state persistence.
- **Completion Criteria:** All four dropdown families visually consistent, functional in LTR + RTL.

### Task 3.6 — Navigation
- **Files:** `assets/css/components.css` (`.nav`, `.nav-bar`, `.nav-logo`, `.nav-tabs`, `.nav-tab`, `.nav-actions`), markup in `index.html` and `browse.html`
- **Objective:** Refresh top navigation.
- **Dependencies:** Task 3.1, Task 3.5.
- **Expected UI Changes:** Height, spacing, active-tab indicator, sticky behavior.
- **Protected Functionality:**
  - `#themeBtn`, `#langBtn`, `.perf-pill` all clickable
  - `data-i18n` attributes on all nav labels
  - `.nav-tab.active` semantic (aria-current="page")
- **Risks:** Nav-bar height changes affect `top: 12px` sticky positioning.
- **Validation:** Manual — scroll page, verify nav sticks; switch language, verify labels translate.
- **Completion Criteria:** Nav restyled on both HTML shells; all header controls functional.

### Task 3.7 — Badges & Status Indicators
- **Files:** `assets/css/components.css` (`.badge*`, `.status-*`), `assets/css/home.css` (`.status-bar`)
- **Objective:** Unified badge/status visual system.
- **Dependencies:** Phase 2.
- **Expected UI Changes:** Color, radius, typography.
- **Protected Functionality:**
  - `.badge-dir` and `.badge-file` are set by JS based on `f.type`
  - `.badge-new` used in release rows
- **Risks:** Removing dark-theme overrides breaks contrast.
- **Validation:** Manual — inspect badges in both themes.
- **Completion Criteria:** All badge variants visible in both themes.

### Task 3.8 — Autocomplete
- **Files:** `assets/css/components.css` (`.ac-dropdown`, `.ac-item`, `.ac-icon`, `.ac-highlight`, `.ac-footer`, `.ac-empty`)
- **Objective:** Refresh autocomplete panel.
- **Dependencies:** Task 3.2.
- **Expected UI Changes:** Shadow, item spacing, highlight color.
- **Protected Functionality:**
  - `.ac-dropdown.show` toggle contract
  - `.ac-item.active` keyboard-navigation state
  - `.ac-highlight` `<span>` injected by `highlightMatch()` — do NOT change class name
  - Keyboard nav (`↑ ↓ ↵ Esc`) untouched
- **Risks:** Removing `.ac-empty` styling breaks empty-state display.
- **Validation:** Manual — type in Home search, arrow-key through results, hit Enter.
- **Completion Criteria:** Autocomplete visually refreshed, keyboard nav still works.

### Task 3.9 — Skeleton Loaders
- **Files:** `assets/css/home.css` (`.skeleton-*`)
- **Objective:** Match new component visuals.
- **Dependencies:** Task 3.3, Task 3.4.
- **Expected UI Changes:** Color, shimmer speed.
- **Protected Functionality:**
  - `[data-perf="low"]` and `[data-perf="potato"]` overrides in `performance-modes.css` disable shimmer — behavior must be preserved.
- **Risks:** Changing skeleton dimensions can cause layout shift (CLS).
- **Validation:** Manual — throttle network in DevTools, observe skeletons before real content loads.
- **Completion Criteria:** Skeletons match final component footprint; no CLS on load.

### Task 3.10 — Banner
- **Files:** `assets/js/banner.js` — `BANNER_CSS` template literal ONLY
- **Objective:** Restyle in-app banner.
- **Dependencies:** Phase 2.
- **Expected UI Changes:** Card style, timer bar, close button.
- **Protected Functionality:**
  - `CONFIG` object (delay, storage keys) — DO NOT TOUCH
  - `.cav-out` class trigger for exit animation
  - `.cav-banner-timer-bar` CSS animation timing
  - `startTrigger()` and `showOnce()` logic
- **Risks:** Removing `.cav-out` animation breaks dismissal cleanup.
- **Validation:** Manual — clear session storage, wait 10s → banner appears; click close → banner dismisses.
- **Completion Criteria:** Banner visually refreshed; still appears once per session; still auto-dismisses.

---

## Phase 4 — Page Redesign

### Task 4.1 — Home Page (Hero + Search)
- **Files:** `assets/css/home.css` (`.hero-max`, `.hero-content`, `.hero-visual`, `.hero-search`, `.hero-pill`); `assets/js/home.js` (template literal inside `renderHeroSection()` only)
- **Objective:** Refresh landing hero.
- **Dependencies:** Task 3.1 (button), Task 3.2 (input).
- **Expected UI Changes:** Layout, illustration position, typography.
- **Protected Functionality:**
  - `#globalSearch`, `#searchBtn`, `#stopBtn` IDs
  - `#logoSwap` container (theme wipe target)
  - Autocomplete binding
  - Cmd/Ctrl+K global shortcut
  - `data-i18n` attributes for `heroTitle`, `desc`, `searchPh`, `searchBtn`, `stopBtn`, `portalStatus`
  - `<span class="avid">` and `<span class="accent">` inside title — required by CSS
- **Risks:** Removing the `hero-visual` container breaks theme-wipe animation.
- **Validation:** Manual — trigger theme toggle → wipe animates on hero logo. Cmd+K focuses search.
- **Completion Criteria:** Hero restyled; all bindings intact; RTL mirrors correctly.

### Task 4.2 — Home Page (Resource Cards Section)
- **Files:** `assets/css/home.css` (`.resources-section`, `.resources-grid`, `.resource-*`, `.section-*`); `assets/js/home.js` (template literals in `renderResourcesSection()`, `resourceCard()`, `renderSkeletonCards()`, `getResourceIcon()`)
- **Objective:** Refresh six-card grid.
- **Dependencies:** Task 3.3, Task 3.5, Task 3.9.
- **Expected UI Changes:** Card layout, icon treatment, status indicators.
- **Protected Functionality:**
  - `#resourcesGrid`, `#catFilterWrap`, `#sortFilterWrap`, `#refreshResourcesBtn`, `#viewGridBtn`, `#viewListBtn` IDs
  - `.filter-option[data-val]` values consumed by `bindFilterEvents()`
  - `.stagger` class controls entry animation
  - `.resource-card-skeleton` state
  - `<a class="resource-card" href="…">` — must remain a link for router
- **Risks:** Renaming `data-val` values breaks category filtering. Removing `.section-controls` container breaks refresh spinner.
- **Validation:** Manual — filter by category, sort by option, click refresh (spins), toggle grid/list.
- **Completion Criteria:** Grid renders, filtering + sorting + refresh all functional.

### Task 4.3 — Home Page (Latest Releases + Quick Access)
- **Files:** `assets/css/home.css` (`.bottom-grid`, `.panel`, `.releases-table`, `.quick-*`); `assets/js/home.js` (`renderBottomSection()`, `releaseRow()`, `quickItem()`)
- **Objective:** Refresh secondary panels.
- **Dependencies:** Task 3.3, Task 3.4, Task 3.7.
- **Expected UI Changes:** Panel layout, table styling.
- **Protected Functionality:**
  - Mock content (`v2.4.1`, etc.) is hardcoded — leave as-is unless product wants real data
  - `data-i18n` attributes for `latestReleases`, `latestSub`, `viewAll`, `thVersion`, etc.
- **Risks:** Changing responsive breakpoints affects table column hiding logic in `browse.css` media queries.
- **Validation:** Manual — resize to tablet + mobile widths, verify columns hide gracefully.
- **Completion Criteria:** Panels restyled, responsive behavior preserved.

### Task 4.4 — Home Page (Status Bar)
- **Files:** `assets/css/components.css` (`.status-bar`, `.status-item`); `assets/js/home.js` (`renderStatusBar()`)
- **Objective:** Refresh 4-column status bar.
- **Dependencies:** Phase 2.
- **Expected UI Changes:** Color, icon treatment, spacing.
- **Protected Functionality:**
  - `#lastSyncTime` ID — updated by `updateLastSyncTime()`
  - `data-i18n` attributes for all status labels
- **Risks:** Removing status-item structure breaks locale-formatted timestamp rendering.
- **Validation:** Manual — verify timestamp updates after data loads.
- **Completion Criteria:** Status bar restyled, timestamp functional.

### Task 4.5 — Home Page (Search Results Panel)
- **Files:** `assets/css/home.css` (`.results-panel`, `.results-bar`, `.res-*`); `assets/js/home.js` (`renderSearchResultsPanel()`, `addResult()`)
- **Objective:** Refresh recursive search results.
- **Dependencies:** Task 3.7.
- **Expected UI Changes:** Panel layout, row styling.
- **Protected Functionality:**
  - `#resultsBox`, `#resultsList`, `#resultsTitle`, `#progress` IDs
  - `scanAll()` fetches from `SEARCH_ROOTS` — do not touch
- **Risks:** Removing progress element breaks scan status updates.
- **Validation:** Manual — enter query, click Search, verify progress + results appear.
- **Completion Criteria:** Panel restyled, scan lifecycle intact.

### Task 4.6 — Browse Page
- **Files:** `assets/css/browse.css` (all); `assets/js/browse.js` (template literal inside `render()`, plus `svgIcon()`, `renderSkeletons()`, `showEmpty()`)
- **Objective:** Refresh file browser.
- **Dependencies:** Task 3.2, Task 3.4, Task 3.5, Task 3.9.
- **Expected UI Changes:** Breadcrumb, controls row, table density, empty state.
- **Protected Functionality:**
  - `#breadcrumb`, `#folderName`, `#folderCount`, `#fileCount`, `#localSearchInput`, `#typeFilterWrap`, `#sortFilterWrap`, `#viewList`, `#viewGrid`, `#tableContainer`, `#rows`, `#empty` IDs
  - `.trow` grid: `grid-template-columns: 40px 1fr 90px 160px 90px` — DOM builds 5 cells; keep count aligned
  - `<a class="f-link" data-file="true">` attribute for files — router uses this to skip interception
  - Grid-mode toggle logic
  - `applyFiltersAndRender()` search/filter/sort pipeline
- **Risks:** Any change to `.trow` column count corrupts the entire file table. Any change to `data-file` attribute breaks download links.
- **Validation:** Manual — browse `/files/`, `/download/download-User/ISO/`, filter, sort, search, switch view, click a directory (navigate), click a file (download).
- **Completion Criteria:** Full browser workflow functional with new visuals.

### Task 4.7 — Header (Both HTML Shells)
- **Files:** `index.html` (`<header class="nav">` block ONLY); `browse.html` (`<nav class="nav">` block ONLY)
- **Objective:** Ensure header is visually identical across both shells.
- **Dependencies:** Task 3.6.
- **Expected UI Changes:** Any markup adjustments needed to align both shells.
- **Protected Functionality:**
  - **DO NOT** touch inline `<head>` script in `index.html`
  - **DO NOT** touch script tags at bottom
  - Preserve all `data-i18n` attributes
- **Risks:** Reordering `<script>` tags in `index.html` breaks load order. Adding scripts to `browse.html` (to fix theme/perf gap) is **APPROVAL REQUIRED**.
- **Validation:** Manual — load both `/` and `/browse.html` directly, verify header identical.
- **Completion Criteria:** Shells visually aligned; script gap documented, not silently fixed.

---

## Phase 5 — Responsive & RTL

### Task 5.1 — Desktop Verification (≥1024px)
- **Files:** All CSS files
- **Objective:** Verify layout at design width (1240px page container).
- **Validation:** Manual DevTools review at 1440px, 1280px, 1024px.
- **Completion Criteria:** No horizontal scroll, no clipped elements.

### Task 5.2 — Tablet (640px–1023px)
- **Files:** Existing `@media (max-width: 1024px)` blocks in `home.css`, `browse.css`
- **Objective:** Verify hero stacks, resources grid becomes 2-col, releases table hides columns.
- **Validation:** Manual DevTools at 768px, 900px.
- **Completion Criteria:** Layout adapts gracefully; no overflow.

### Task 5.3 — Mobile (<640px)
- **Files:** Existing `@media (max-width: 640px)` and `@media (max-width: 480px)` blocks
- **Objective:** Verify hero search stacks vertically, file table collapses to 2 columns, status bar becomes 1-col, nav tabs hide.
- **Protected Functionality:**
  - `.search-keys` hides at ≤640px — preserve
  - `.nav-tabs` hides at ≤900px — preserve
- **Validation:** Manual DevTools at 375px, 414px, 480px.
- **Completion Criteria:** All touch targets ≥44px; no horizontal scroll.

### Task 5.4 — RTL (Persian)
- **Files:** All CSS files (`[dir="rtl"]` selectors), `assets/js/i18n.js` (do not modify)
- **Objective:** Verify Persian layout mirrors correctly.
- **Protected Functionality:**
  - `i18n.js` sets `dir="rtl"` on `<html>`
  - Existing `[dir="rtl"]` overrides in `browse.css`, `home.css`, `components.css`, `performance-modes.css`, banner CSS
  - `.hero-visual` mirrors via `rotate(12deg)` in RTL vs `rotate(-12deg)` in LTR
  - `.crumb-sep svg` flips via `scaleX(-1)` in RTL
- **Risks:** New styles added in Phases 3–4 without corresponding `[dir="rtl"]` overrides will break the Persian layout.
- **Validation:** Manual — switch to `فارسی` in header dropdown, review every page.
- **Completion Criteria:** All pages mirror correctly; no clipped or misaligned RTL content.

### Task 5.5 — Mixed-Language Content
- **Objective:** Verify English filenames render correctly within Persian UI (LogDB folder names, ISO names).
- **Validation:** Manual — browse `/download/download-User/LogDB/` in Persian mode.
- **Completion Criteria:** Filenames retain LTR direction inside RTL context (already handled by browser default for `<code>`, `<span>`, monospace — verify no unwanted mirroring).

---

## Phase 6 — Validation

### 6.1 Automated Validation
| Check | Status | Command |
|---|---|---|
| Type checking | ❌ **Not available** — no TypeScript in project |
| Linting | ❌ **Not available** — no ESLint config found |
| Unit tests | ❌ **Not available** — no test framework detected |
| Build | ❌ **Not applicable** — no build step (static files) |

**Limitation:** This project has **zero automated validation**. All verification is manual.

### 6.2 Manual Validation Checklist
Run the mock server:
```bash
node server.js
# Open http://localhost:3000
```

Then verify every item below:

**Rendering:**
- [ ] Home page loads without console errors
- [ ] Browse page loads at `/download/download-User/ISO/`
- [ ] Skeleton loaders appear before real content
- [ ] Resource cards populate with stats
- [ ] Empty folder shows empty-state UI

**Interactions:**
- [ ] Theme toggle → wipe animation fires on `#logoSwap`
- [ ] Language toggle → all `data-i18n` labels translate; `<html dir>` flips
- [ ] Performance dropdown → tier applied via `data-perf` attribute
- [ ] Home search input → autocomplete dropdown appears with matches
- [ ] Home Search button → recursive scan runs; progress updates
- [ ] Category filter → cards filter correctly
- [ ] Sort filter → cards reorder correctly
- [ ] Refresh button → spinner animates; cards reload
- [ ] Grid/List toggle → view changes; preference persists in `localStorage`
- [ ] Browse breadcrumbs → clickable; correct hierarchy
- [ ] Browse file click → triggers download (not routed)
- [ ] Browse folder click → routes to subfolder
- [ ] Banner → appears after 10s cumulative session; dismissible

**Responsive:**
- [ ] 1440px, 1280px, 1024px → desktop layout
- [ ] 900px, 768px → tablet layout
- [ ] 480px, 375px → mobile layout
- [ ] No horizontal scroll at any width

**RTL:**
- [ ] Switch to Persian → entire UI mirrors
- [ ] Breadcrumb chevrons flip direction
- [ ] Hero illustration flips to left side
- [ ] Dropdowns anchor to correct side

**Themes:**
- [ ] Light theme → correct colors, contrast, shadows
- [ ] Dark theme → correct colors, contrast, shadows
- [ ] Toggle between themes → no FOUC

**Accessibility:**
- [ ] Tab through header → focus rings visible
- [ ] Escape closes dropdowns
- [ ] Screen reader announces `aria-live` regions (banner, status)

### 6.3 Git Diff Review
Before committing each task:
```bash
git diff --stat
git diff <file>
```

**Rule:** If diff touches files outside the task's declared "Target files" — **STOP** and reassess.

---

## 📋 Post-Plan Report

### 1. Recommended Redesign Order
1. **Phase 1 — Analysis** (read-only)
2. **Phase 2 — Design tokens** (`tokens.css` only)
3. **Phase 3 — Shared components** in order: Buttons → Inputs → Cards → Tables → Dropdowns → Nav → Badges → Autocomplete → Skeletons → Banner
4. **Phase 4 — Pages** in order: Home Hero → Home Resources → Home Panels → Home Status → Home Search Results → Browse → Header alignment
5. **Phase 5 — Responsive & RTL** verification
6. **Phase 6 — Manual validation** of full workflow

### 2. High-Risk Tasks
- **Task 3.4 (Tables):** Changing `.trow` grid-template-columns breaks file listing.
- **Task 3.5 (Dropdowns):** Duplicated CSS across `browse.css` and `home.css` must stay in sync.
- **Task 4.6 (Browse Page):** Modifying `data-file` attribute breaks download interception.
- **Task 4.7 (Headers):** Any script reorder in `index.html` breaks the app.
- **Task 3.10 (Banner):** Editing anything outside `BANNER_CSS` inside `banner.js` breaks session tracking.
- **Task 5.4 (RTL):** New styles added without `[dir="rtl"]` overrides silently break Persian layout.

### 3. Tasks Requiring Approval

**APPROVAL REQUIRED** for any of the following:
- Adding `theme.js` or `performance-monitor.js` to `browse.html` (fixes pre-existing bug — but changes behavior).
- Renaming any `data-val`, `data-lang`, `data-perf-val`, `data-i18n`, or `id` used by JS.
- Consolidating duplicate `.filter-dropdown-wrap` CSS between `home.css` and `browse.css`.
- Renaming, deleting, or moving any `assets/icon/*` file.
- Removing the `.stagger`, `.cav-out`, `.wiping`, or `.spinning` classes.
- Removing or modifying inline `<head>` script in `index.html`.
- Adding a build system, transpiler, or external dependency.
- Adding automated tests (welcome — but a scope change).
- Escaping user-controlled data passed to `innerHTML` (security improvement — but a behavior change per `project-rules.md`).

### 4. Missing Information
- **`ai/design.md`** — not available. Phase 2.2 and all visual decisions in Phases 3–4 cannot be filled in until the design brief is delivered.
- **Production Nginx `mtime` field format** — cannot verify sort-by-date until tested against real production API.
- **Actual production directory structure** — `SEARCH_ROOTS` in `home.js` and `RESOURCE_REGISTRY` in `resource-service.js` are assumed correct but unverified.
- **Team decision on `browse.html`** — is it a supported entry point or legacy? Affects Task 4.7 scope.
- **Team decision on unreferenced assets** — should they be removed or kept?

### 5. Validation Limitations
- **No TypeScript** → no type checking possible.
- **No ESLint** → no lint checking possible.
- **No tests** → no automated regression detection.
- **No build step** → no compilation errors to catch issues.
- **Mock server ≠ production Nginx** → `try_files` fallback, large-file streaming, and real `autoindex_format json` `mtime` formatting cannot be verified locally.
- **`prefers-reduced-motion`, Battery API, `deviceMemory`, and hardware detection** are browser-dependent; behavior cannot be verified across all target devices from a single dev machine.
- **Full end-to-end verification requires deploying to a staging environment.**

---

*This plan must be revisited after each phase to incorporate lessons learned. If any completion criterion cannot be met, escalate before proceeding to the next phase.*
```

---

## 📊 Post-Generation Report

### 1. Recommended Redesign Order
**Phase 1 → Phase 2 (tokens only) → Phase 3 (shared components) → Phase 4 (pages) → Phase 5 (responsive/RTL) → Phase 6 (validation)**

Execute one atomic task at a time. Verify each task before moving on. Never batch tasks.

### 2. High-Risk Tasks
- **Task 3.4 (Tables)** — `.trow` column count contract with `browse.js`
- **Task 4.6 (Browse Page)** — `data-file` attribute contract with `router.js`
- **Task 4.7 (Headers)** — Script load order in `index.html`
- **Task 3.10 (Banner)** — Session tracking logic in `banner.js` is easy to break
- **Task 5.4 (RTL)** — Every new style needs an `[dir="rtl"]` counterpart

### 3. Tasks Requiring Approval
- Fixing the `browse.html` script gap (missing `theme.js` and `performance-monitor.js`)
- Consolidating duplicated `.filter-dropdown-wrap` CSS
- Any rename of `id`s, `data-*` attributes, or globals
- Any addition of build tooling, tests, or dependencies
- XSS-hardening of `innerHTML` templates (behavior change)

### 4. Missing Information
- **`ai/design.md` was not provided** → visual direction is undefined; Phase 2.2 is a placeholder
- Team decision needed on `browse.html` role (active vs legacy)
- Team decision needed on unreferenced assets in `assets/icon/`
- Production Nginx `mtime` format unverified
- Actual production directory structure vs hardcoded `SEARCH_ROOTS` / `RESOURCE_REGISTRY` unverified

### 5. Validation Limitations
- **No TypeScript, no ESLint, no test suite, no build step** — this project has zero automated validation
- All verification must be manual via the mock `server.js` at `http://localhost:3000`
- Mock server does not perfectly replicate production Nginx behavior (autoindex JSON format, file streaming, `try_files` fallback)
- Browser-dependent features (Battery API, `deviceMemory`, `prefers-reduced-motion`) cannot be tested exhaustively from one dev machine
- End-to-end confidence requires a staging deployment

**No application source code was modified.** ✅