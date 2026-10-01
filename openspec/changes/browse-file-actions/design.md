# Design: Browse Files File Actions

## Context

The Browse Files page (`assets/js/browse.js`, `BrowsePage`) renders file rows with a single interaction: the file-name link (directory → SPA navigation, file → download via `data-file="true"`). No action controls exist today (Phase 1 — EXTRACTED). The feature direction requires file actions as independent interactions behind a dedicated module:

```
BrowsePage → File Row → FileActions module → Open / Download / future actions
```

Constraints established by the codebase (all EXTRACTED unless noted):

- Vanilla JS IIFE frontend modules in `assets/js/`, PascalCase globals, `<script>` tags before `router.js` (`docs/EXTENDING.md` lines 136–167; `docs/DEVELOPMENT.md` line 140).
- SPA router intercepts `a[href]` clicks at document level; links with `data-file="true"` (or file-extension hrefs) are skipped (`router.js` lines 114–130).
- `ResourceService.browseHref()` / `downloadHref()` are the URL primitives (`resource-service.js` lines 22–29).
- File rows are built by `renderFilesList()` (`browse.js` lines 342–383); rows have no click handlers; `bindEvents()` binds only search/dropdown/view controls (lines 389–462).
- Row grid: `.file-tbl .trow` = `grid-template-columns: 40px minmax(0, 1fr) 90px 160px 90px` (`browse.css` line 171); columns 3–5 hidden via `nth-child` in grid mode (line 380–383) and ≤640px (line 419–422), where the grid collapses to `36px minmax(0, 1fr)` (line 414).
- Stylesheets: `tokens.css` → `base.css` → `components.css` (shared primitives, e.g. `.badge`) → `home.css` (page) → `browse.css` (page) → `performance-modes.css` (global overrides). All are loaded by `index.html`.
- Generic control styles `.row-actions`, `.icon-btn`, `.download-btn` live in `home.css` (lines 1041–1094) and are used only by `home.js`.
- Global `:focus-visible` outline in `base.css` line 256; i18n via `getDict()`/`applyLang()`; no `btnOpen` key exists; `btnDownload` exists (`i18n.js` lines 67/197).
- No automated test suite (`docs/DEVELOPMENT.md` line 115).
- `index.html` is the served SPA shell (`serveSPA()` always reads `index.html` — `static-handler.js` lines 19–26); `browse.html` lacks `resource-service.js` and appears to be a legacy, unserved shell (INFERRED — see Risks).

## Goals / Non-Goals

**Goals:**

- A dedicated File Actions module, independent of `browse.js`, owning action definitions, applicability, rendering, and action-specific event behavior.
- Independent, per-item action controls: Open (directories), Download (files), derived from existing `file.type`.
- Full interaction isolation from the name link, row, and unrelated handlers; compatibility with the unmodified router and ResourceService.
- Preservation of every existing Browse behavior (name link, filtering, sorting, searching, view modes).
- Accessibility: keyboard operability, visible focus, accessible names, no hover-only traps.
- Localized extensibility: future actions added primarily inside the module.
- Appropriate sizing: no framework, no command pattern, no backend changes.

**Non-Goals:**

- Implementing future actions (Preview, Copy Link, Rename, Delete, Share).
- Changing `router.js`, `resource-service.js`, backend `lib/*`, `home.css`, or Home page behavior.
- Making rows clickable or changing the file-name link's behavior.
- A generic command/menu/toolbar/action framework, action palettes, or context menus.
- Introducing a test framework or CI.
- Fixing pre-existing quirks (directory names ending in recognized extensions; `browse.html` legacy shell).

## Decisions

### 1. Module boundary

A single new IIFE module, global `FileActions`, is the sole owner of:

- the list of action definitions (initially Open and Download),
- applicability rules (`appliesTo(item)`),
- rendering of the actions container and its controls (markup, attributes, accessible names),
- action-specific event handling (none required for the two initial actions; see §12),
- isolation guarantees (controls are independent elements; future JS actions are handled with module-scoped delegation).

Explicitly **outside** the module (unchanged owners):

| Concern | Owner |
|---|---|
| Fetching/listing, filtering, sorting, searching, view mode, row construction | `browse.js` (BrowsePage) |
| URL primitives (`browseHref`, `downloadHref`, `listFiles`, …) | `resource-service.js` (ResourceService) |
| SPA navigation, link interception, `data-file` contract | `router.js` (Router) |
| Backend listing/download endpoints | `lib/api-router.js`, `lib/files-service.js`, `lib/static-handler.js` |

