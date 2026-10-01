# Proposal: Browse File Action Icon

## Why

The Browse Files page gives each row a small set of affordances, and the two kinds of affordance it has
are inconsistent:

- The **item name** is a link: directories navigate, files download.
- The **Browse icon** next to the name is a purely decorative `<div>` (`browse.js:374`, SVG from
  `svgIcon()` at `browse.js:548-552`) — it looks like the row's primary identifier but does nothing.
- A **dedicated File Actions area** was added to the right side of each row (`file-actions.js`, rendered
  at `browse.js:379`) providing a Download control for files and an Open control for directories.

The result is that directories were the odd item out. A file row had two working controls (name and
Download); a directory row had two *different* controls pointing at the *same* destination (name and
Open) while its most prominent visual element did nothing. So the cheapest-to-reach target for the most
common action — opening a folder — was a short text link, and the clearest-looking target was inert.

## Current behavior

| Row content | Today | Owner |
|---|---|---|
| Browse icon (child 1) | Decorative `<div class="f-icon">`; not focusable, not activatable | BrowsePage |
| Name link (child 2) | `<a class="f-link" href=… [data-file]>`; directory → SPA nav, file → download | BrowsePage |
| Type / Modified / Size (children 3-5) | Static text cells, positioned by `nth-child(3\|4\|5)` | BrowsePage |
| File Actions area (child 6) | Directory rows show an **Open** control; file rows show a **Download** control | FileActions module |
| Row itself | Not clickable; no row-level handlers | BrowsePage |

## Desired behavior

Three confirmed product requirements drive this change:

1. **The extra right-side File Action control is removed only for directories.** File-side action controls
   remain available for files.
2. **The existing Browse icon becomes clickable** and activates the *same* target/action as that item's
   existing name link. It is a real interactive target, not decorative.
3. **Existing name-link behavior is preserved.** The name stays clickable with unchanged target and
   navigation behavior; the icon is an *additional* target for the same destination, not a replacement.

Resulting per-row shape:

| Row content | After this change |
|---|---|
| Browse icon (child 1) | **Interactive target** → same destination as the name link; accessible name; keyboard operable; always visible |
| Name link (child 2) | **Unchanged** — same target, same role, same accessible name |
| Type / Modified / Size (children 3-5) | **Unchanged** |
| File Actions area (child 6) | Directory rows: **no control**. File rows: **Download**, unchanged |
| Row itself | **Unchanged** — still not clickable |

Two distinct categories of target, deliberately kept in their existing owners:

```
PRIMARY BROWSE NAVIGATION TARGET   → icon + name, SAME destination, always present
  owned by BrowsePage

DEDICATED FILE ACTION              → Download, files only, absent for directories
  owned by the FileActions module
```

## Why the Browse icon needs to become an additional target

- It gives a large, comfortable hit target for the action users perform most on a folder — without
  removing or changing the name link.
- It is what makes the directory-side Open control redundant. Once the icon is a real target for the same
  destination, a directory row carries one navigation affordance exposed twice (icon and name) instead of
  two semantically identical action controls (name and Open), and the hover-reveal, accessible-name, and
  tab-stop work that a second action control requires disappears with it.
- It stops the row's identity element from being inert. The icon communicates "this is a folder / this is a
  file"; making it the primary hit target aligns appearance and behavior.
- It also gives file rows a second, equally consistent way to reach the same download behavior their name
  link already provides.

## Why the directory-specific extra action is removed

The `open` File Action pointed at exactly the same destination as the directory's name link. With the icon
now serving as the primary alternative target, it adds a redundant control to every directory row and
imposes ongoing cost (hover-reveal rules, an accessible name, a tab stop, an applicability predicate, a
second `browseHref` call site) for no navigational gain. **Directory navigation is not removed** — it
remains available through the directory's name link *and* its Browse icon.

## What is explicitly preserved

- The name link's target, role, accessible name, and navigation/download behavior.
- The file-side Download File Action, unchanged, in both view modes.
- `ResourceService` as the only source of target URLs (`browseHref()` / `downloadHref()`); no URL string
  assembly, no new service methods.
- The SPA router, unmodified — compatibility comes from element and attribute choices
  (`a[href]` interception for directories, `data-file` for files).
