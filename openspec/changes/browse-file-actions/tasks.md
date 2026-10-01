# Tasks: Browse Files File Actions

Implementation is incremental: each phase is independently verifiable and leaves the application working. No phase may expand into another's scope.

---

## 1. File Actions Module Foundation

**Objective:** Create the dedicated File Actions module with its action definitions and rendering entry point, loaded by the page but not yet wired into Browse rows.

**Prerequisites:** None (design approved).

**Files/modules expected to change:**
- **Add** `assets/js/file-actions.js`
- **Edit** `index.html` (one `<script>` tag)

**Allowed scope:** Only the two files above. No changes to `browse.js`, CSS, i18n, router, services, or backend. No HTML wiring into rows yet.

**Tasks:**

- [x] 1.1 Create `assets/js/file-actions.js` — IIFE (`const FileActions = (function () { 'use strict'; … })()`), exposing `render(item, d)` returning the `.f-actions` container markup; internal action definitions array with `appliesTo(item)` (Open → `type === "directory"`, Download → `type === "file"`) and `render(item, d)` per action; hrefs produced **only** via `ResourceService.browseHref(item.relPath)` / `ResourceService.downloadHref(item.relPath)`; Download anchor carries `data-file="true"`; Open anchor does not; local `escapeHtml()` helper (module convention, cf. `browse.js:517`, `home.js:483`); no event listeners in this phase
- [x] 1.2 Add `<script src="/assets/js/file-actions.js" defer></script>` to `index.html` immediately before the `browse.js` script tag (and therefore before `router.js`)

**Tests/validation:** Open `index.html` → browser console: no script errors; `typeof FileActions.render === "function"`; `FileActions.render({type:"file", relPath:"a/b.txt", name:"b.txt"}, getDict())` returns markup containing `/api/download/a/b.txt` and `data-file="true"`; directory item returns markup containing `/browse/a/` and no `data-file`.

**Completion condition:** Module loads cleanly, both applicability paths return correct, escaped markup with service-built hrefs; zero visible UI change on the Browse page.

---

## 2. Styling & Layout Preparation (`browse.css`)

**Objective:** Prepare the row grid and browse-owned action styles so an actions cell can be inserted without breaking list, grid, narrow, or RTL layouts.

**Prerequisites:** Phase 1 (styles reference the classes the module emits).

**Files/modules expected to change:**
- **Edit** `assets/css/browse.css` only

**Allowed scope:** Only `browse.css`. No edits to `home.css`, `components.css`, `performance-modes.css`, or any JS. Follow existing token usage (`var(--…)`).

**Tasks:**

- [x] 2.1 Extend `.file-tbl .trow` list-view template with a sixth track (`… 90px auto`) and the ≤640px template with a third track (`36px minmax(0, 1fr) auto`) so a sixth child never wraps to an implicit row
- [x] 2.2 Add `.f-actions` container styles (right-aligned in list view; centered in grid mode; nowrap; no shrink in list mode) and `.f-action` control styles (≈26px ghost icon button: transparent background, `var(--text-4)` color, hover background/border — browse-owned, tokens only; do **not** import or reference `.icon-btn`/`.row-actions`/`.download-btn` from `home.css`)
- [x] 2.3 Add visibility rules: reduced state via `opacity` + `pointer-events: none` (**never** `visibility`/`display`/`tabindex` removal); reveal on `.trow:hover` and `.trow:focus-within`; `@media (hover: none)` persistently visible; `transition: opacity` only (no layout shift); RTL icon flip only if a directional SVG is used (pattern: `browse.css` crumb-sep `scaleX(-1)`)

**Tests/validation:** Temporary devtools markup or visual check in Phase 3; verify grid/narrow/grid-mode/RTL template math; confirm no rules were added to or edited in `home.css` (`git diff` shows `browse.css` only).

**Completion condition:** CSS supports a sixth row child in all three layouts with hover/focus/touch visibility; `git status` shows no changes outside `browse.css` for this phase.

---

## 3. Browse Integration