### 2. Module location and name

**Decision:** `assets/js/file-actions.js`, exposing global `FileActions`.

Evidence:

- `docs/EXTENDING.md` (lines 163–167): *"Create `assets/js/myComponent.js` using IIFE pattern; add `<script>` in `index.html` before `router.js`."* — the documented extension path for a frontend component.
- `assets/js/` layout convention: top-level files are page components (`home.js`, `browse.js`) and shared UI components (`autocomplete.js`, `banner.js`, `i18n.js`, `theme.js`); `assets/js/services/` holds infrastructure (`resource-service.js` = API client, `performance-monitor.js` = monitoring) — not UI widgets. File Actions is a shared UI component → top-level.
- `docs/DEVELOPMENT.md` line 140: *"PascalCase frontend modules | HomePage, BrowsePage, Router"* → `FileActions`.
- Script tag: `<script src="/assets/js/file-actions.js" defer></script>` in `index.html`, placed immediately **before `browse.js`** (its consumer) and, as required, **before `router.js`**. (`browse.js` only calls `FileActions` at render time, so ordering is belt-and-braces; it also documents the dependency.)

Rejected alternatives:

| Alternative | Why rejected |
|---|---|
| Helper functions inside `browse.js` | Violates the mandatory separation: Browse must not own action implementation details |
| `assets/js/services/file-actions.js` | `services/` is API/infrastructure, not UI; the module makes no fetch calls of its own |
| New directory (`assets/js/components/`) | Invents structure that does not exist in this project |
| `file-actions.js` inside `lib/` | `lib/` is backend-only, never served to the browser |

Note: `browse.html` (legacy shell) will not receive the script tag — see Risks (R4).

### 3. Responsibilities of BrowsePage (`browse.js`)

Retains, unchanged: fetching (`fetchList()` → `ResourceService.listFiles()`), 401/404 error states, filtering, sorting, searching, stats, view mode, skeleton loading, breadcrumbs, row construction.

Changes (integration only, inside `renderFilesList()`):

- After the existing five cells, append one cell: `<div class="f-actions">${FileActions.render(item, d)}</div>`.
- Extend the `thead` markup with a matching empty sixth cell (same pattern as the existing empty first cell above the icon column).
- Nothing else: no action definitions, no applicability logic, no href logic for actions, no action event handlers.

### 4. Responsibilities of the File Actions module

- Maintain the action definition list (id, applicability predicate, render function).
- Decide which actions apply to an item — from `item.type` only.
- Render the actions container + controls: element choice, `href`, `data-file`, `title`, `aria-label`, inline SVG, escaping.
- Own action-specific event behavior (initially none; future JS actions bind here with `preventDefault`/`stopPropagation`, precedent `home.js` lines 749–750).
- Guarantee isolation by construction: controls are siblings of the name link, never nested inside it.

Public API (minimal): `FileActions.render(item, d)` → HTML string. `item` is the Browse-normalized `{ name, relPath, type, size, modified }`; `d` is the i18n dictionary already available in `renderFilesList()`. A local `escapeHtml()` helper lives in the module — consistent with existing convention (`browse.js` line 517 and `home.js` line 483 each define their own).

Internal shape (illustrative, not a framework):

```javascript
const ACTIONS = [
    { id: "open",     appliesTo: (it) => it.type === "directory", render: (it, d) => /* <a> … */ },
    { id: "download", appliesTo: (it) => it.type === "file",      render: (it, d) => /* <a> … */ },
];
// render(item, d) → '<div class="f-actions">…filtered, joined…</div>'
```

A flat array of plain objects — not a registry service, dispatcher, or command hierarchy.

### 5. Responsibilities of ResourceService

Unchanged. File Actions **calls** `ResourceService.browseHref(item.relPath)` and `ResourceService.downloadHref(item.relPath)`; it never concatenates URL strings and never gains new methods. `listFiles()` stays a Browse concern.

### 6. Responsibilities of Router

Unchanged — `router.js` receives no edits. The module emits markup that satisfies the router's existing contract (§11, §12). Router behavior relied upon:

- interceptor matches `a[href]` (line 115) → Open anchors are SPA-navigated;
- `link.hasAttribute("data-file")` → return, no `preventDefault` (line 124) → Download anchors fall through to browser default;
- non-anchor elements are ignored → future `<button>` actions are never intercepted.