- The dedicated File Actions module boundary: the module keeps owning dedicated File Actions; BrowsePage
  keeps owning row structure, the icon, and the name link.
- **Complete File Action ownership** (confirmed by the Phase 3.5 consolidation analysis): the File Actions
  module owns every Action-specific concern — definitions, action-specific helpers, action-specific labels,
  action-specific URL creation (through `ResourceService`), action-specific icon/SVG artwork, applicability,
  rendering, action-specific attributes, and action-specific accessibility attributes. The analysis found
  **zero** Action-specific helpers remaining in `browse.js`, so no code movement is required. The primary
  Browse icon/name target — including its label verb and artwork — is BrowsePage-owned navigation UI and is
  explicitly **not** a File Action. Generic shared helpers (notably `escapeHtml`, which exists privately in
  both modules and in `home.js`) are **not** relocated for ownership reasons.
- The row's six-child structure and the index-sensitive `nth-child(3|4|5)` column rules, so list view,
  grid view, ≤640px, RTL, dark theme, and perf-mode layout are unaffected. The **six tracks, their order,
  and every `nth-child` index are unchanged**; the only layout value touched is the action track's width,
  which is pinned so that column alignment no longer depends on whether a row happens to render a File
  Action (see `design.md` D9/D11a, R16). The ≤640px template has a matching pinned track.
- All other Browse behavior: search, type filter, sorting, stats, view toggles, breadcrumbs, and the
  loading / empty / 401 / 404 states.

## Capabilities

### New Capabilities

- `file-actions` — the Browse item-target and dedicated-File-Action contract: the primary Browse
  navigation target exposed through both the name link and the now-interactive Browse icon; a dedicated
  File Actions module supplying a file-only Download control; type-derived applicability; click isolation
  across icon, name, and action; router and `ResourceService` compatibility; row-layout compatibility;
  accessibility covering the interactive icon; and localized extensibility.

### Modified Capabilities

- None. `openspec/specs/` contains no archived capabilities (`openspec list --specs` reports none), so this
  remains a new-capability delta.

## Impact

**Affected:**

| File | Change |
|------|--------|
| `assets/js/browse.js` | `renderFilesList()` only — the icon cell becomes an interactive target (anchor inside the existing `.f-icon` cell, `aria-label`, `aria-hidden` on the SVG). `href`/`linkAttr` computation, name link, and all other logic untouched. |
| `assets/js/file-actions.js` | One deletion — the `open` action definition. `render()` still returns the `.f-actions` container for every row. Also the sole owner of all Action-specific labels, URLs, SVG, applicability, attributes, and a11y (unchanged; see Phase 3.5 analysis / `design.md` D11). |
| `assets/css/browse.css` | New browse-owned `.f-icon-link` rules, plus a one-value change pinning the action track to a content-independent `26px` in **both** `grid-template-columns` declarations (list and ≤640px). No track-count, track-order, `nth-child`, `.f-actions`, or `thead` changes. See `design.md` D9/D11a and R16. |

**Not affected (explicit):**

- `assets/js/router.js` — no edits
- `assets/js/services/resource-service.js` — no edits
- `assets/js/i18n.js` — no edits; existing `btnOpen` / `btnDownload` keys are reused for the icon's
  accessible name
- `index.html` — no edits; `file-actions.js` is already loaded before `browse.js` and `router.js`
- `assets/css/home.css`, `assets/css/components.css`, `assets/css/base.css`,
  `assets/css/performance-modes.css` — no edits
- `browse.html` (legacy, INFERRED unserved shell) — not updated
- Backend `lib/*`, `server.js`, `package.json` — no changes, no new dependencies, no test framework

## Expected user-visible behavior

- **Directory row:** the icon is clickable and opens the directory; the name link still opens it; there is
  no Open control in the File Actions area.
- **File row:** the icon is clickable and downloads the file; the name link still downloads it; the
  Download control in the File Actions area is unchanged.
- Clicking any one of the three targets produces exactly one navigation or download; the other targets of
  that row are not also activated; the row background still does nothing.
- The icon is always visible (it is not hover-gated), has a localized accessible name such as
  "Open el9" / "Download file.iso" so it is distinguishable from the name link, is reachable with Tab and
  activatable with Enter, and shows a visible focus indicator.
