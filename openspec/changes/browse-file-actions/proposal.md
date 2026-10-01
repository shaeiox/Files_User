# Proposal: Browse Files File Actions

## Why

The Browse Files page gives each file row exactly one interaction point: the file name link. Clicking a directory name navigates into that directory; clicking a file name downloads it (`browse.js` → `renderFilesList()` builds a single `<a class="f-link">` per row, `browse.js` `linkAttr` line ~367). There are no dedicated action controls in the row — Phase 1 confirmed that no action icons/controls exist in `assets/js/browse.js` or `assets/css/browse.css` (EXTRACTED).

The feature direction requires file actions as **independent interactions**, structurally separated from the Browse Page:

```
BrowsePage → File Row → FileActions module → Open / Download / future actions
```

Without a dedicated module, action logic would be inlined into `browse.js`, coupling action definitions and behavior to listing/filtering/sorting responsibilities and making future actions (Preview, Copy Link, Rename, …) increasingly invasive to the Browse Page.

## What Changes

- Add a dedicated **File Actions frontend module** (IIFE, following existing `assets/js/` conventions) that owns action definitions, applicability per item, rendering of action controls, and action-specific event behavior.
- Add an **actions area to the Browse file row** (a new grid column), populated by the File Actions module.
- Initial actions: **Open/Enter** for directories, **Download** for files, derived from the existing `file.type` field.
- Reuse existing primitives unchanged: `ResourceService.browseHref()`, `ResourceService.downloadHref()`, and the SPA router's `data-file="true"` convention.
- Add browse-owned styles for the actions area in `assets/css/browse.css`.
- Add the missing i18n label key(s) (e.g. `btnOpen`) in `assets/js/i18n.js` (`btnDownload` already exists, `i18n.js` line 67/197 — EXTRACTED).
- **Preserve all existing Browse behavior**: file-name link behavior, filtering, sorting, searching, view modes, SPA routing.
- Update frontend module tables in `docs/ARCHITECTURE.md` / `docs/EXTENDING.md` per the repository's own documentation maintenance convention.

## Capabilities

### New Capabilities

- `file-actions`: independent per-item action controls for Browse file rows — dedicated module boundary, action definitions and applicability, action rendering (directory/file, hover/focus visibility), interaction isolation from name-link/row/router, ResourceService reuse, preservation of existing Browse behavior, accessibility, and localized extensibility for future actions.

### Modified Capabilities

- None. `openspec/specs/` contains no existing capabilities (only `.gitkeep`), so no existing requirements are changing.

## Impact

**Affected:**

| File | Change |
|------|--------|
| `assets/js/file-actions.js` | **New** — File Actions module |
| `index.html` | One `<script>` tag before `browse.js` (before `router.js`) |
| `assets/js/browse.js` | `renderFilesList()` only — embed actions cell; `thead` gains an empty actions cell |
| `assets/css/browse.css` | Row grid template + `.f-actions` / action control styles |
| `assets/js/i18n.js` | Additive label key(s) (`btnOpen` en/fa) |
| `docs/ARCHITECTURE.md`, `docs/EXTENDING.md` | Module tables (repo maintenance convention) |

**Not affected (explicit):**

- `assets/js/router.js` — router behavior unchanged
- `assets/js/services/resource-service.js` — service primitives unchanged
- `assets/css/home.css` — Home page styles untouched
- Backend `lib/*` — no API, endpoint, or download changes
- `package.json` — no new dependencies, no test framework

## Expected User-Visible Behavior

- Each Browse file row shows a dedicated actions area (rightmost column in list view; below the name in grid view).
- **Directory rows** show an **Open** control; **file rows** show a **Download** control.
- On pointer devices the actions appear when the row is hovered or when any element inside the row has keyboard focus; on devices without hover they remain visible.
- Clicking **Open** navigates into the directory within the SPA (no full page reload).
- Clicking **Download** downloads the file (same backend flow as today's file-name download).
- The file **name link behaves exactly as today** (directory → SPA navigation; file → download).
- Filtering, sorting, searching, and list/grid view toggles behave exactly as today.
- All action controls are reachable and operable by keyboard and expose accessible names.

## Scope

**In scope:** frontend only — the new module, Browse row integration, browse CSS, i18n labels, docs module tables, manual validation.

**Out of scope / Non-goals:**

- Future actions (Preview, Copy Link, Rename, Delete, Share) — examples only; the architecture must *allow* them, this change does not implement them.
- Any backend/API change; new endpoints; changes to `ResourceService` or the router.
- Changing file-name link or row behavior; making rows clickable.
- Modifying the Home page or reusing/moving Home page styles.
- Introducing a test framework, CI, or generic command/action framework.
- Touch gestures, drag-and-drop, context menus, multi-select.
- Fixing pre-existing quirks unrelated to this feature (e.g. `browse.html` legacy shell — see Assumptions).

## Confirmed Requirements (from Phase 1 evidence — EXTRACTED)

1. No action controls exist in Browse rows today; the file-name link is the only interaction (`browse.js` `renderFilesList()`).
2. Rows have no click handlers; `bindEvents()` binds only search/dropdown/view-toggle controls (`browse.js` lines 389–462).
3. The SPA router intercepts `a[href]` clicks at `document` level and skips links with `data-file="true"` or file-extension hrefs (`router.js` lines 114–130).
4. The API returns exactly two item types, `"directory"` and `"file"` (`lib/files-service.js` `listPath()` — other entry types are filtered out).
5. `ResourceService.browseHref()` / `downloadHref()` are the existing URL primitives (`resource-service.js` lines 22–29) and are already used to build name-link hrefs.
6. Existing generic control styles `.row-actions`, `.icon-btn`, `.download-btn` live in `home.css` (Home-page stylesheet).
7. Shared primitives already used by Browse live in `components.css` (e.g. `.badge`, `.badge-dir`, `.badge-file`).
8. Project conventions: IIFE frontend modules in `assets/js/`, PascalCase globals, `<script>` tags before `router.js` (`docs/EXTENDING.md` lines 136–167, `docs/DEVELOPMENT.md` line 140).
9. No automated test suite exists (`docs/DEVELOPMENT.md` line 115); validation is manual.
10. Global `:focus-visible` outline exists in `base.css` (line 256); `i18n.js` has no "Open" label key yet; `btnDownload` exists.

## Assumptions

| # | Assumption | Classification |
|---|-----------|----------------|
| A1 | `index.html` is the actual served SPA shell; `browse.html` is a legacy/unserved shell (`serveSPA()` always reads `index.html`; `browse.html` also lacks `resource-service.js`, so it would already be broken if served) | INFERRED (strong) |
| A2 | The module belongs at `assets/js/file-actions.js` as a top-level shared UI component; `assets/js/services/` holds API/infrastructure services, not UI components | INFERRED (from directory conventions + `docs/EXTENDING.md`) |
| A3 | Initial scope is exactly two actions: Open (directories) and Download (files) | Confirmed (feature direction) |
| A4 | Persian wording for the new `btnOpen` key needs review (starting value: "باز کن") | AMBIGUOUS (needs decision) |
| A5 | A directory whose name ends in a recognized extension (e.g. `foo.zip/`) hits a pre-existing router quirk (`fileExtensions` regex match skips SPA interception); this change neither fixes nor worsens it — the Open action uses the same href as the existing name link | EXTRACTED behavior, AMBIGUOUS whether to address |
| A6 | Actions use `<a>` elements for both initial actions (navigation semantics + router contract) | Design decision — see `design.md` §11 |