### 7. Action data flow

```
GET /api/files/{relPath}
  → api-router.js listPath → files-service.js listPath()
      → entries: { name, path, type: "directory"|"file", size, mtime }
  → browse.js fetchList() normalizes to { name, relPath, type, size, modified }
  → applyFiltersAndRender()  (search → filter → sort)
  → renderFilesList(items, d)
        ├─ name-link href: ResourceService.browseHref / downloadHref   (existing, unchanged)
        └─ actions cell:   FileActions.render(item, d)
              → ACTIONS.filter(a => a.appliesTo(item))   // reads item.type
              → a.render(item, d)                        // ResourceService.*Href(item.relPath)
              → '<div class="f-actions">…anchors…</div>'
        → row appended to #rows
```

No new state, no new store, no data flows through the module beyond the single item in → markup out call.

### 8. Rendering flow

1. `renderFilesList()` builds the row's five existing cells, then appends the actions cell (sixth child) containing `FileActions.render()` output.
2. Actions are **appended last** — deliberately, so the existing `nth-child(3|4|5)` rules (type/modified/size: `browse.css` lines 199–206, 380–383, 419–422) keep pointing at the same columns with zero index churn. The new cell is child 6.
3. `thead` gains an empty sixth cell so header and rows share the same track count (alignment holds either way because both use the same `.trow` template).
4. The container is always rendered (all API items are `directory` or `file`, so it is never empty in practice); this keeps grid placement uniform.
5. Re-renders: `renderFilesList()` fully rebuilds rows on filter/sort/search/view changes — actions are pure functions of the item, so no cache or invalidation logic exists.

### 9. Event flow

**Open (directory):**

```
click on <a class="f-action" href="/browse/el9/">
  → bubbles: .f-actions → .trow → #rows → … → document
  → router.js listener: closest("a[href]") matches
      not external / not target=_blank / not "#|mailto:"
      fileExtensions.test(href) false, no data-file
  → e.preventDefault() + navigate(href)
      → pushState + BrowsePage.render(app, path)   // SPA, no reload
  (document-level dropdown-close listeners in browse.js/i18n.js also fire — they only close
   open dropdowns; harmless and already the case for name-link clicks today)
```

**Download (file):**

```
click on <a class="f-action" href="/api/download/…" data-file="true">
  → router.js listener: link.hasAttribute("data-file") → return (no preventDefault)
  → browser default: GET /api/download/…
      → api-router.js → files-service.js getDownloadTarget() → static-handler.js streamDownload()
          → Content-Disposition: attachment → file downloads
```

**Isolation properties (why nothing else fires):**

- Actions are **siblings** of the `.f-name` anchor → clicking an action never activates the name anchor (and there is no invalid `<a>`-in-`<a>` nesting).
- **Rows have no click handlers** (`browse.js` `bindEvents()` binds only search/dropdown/view controls) → there is no row handler to accidentally trigger.
- The router handler is **type-aware** (`a[href]` + `data-file` checks) → it does exactly one correct thing per action.
- Therefore **no `stopPropagation()` is needed for the two initial actions** (evidence-based, not assumed: no intervening row/parent navigation handlers exist).

### 10. File vs directory capability handling

The only capability signal is the existing `type` field. `lib/files-service.js` `listPath()` returns `type: "directory"` or `type: "file"` exclusively; any other entry type (e.g. symlinks where neither `isDirectory()` nor `isFile()` holds) is filtered to `null` server-side (lines 209–228). The module therefore needs exactly two applicability predicates, both reading `item.type`. **No second capability model** (no permissions matrix, no feature flags, no `capabilities: []` array) is introduced; future actions extend the same predicates.

### 11. HTML element choice: `<a>` vs `<button>`

| Action | Element | Attributes | Rationale |
|---|---|---|---|
| Open | `<a>` | `href` = `browseHref(relPath)`, **no** `data-file` | It *is* a navigation; router must intercept it to perform SPA navigation (EXTRACTED: router only intercepts `a[href]`). Native Enter activation, browser semantics for links. |
| Download | `<a>` | `href` = `downloadHref(relPath)`, `data-file="true"` | Matches the two existing download conventions in the codebase (`browse.js` line 367 name links; `home.js` line 702 `.download-btn`). Browser default = download; `data-file` explicitly bypasses the router. |
| Future non-navigation actions (Copy Link, Delete, …) | `<button type="button">` | module-managed JS | Router ignores non-`a[href]` elements (EXTRACTED), so buttons can never trigger SPA navigation by accident; behavior is module-owned JS. |