**Objective:** Insert the File Actions area into every file row via a single integration point, plus the matching header cell.

**Prerequisites:** Phases 1 and 2.

**Files/modules expected to change:**
- **Edit** `assets/js/browse.js` — **only** `renderFilesList()` (row template) and the `thead` markup inside `render()`

**Allowed scope:** Row construction and header markup only. Forbidden: touching `linkAttr`/name-link construction, `fetchList()`, `bindEvents()`, filtering/sorting/searching logic, or any action-specific logic (no href building, no applicability checks, no handlers in `browse.js`).

**Tasks:**

- [x] 3.1 In `renderFilesList()`, append the `FileActions.render(f, d)` output (which already returns the `.f-actions` container — no extra wrapper) as the **last** (sixth) cell of the row template — after the size cell, preserving `nth-child(3|4|5)` semantics for type/modified/size
- [x] 3.2 Add an empty sixth cell to the `thead` markup in `render()` (same pattern as the existing empty first cell above the icon column)

**Tests/validation:** Browse any directory: every row shows its actions cell; type/modified/size columns, badges, and icons render exactly as before; skeleton loader, empty state, 401/404 states unchanged; list↔grid toggle keeps actions correctly placed (stacked under name in grid mode).

**Completion condition:** All rows integrate the module output through the single call point; existing column rendering and all Browse states visually/functionally unchanged otherwise.

---

## 4. Individual Action Behavior

**Objective:** Verify and harden the end-to-end behavior of each action (Open, Download) against the router and backend, and confirm isolation guarantees.

**Prerequisites:** Phase 3.

**Files/modules expected to change:**
- **Edit** `assets/js/file-actions.js` (behavior fixes only)
- (Exception, only if a defect demands it) minimal fixes in `assets/css/browse.css`

**Allowed scope:** Action-specific behavior only. No router edits, no `resource-service.js` edits, no name-link changes, no backend edits. If a fix seems to require changing `router.js`, stop and escalate — the design forbids it.

**Tasks:**

- [x] 4.1 Verify **Open**: click on a directory row's Open control → URL updates via SPA `pushState`, `BrowsePage` re-renders the new path, no full document reload, exactly one navigation (name link not double-activated); breadcrumbs reflect the new path
- [x] 4.2 Verify **Download**: click on a file row's Download control → single file download via `GET /api/download/…`; router does not navigate (no `preventDefault` conflict); works for filenames with and without recognized extensions (relies on `data-file`, not the extension regex)
- [x] 4.3 Verify **isolation**: action clicks never activate the name anchor, never nest `<a>` inside `<a>`, never produce double navigation/download; rows remain non-clickable; no `stopPropagation` is added unless a concrete stray handler is observed (design §12)
- [x] 4.4 Verify **preserved behavior**: directory/file name links behave exactly as before this feature (`linkAttr` logic untouched — confirm via `git diff assets/js/browse.js`)

> **Status note:** Phases 4 verification was performed against the real `router.js` click interceptor via behavioral simulation (browser tooling unavailable) plus structural/diff checks; results were approved in review. No real-browser click-through was performed.

**Tests/validation:** Manual browser run of tasks 4.1–4.4; `git diff` review confirming `router.js`, `resource-service.js`, and name-link code are untouched.

**Completion condition:** Both actions work end-to-end in isolation; diffs prove router/service/name-link preservation.

---

## 5. Accessibility

**Objective:** Ensure controls are accessible by keyboard and assistive technology, and localized.

**Prerequisites:** Phase 4 (behavior stable).

**Files/modules expected to change:**
- **Edit** `assets/js/file-actions.js` (labels/attributes)
- **Edit** `assets/js/i18n.js` (additive keys only)

**Allowed scope:** Accessible-name attributes, SVG hiding, i18n keys. No layout redesign; no new a11y framework; no `data-i18n` conversion of existing markup.

**Tasks:**