- Tab order within a row is icon → name → File Action, matching the visual order in both list and grid
  views.
- List view, grid view, ≤640px narrow viewports, RTL, dark theme, and performance modes render exactly as
  today; hovering or focusing the icon causes no layout shift.
- Filtering, sorting, searching, stats, and view toggling behave exactly as today.

## Scope

**In scope:** frontend only — the Browse icon becoming an interactive target, removal of the
directory-side File Action, the corresponding minimal CSS, and manual validation.

**Out of scope / Non-goals:**

- Changing the name link's target, role, or accessible name; making rows clickable.
- Any change to the file-side Download action's behavior.
- Modifying `router.js`, `resource-service.js`, `i18n.js`, `index.html`, the backend, or the Home page.
- Any generic command / menu / toolbar / action framework, action palettes, or context menus, and any new
  abstraction unifying the primary target with dedicated File Actions.
- Future actions (Preview, Copy Link, Rename, Delete, Share) and reintroducing directory-scoped File
  Actions — the architecture must *allow* them; this change does not implement them.
- Changing the icon artwork, the type/modified/size columns, or the header labels.
- Fixing pre-existing quirks unrelated to this change (e.g. the `browse.html` legacy shell).
- Introducing a test framework, CI, or browser automation in this phase.
- **Relocating generic or shared helpers on ownership grounds.** `escapeHtml` is triplicated
  (`browse.js:522-526`, `file-actions.js:34-38`, `home.js:483`) and is a pre-existing, action-agnostic
  utility. Consolidating it would need a new shared module or a cross-module export, would invert the
  intended dependency direction, and is explicitly outside the File Action ownership mandate.
- **Resolving the confirmed list-view column misalignment** (`design.md` R16). That defect falsifies D5's
  layout-safety rationale and its fix is a design decision — reserving a minimum action-track width,
  fixing the sixth track, changing the flexible second track, or amending the spec to accept it. It is
  recorded as an open design decision blocking Phase 4 sign-off and is deliberately **not** resolved here.

## Confirmed requirements (source-evidence based)

1. Rows are built in `renderFilesList()` (`browse.js:343-388`) with six children: icon, name, type badge,
   modified, size, and the `FileActions.render()` output (`browse.js:376-383`).
2. The icon is BrowsePage-owned, rendered by `svgIcon()` (`browse.js:551-555`), and is currently a
   non-interactive `<div>`; its SVGs carry no `aria-hidden`.
3. The name link is `<a class="f-link" ${linkAttr}>`; `linkAttr` sets `href` from
   `ResourceService.browseHref()` / `downloadHref()` and adds `data-file="true"` for files
   (`browse.js:360-368`).
4. `FileActions.render()` is called from exactly one place, `browse.js:382`, and always returns a
   `.f-actions` container (`file-actions.js:61-68`); its `download` definition is gated on `item.type`
   (`file-actions.js:40-53`).
5. The SPA router intercepts `a[href]` clicks at document level via `closest("a[href]")` and skips links
   with `data-file="true"` or a matching href extension (`router.js:114-130`).
6. `data-file` is functionally required on every file target: the router's fallback is an end-anchored
   extension denylist (`router.js:9`), so a download target for e.g. `disk.bin` would otherwise be
   `preventDefault()`-ed and routed to `window.location.replace("/404.html")` (`router.js:32-36`).
   Directory targets are immune because `browseHref()` always emits a trailing slash
   (`resource-service.js:22-25`).
7. `ResourceService.browseHref()` / `downloadHref()` are the URL primitives (`resource-service.js:22-29`)
   and are already used to build the name-link href.
8. Row layout depends on the six-track template (`browse.css:171`) and on index-sensitive
   `nth-child(3|4|5)` rules for column truncation and for hiding columns in grid mode and at ≤640px
   (`browse.css:199-201`, `:450-452`, `:489-491`).
9. `thead` shares the same `.trow` template with six children including a trailing empty cell
   (`browse.js:146-152`); skeleton rows already render with only five children (`browse.js:567-573`).
10. Rows have no click handlers — `bindEvents()` binds only search, dropdown, and view-toggle controls
    (`browse.js:394-467`).
11. `btnOpen` and `btnDownload` exist in both `i18n.js` locales (`i18n.js:67-68`, `:198-199`); a global
    `:focus-visible` outline exists (`base.css:256-259`).