**`data-file="true"` remains necessary** on Download anchors: the router's alternative guard is a file-**extension denylist** (`router.js` line 9) which cannot cover arbitrary filenames; the existing convention already sets `data-file` on **all** file links regardless of extension (`browse.js` line 367). Keeping it is both required for correctness and consistent.

**Keyboard:** anchors activate on Enter (native). `<button>` (future) would add Space activation natively as well.

### 12. Event propagation strategy

- **Open:** rely on the router's existing `preventDefault()` — the module adds none. Exactly one `navigate()` occurs.
- **Download:** rely on browser default — the router returns early on `data-file`; the module adds no handler, so `event.defaultPrevented` stays false and the download proceeds. The same mechanism the current name link uses.
- **`stopPropagation()`: not required for initial actions** — justified by §9 (no row handler exists; name link is a sibling; document-level listeners are idempotent dropdown closers). It would be defensive noise, not safety.
- **Future JS actions:** bound by the module via delegation scoped to the actions area (or a single module-level listener matching its own control attribute), calling `preventDefault()` + `stopPropagation()` — precedent: `home.js` `bindDownloadInterception()` lines 749–750. Because Browse never adds row-level click handlers (explicit non-goal), this remains sufficient.
- **Never** nest action controls inside the name anchor.

### 13. CSS / style ownership

**Decision:** the actions area and its controls are styled **in `assets/css/browse.css`** with browse-owned classes (`.f-actions`, `.f-action`), using design tokens (`var(--…)`) as the rest of `browse.css` does.

Analysis of the existing styles (`home.css` lines 1041–1094):

| Option | Verdict | Reason |
|---|---|---|
| Reuse `.row-actions` / `.icon-btn` / `.download-btn` from `home.css` in Browse | **Rejected** | Explicit architectural constraint: do not couple Browse to Home CSS. `home.css` is globally loaded, so it *would* work — that is precisely the coupling to avoid (page-specific sheet becoming an accidental shared dependency). `.download-btn` is also a labeled pill sized for the releases table, not a 52px file row. |
| Move those classes into `components.css` | **Rejected** | Touches Home page styles for Browse's benefit → Home regression risk for zero functional gain. Browse's needs differ (row-`hover`/`focus-within` reveal integration, actions-column alignment, compact icon controls inside a fixed-height row), so it would not be a clean move anyway. |
| **Define `.f-actions` / `.f-action` in `browse.css`** | **Chosen** | Matches the stylesheet architecture: page sheets own page patterns; `browse.css` already owns `.trow`, `.f-icon`, `.f-link`, `.f-sub`. Row-layout-coupled styles belong with the row. |

This is "replaced/extended" from the Phase 1 options: the *look* (26px ghost icon button, hover background) follows the `.icon-btn` precedent — but as browse-owned rules, not an import of Home's file. Truly generic primitives that both pages need already live in `components.css` (Browse already consumes `.badge` / `.badge-dir` / `.badge-file` from there — EXTRACTED); if a genuinely generic control style ever emerges, `components.css` is the correct future home. `home.css` is not modified.

### 14. File row layout

**List view (desktop)** — append one auto-sized track; the actions area is the rightmost column, sized to its 26px controls:

```css
.file-tbl .trow { grid-template-columns: 40px minmax(0, 1fr) 90px 160px 90px auto; }
```

> Adding a sixth child without a sixth track would wrap it onto an implicit second row (grid auto-placement) — the track addition is mandatory, not cosmetic.

**Narrow (≤640px)** — children 3–5 are `display: none`, so the visible children are 1, 2, 6; the template must gain a third track or child 6 wraps to row 2 under the icon:

```css
.file-tbl .trow { grid-template-columns: 36px minmax(0, 1fr) auto; }
```

(Actions **stay visible** on narrow screens — hiding them there would remove the feature on mobile.)

**Grid (cards) view** — `.trow` becomes a flex column; children 3–5 hidden; the actions cell naturally stacks below icon + name. `.f-actions` is centered horizontally in this mode.

**Visibility states:**

```css
.f-actions { opacity: 0; pointer-events: none; transition: opacity 120ms ease; }
.file-tbl .trow:hover .f-actions,
.file-tbl .trow:focus-within .f-actions { opacity: 1; pointer-events: auto; }
@media (hover: none) { .f-actions { opacity: 1; pointer-events: auto; } }
```