- [x] 5.1 Add `btnOpen` to **both** `i18n.js` locales (en: `"Open"`; fa: starting value `"باز کن"` — confirm wording with a native speaker/maintainer); keep existing `btnDownload` untouched
- [x] 5.2 Ensure every action control exposes `aria-label` and `title` of the form `"{verb} {escaped item name}"` (e.g. `"Download file.iso"`), sourced from `d.btnOpen` / `d.btnDownload` with code-level fallback (`|| "Open"` / `|| "Download"`)
- [x] 5.3 Mark inline SVGs `aria-hidden="true"`; confirm focus visibility (global `:focus-visible`) and `:focus-within` reveal; confirm controls stay in Tab order in their reduced state (no `visibility`/`display`/`tabindex` removal anywhere in the action styles)

**Tests/validation:** Keyboard pass: Tab → name link → actions; focused action becomes visible with a visible focus ring; Enter activates each action. Accessibility inspector (or screen reader spot-check): accessible names read verb + filename. Switch language en↔fa → labels re-render localized. `grep` confirms no `visibility: hidden` / `display: none` applied to `.f-actions` in interactive states.

**Completion condition:** All three accessibility spec requirements pass manual checks; both locales carry the new key.

---

## 6. Validation & Manual Testing

**Objective:** Full regression + acceptance pass against the spec scenarios using the design §18 checklist.

**Prerequisites:** Phases 1–5 complete.

**Files/modules expected to change:**
- Bug-fix edits **only** in files owned by phases 1–5 (`assets/js/file-actions.js`, `assets/css/browse.css`, `assets/js/browse.js` integration lines, `assets/js/i18n.js`). Any other file requires re-opening the design.

**Allowed scope:** Defect fixes within owned files; no refactors, no scope additions, no new features.

**Tasks:**

- [ ] 6.1 Execute the full manual checklist (design §18): Open/Download end-to-end; name-link regression; search/filter/sort/stats/view toggle; keyboard tab/focus/Enter; ≤640px narrow layout; grid view; RTL + fa labels; language toggle; touch/no-hover emulation; `data-perf="low"`/`"potato"`; auth-enabled download; empty/404/auth states; clean browser console
- [x] 6.2 Diff audit: `git diff` confirms **no** changes to `router.js`, `resource-service.js`, `home.css`, backend `lib/*`, `package.json`; `linkAttr`/name-link lines in `browse.js` untouched
- [x] 6.3 Cross-check every scenario in `specs/file-actions/spec.md` and record pass/fail (manual evidence)

> **Status note:** Phase 6 was executed as automated/structural/behavioral validation. Browser tooling was unavailable, so the §18 manual browser checklist (task 6.1) was **not** run: §18 items 8–15, 17–21, and 24–26 remain NOT RUN pending human review. No browser validation is claimed.

**Tests/validation:** This phase *is* the validation. No framework is introduced (`docs/DEVELOPMENT.md`: no test suite).

**Completion condition:** Every spec scenario manually verified; diff audit clean; no open defects.

---

## 7. Documentation Alignment

**Objective:** Update project documentation module tables per the repository's own maintenance convention (`openspec/changes/project-brain-documentation/proposal.md`: "New frontend component → ARCHITECTURE.md, DATAFLOWS.md").

**Prerequisites:** Phase 6 passing (implementation stable).

**Files/modules expected to change:**
- **Edit** `docs/ARCHITECTURE.md` (frontend module table + script-load-order diagram)
- **Edit** `docs/EXTENDING.md` (existing-modules table)

**Allowed scope:** Table/diagram entries for `file-actions.js` only. No documentation rewrites.

**Tasks:**

- [x] 7.1 Add `file-actions.js | File Actions module (Browse row actions) | assets/js/file-actions.js` to the `docs/ARCHITECTURE.md` frontend module table and insert it (before `browse.js`) in the script-loading-order diagram
- [x] 7.2 Add `file-actions.js | File Actions component` to the `docs/EXTENDING.md` existing-modules table

**Tests/validation:** Docs render correctly; paths and load order match `index.html`.

**Completion condition:** Documentation tables reflect the new module; no other doc content changed.