12. Project conventions: IIFE frontend modules in `assets/js/`, PascalCase globals, `<script>` tags before
    `router.js` (`index.html:254-263`; `docs/EXTENDING.md` lines 136-167).
13. No automated test suite exists (`docs/DEVELOPMENT.md` line 115); validation is manual.
14. **File Action ownership (Phase 3.5 analysis, EXTRACTED from a full read of both modules):** every
    Action-specific concern is already inside `file-actions.js` — definition list (`file-actions.js:40-53`),
    applicability (`:43`), action label (`:45`), action URL via `ResourceService` (`:46`), action attributes
    and a11y (`:47`), action SVG (`:48-49`), container rendering (`:61-68`), and an action-local escaping
    helper (`:34-38`). `browse.js` contains no Action-specific definition, label, URL, SVG, applicability
    branch, or action-only attribute. The only `browse.js` code resembling action logic —
    `iconVerb`/`iconLabel` (`:373-374`), the `data-file` marker inside `linkAttr` (`:368`), and
    `svgIcon()` (`:551-555`) — belongs to the **primary** Browse target, which is BrowsePage-owned by
    confirmed requirement 2 and design D1/D4.
15. `FileActions.render` has exactly one call site repo-wide, and every `.f-action` element is emitted from
    `file-actions.js:47`; no other frontend file constructs action-control markup. `home.js`'s `data-file`
    anchors (`:702`, `:715`, `:954`) are Home-page release links, not Browse File Actions.

**Graphify limitation:** `renderFilesList`, `svgIcon`, `browseHref`, `downloadHref`, and
`FileActions.render` are nested or module-internal frontend functions and are not represented as Graphify
function nodes. Re-confirmed in the Phase 3.5 analysis: Graphify indexes `BrowsePage` and `FileActions` only
as module/file nodes, while backend `lib/*.js` functions (`handleRequest()`, `listPath()`, `serveSPA()`,
`streamDownload()`) do appear as function nodes. Graphify's `call` edges on this path were reported as
heuristic. All call-level relationships above are therefore cited from source, not derived from the
knowledge graph. No Graphify relationship has been invented. Additionally, `graphify-out/` is **stale** —
it still indexes requirement titles superseded in Phase 1 — and is treated as a generated cache, not
authoritative (see `design.md` R17).

## Assumptions

| # | Assumption | Classification |
|---|-----------|----------------|
| A1 | The primary icon target reuses the existing `href` / `linkAttr` computation rather than recomputing a type branch | Design decision — see `design.md` §D1; guarantees the icon and name targets cannot diverge |
| A2 | The icon anchor is nested inside the existing `.f-icon` cell rather than replacing it | Design decision — see `design.md` §D2; required to preserve `nth-child(3\|4\|5)` semantics and existing icon styling |
| A3 | Two separate sibling anchors (not one merged anchor) implement the two primary targets | Design decision — see `design.md` §D3; mandated by confirmed requirement 3 |
| A4 | The icon's accessible name reuses `btnOpen` / `btnDownload`; no new i18n keys | Design decision — see `design.md` §D4; avoids key duplication |
| A5 | `FileActions.render()` keeps emitting the container for directory rows, with no control inside | Design decision — see `design.md` §D5; keeps applicability out of BrowsePage and the child count uniform |
| A6 | The now-unused `open` definition is deleted from the module rather than left as dead code | Design decision — see `design.md` §D6 |
| A7 | No `stopPropagation()` / `preventDefault()` is needed in the Browse row | Evidence-based — no row handlers exist and the router resolves exactly one anchor per click; see `design.md` §D7 |
| A8 | Persian wording for the icon's action label is the already-shipped `btnOpen` fa value ("باز کن") | AMBIGUOUS — needs maintainer/native-speaker review; no new key is introduced, so the wording surface does not grow |
| A9 | `browse.html` is a legacy, unserved shell (`serveSPA()` always reads `index.html`; it also lacks `resource-service.js`) | INFERRED (strong) — unchanged from the previous revision; separate decision to delete or sync |
| A10 | The two categories of target stay in their existing owners; no new unifying abstraction is introduced | Design decision — see `design.md` §D1, §D5 and the "Minimal module surface" requirement |