- **`opacity`, never `visibility`/`display`** — controls must stay tabbable so `:focus-within` can reveal them (spec requirement).
- `pointer-events: none` while reduced prevents accidental clicks on invisible controls; keyboard focus is unaffected by `pointer-events`.
- Reveal changes no layout → **no layout shift on hover**; `transition: opacity` only.
- **RTL:** grid tracks mirror automatically under `dir="rtl"` (same as today's size column); icons should be direction-neutral (e.g. folder-open, arrow-down download — the existing `home.js` download SVG is neutral). If a directional icon is chosen, flip it with the existing pattern (`html[dir="rtl"] … transform: scaleX(-1)`, precedent `browse.css` lines 71–73).
- **Row height** stays 52px (26px controls fit).
- **`performance-modes.css`** only disables transforms/animations on `.trow:hover` (lines 130, 194) — opacity reveal degrades to instant visibility, still functional; no perf-mode edits needed.

### 15. Accessibility behavior

- **Semantics:** both initial actions are anchors (`<a>`) — correct role for navigation/download links.
- **Accessible names:** `aria-label` + `title` = `"{verb} {item name}"`, e.g. `"Open el9"`, `"Download file.iso"` (escaped). Pattern precedent: `home.js` line 136 icon button uses `title` + `aria-label`. Labels come from i18n with code fallback: `d.btnDownload` (exists) and a new `d.btnOpen` key (en `"Open"`, fa `"باز کن"` — verify wording).
- **Decorative SVG:** `aria-hidden="true"`, `fill="none" stroke="currentColor"` (existing inline-SVG convention).
- **Keyboard:** Tab order follows DOM order — name link first, then actions (natural reading order). Enter activates (native anchor behavior).
- **Focus visibility:** global `:focus-visible` rule (`base.css` line 256) applies; `:focus-within` reveal ensures focused controls are visible even without hover.
- **No hover trap:** hover reveal is supplemented by focus-within reveal and the `(hover: none)` always-visible rule (covered by spec scenarios).
- **Language switch:** `applyLang()` re-runs after navigation; labels are rendered from `getDict()` at render time — same mechanism as every existing label in `browse.js` (no `data-i18n` needed for dynamically injected per-row markup, consistent with current rows).

### 16. Error handling

The two initial actions are **declarative anchors with zero asynchronous behavior** — there is no new code path that can fail, so **no new error handling is introduced**:

- Download failures surface exactly as today (browser download behavior; backend errors via the existing `sendServiceError()` pattern).
- Browse-level errors (401/404/network) remain owned by `fetchList()`'s existing in-page error states — untouched.
- If a future action becomes asynchronous, it must reuse existing patterns: client `ResourceService.parseError()` (sets `.status`/`.code`), server `serviceError()` + `sendServiceError()`, and the existing in-page error/empty UI (`showEmpty()` / `.resources-error`). **No global toast/error architecture is added.**

### 17. Compatibility considerations

| Area | Status |
|---|---|
| File-name link | **Unchanged** (explicit spec requirement): directory → SPA nav; file → `downloadHref` + `data-file` |
| `router.js` | No edits; contract satisfied via element/attribute choices (§11) |
| `resource-service.js` | No edits; consumed only |
| `home.css` / Home page | No edits |
| Filtering / sorting / searching / view modes / stats / 404 / auth states | No edits beyond the actions cell insertion in `renderFilesList()` |
| `data-file="true"` convention | Retained (downloads) |
| `i18n.js` | Additive keys only (`btnOpen` en/fa) |
| Grid mode, ≤640px, RTL, dark theme | Handled in §14; all use existing tokens/`[data-theme]` variables |
| `performance-modes.css` | No edits; degrade path is acceptable (§14) |
| `browse.html` legacy shell | Not updated (INFERRED unserved — see R4); `index.html` is updated |
| Pre-existing router quirk (directory named `foo.zip/` → extension regex skips SPA interception) | Out of scope; the Open action shares the exact href of today's name link, so behavior is no worse than status quo (R5) |
| Backend / API | No changes |

### 18. Testing / validation strategy

Repository reality: **no test suite, no framework, no test scripts** (`docs/DEVELOPMENT.md` line 115) — this change does not introduce one.

**Manual browser validation** (final task phase) — checklist:

1. Directory row: Open visible on hover → click → SPA URL updates, list renders, no full reload.
2. File row: Download visible → click → file downloads; exactly one download.
3. Name link regression: directory name click → SPA nav; file name click → download.
4. Search / type filter / sort / stats / list↔grid toggle → actions follow rows and stay type-correct.
5. Keyboard: Tab reaches name then actions; focused actions become visible; visible focus ring; Enter performs action.
6. Narrow viewport (≤640px): actions visible and functional; no layout wrap/overflow.
7. Grid view: actions stacked and functional.
8. RTL (`dir="rtl"`): layout mirrored, labels localized (fa), icons readable.
9. Language toggle (en↔fa): action labels localized after re-render.
10. Touch emulation (no hover): actions persistently visible.
11. `data-perf="low"` / `"potato"`: actions still visible/functional.
12. Console: no errors; Auth-enabled mode: downloads behave as before.

**Optional future testability:** applicability predicates (`appliesTo`) and href selection are pure functions of the item — trivially unit-testable *if* a framework is ever adopted. This is documented, not built: creating a test harness solely for this feature is out of scope.

## Architecture Sizing

Why this is appropriately sized for this codebase and not unnecessary abstraction:

- **One new file**, roughly 80–150 lines of IIFE code — the same shape as every other frontend module (`banner.js`, `autocomplete.js`).
- **Zero** backend, router, or service changes; Browse integration is ~2 lines (actions cell + thead cell); CSS is page-local; i18n is two additive keys.
- The "registry" is an **array of two plain objects** with `appliesTo` + `render` functions — data, not infrastructure. There is no dispatcher, no dependency injection, no event bus, no base class, no plugin loader.
- The design **reuses what exists** rather than generalizing it: router interception, `data-file`, `ResourceService` hrefs, i18n dictionary, `:focus-visible`, grid rows. Every moving part already has a precedent in this repository (cited per decision).
- The separation exists because the feature direction mandates a responsibility boundary and because it keeps `browse.js` limited to listing concerns — not because the codebase needs a reusable action framework. If only two actions ever ship, the module is a small, cohesive renderer; if more arrive, they slot into the same array without touching BrowsePage, the router, or ResourceService.

## Risks / Trade-offs

| # | Risk / Trade-off | Classification | Mitigation |
|---|---|---|---|
| R1 | Browse-owned `.f-action` styles visually duplicate the `.icon-btn` look in `home.css` (two ghost-button implementations) | AMBIGUOUS trade-off, accepted | Deliberate: avoids Browse↔Home CSS coupling; both derive from shared tokens, so theme changes stay coherent. Revisit only if a third page needs the same control → then lift to `components.css`. |
| R2 | Actions appended as a 6th grid child require template changes in list **and** narrow modes (implicit-row wrap otherwise) | EXTRACTED (CSS grid behavior) | Both templates updated explicitly (§14); covered by narrow-viewport validation scenario. |
| R3 | `nth-child` column rules are index-sensitive; inserting actions *before* the existing columns would silently break type/date/size styling and grid-mode hiding | EXTRACTED | Actions are appended **last** (child 6) so `nth-child(3|4|5)` semantics are preserved untouched. |
| R4 | `browse.html` will not load the new module (INFERRED unserved: `serveSPA()` always serves `index.html`; `browse.html` already lacks `resource-service.js`) | AMBIGUOUS | Update only `index.html`. Open question: delete or sync `browse.html` separately — not part of this change. |
| R5 | Pre-existing router quirk: directory names ending in a recognized extension skip SPA interception (extension regex) | EXTRACTED pre-existing | Out of scope; Open uses the same href as the current name link, so no regression is introduced. |
| R6 | Hover-hidden controls could strand keyboard/touch users | Addressed by design | `opacity`-only hiding (stays tabbable), `:focus-within` reveal, `(hover: none)` always-visible — each with a spec scenario. |
| R7 | Silent behavioral drift on the name link (e.g. making it plain text) would break user expectations | AMBIGUOUS if changed | Name-link preservation is an explicit spec requirement; implementation must not modify `linkAttr` logic. |
| R8 | Persian label wording (`btnOpen`) unverified | AMBIGUOUS | Flagged for review during the accessibility/i18n task; fallback string in code (`d.btnOpen \|\| "Open"`). |
| R9 | Over-engineering pressure (action menus, toolbars, generic commands) | Prevented by design | Non-goal + "minimal module surface" spec scenario; registry is a plain array (§4, Architecture Sizing). |
