# Design

## Context

`/browse` today renders one folder per page (`browse.js` → `render(container, path)` rewrites `#app` on
every navigation). Its body is a two-track grid — table `1fr` + inspector `0 | 340px` — that opens the
inspector on single selection (`browse.css` §`.browse-body`). The router (`router.js` → `commit`) runs a
View Transition, calls `page.render`, scrolls to top and re-runs `Motion.reveal(app)` on every route
change, including browse→browse.

The target is a desktop-file-manager layout: the portal root as a persistent tree on the left, the
selected folder in the centre, the existing inspector on the right, with user-resizable boundaries. The
look stays the existing CloudAvid dark/gold system (`tokens.css`); this change adds structure, not a new
visual language.

Design inputs used:
- **ui-ux-pro-max** priority rules (its search database is not installed on this machine, so its
  built-in priority table was applied): accessibility first (ARIA tree, separator semantics, focus
  rings), 44px touch targets on the drawer and handle hit-area, 150–300ms UI motion, no width/height
  animation per frame, reduced-motion fallbacks, deep links preserved.
- **design-taste-frontend** in its "existing brand, single section" mode: no direction draw; keep the
  brand's palette and type; apply the house rules — surfaces separated by a tone step, not hairlines;
  no glass or glow on resting panes; one accent (gold) used only for the current-folder marker and the
  primary action; transform/opacity motion with one signature move.

## Goals / Non-Goals

**Goals**
- Persistent, lazily-loaded root tree that survives folder navigation.
- Resizable tree/centre and centre/inspector boundaries (pointer, touch, keyboard), persisted.
- Collapsible tree rail on desktop; off-canvas drawer below tablet width.
- Every existing browse behaviour (search, chips, sort, list/grid, bulk bar, inspector, keyboard,
  error states, RTL) keeps working inside the centre pane.

**Non-Goals**
- Drag-and-drop of files between folders (portal is read-only).
- Multi-root or favourites sections in the tree.
- Changing the home page layout (decided with the user: home keeps hero + cards).
- A tree *view mode* in the centre pane — the existing "list and grid only" requirement stands; this
  change supplies the lazy-loading data contract that requirement asked for, but only for the side
  pane.
- Virtualising the tree. Folder fan-out on this portal is in the tens; add windowing if a folder ever
  exceeds ~2,000 visible nodes.

## Decisions

### 1. Layout: one CSS grid, three tracks driven by custom properties

```
.browse-split  grid-template-columns:
   var(--tree-w, 272px)  8px  minmax(480px, 1fr)  [8px  var(--insp-w, 340px)]
     tree pane          handle   centre pane        handle  inspector (when open)
```

- Widths live in `--tree-w` / `--insp-w` on `.browse-split`. Dragging writes the property directly
  (one style write per `pointermove`, coalesced with `requestAnimationFrame`), so there is no layout
  thrash from reading widths each frame.
- The grid track transition (`var(--dur-3) var(--ease)`) is enabled only for discrete changes
  (collapse, reset, inspector open) by toggling an `.is-animating` class; it is removed during drag so
  the boundary tracks the pointer 1:1.
- The tree and centre panes are each their own scroll container (`overflow:auto`,
  `overscroll-behavior: contain`), height `calc(100dvh - nav - gutter)` and `position: sticky` under
  the navbar, so the footer stays reachable below the split and the tree never scrolls away with the
  table.
- The existing `.browse-body` (table + inspector) becomes the centre + inspector tracks; its
  `has-inspector` state maps to the 5-track template. The 1280px breakpoint for side-by-side inspector
  is kept.
- Breakpoints: ≥1024px three-pane; 768–1023px tree + centre (inspector stacks, as today below 1280px);
  <768px drawer.

**As built:** the outer grid is three tracks (`tree · handle · centre`); the inspector handle and
inspector stay inside `.browse-body` as `table · handle · inspector`, so the existing inspector logic
and its 1280px breakpoint are untouched and the tree width cannot change when it opens. Only the tree
pane (and its handle) is a sticky full-height scroll container; the centre keeps scrolling with the page.
Grid tracks transition always and `body.is-resizing` switches transitions off during a drag, which
replaces the `.is-animating` toggle. The closed phone drawer is `inert` rather than `visibility:hidden`,
so focus never waits on a transition.

**Alternative rejected:** a splitter library (Split.js etc.) — adds a dependency for ~80 lines of
Pointer Events code and fights the RTL grid.

### 2. Resize handle (`pane-resize.js`)

- An 8px track holding a 2px visible grip that grows to 4px and takes the gold accent on hover/focus/
  drag; the hit-area extends to 16px with a pseudo-element so touch is comfortable without stealing
  layout width.
- `pointerdown` → `setPointerCapture` (keeps dragging when the pointer leaves the handle or iframe
  edge), `document.body.classList.add('is-resizing')` which sets `cursor: col-resize; user-select:none`
  globally and `pointer-events:none` on the panes so rows don't hover-flicker or receive clicks.
- Clamp: tree `200px … min(40% of body, body − 480px − inspector)`; inspector `300 … 520px`.
- Keyboard: focusable `role="separator"`, arrows ±16px, Shift ±64px, Home/End, Enter/double-click reset
  to default. `aria-valuenow` updated live.
- Direction: delta is `dx * (dir === 'rtl' ? -1 : 1)` for the tree; inverse for the inspector handle.
- Persist on `pointerup`/keyup only: `localStorage['browse.panes'] = {tree, insp, collapsed}` inside
  try/catch. Restore happens before first paint by writing the custom properties in `render()` before
  the shell is inserted, so there is no default→stored jump.
- Generic over "which track" so the same module serves both handles; no per-handle classes.

### 3. Tree (`browse-tree.js`)

- **Data:** `Map<relPath, {status:'idle'|'loading'|'ready'|'error', children:Entry[]}>`, module-scoped
  so it survives re-renders for the life of the page. Children come from
  `ResourceService.listFiles(rel)` and are mapped with the same `mapEntry` used by the table (move it to
  a shared export so the two never drift). The centre pane's own fetch for the current folder **seeds**
  the tree cache, so opening a folder costs one request, not two.
- **Deep link:** on first render for `/browse/a/b/c/`, load `''`, `a`, `a/b`, `a/b/c` in sequence
  (ancestors are needed to place the node), expand them and scroll the current node into view
  (`block:'nearest'`).
- **Rendering:** nested `<ul role="group">` inside `<li role="treeitem">`. Rows are 32px (desktop) /
  44px (drawer), indentation 16px per level via `padding-inline-start: calc(var(--lvl) * 16px)` so RTL
  is free. Each row: chevron (folders only), folder/file icon from `BrowseIcons`, name with
  `text-overflow: ellipsis` and a `title` for the full name, and a trailing lock badge for locked
  entries. Files show a muted icon and smaller weight; folders carry the item's own weight.
- **Current marker:** a single absolutely-positioned gold bar + tone-step background element that
  *travels* (`transform: translateY`) to the current row rather than each row toggling a background.
  This is the **signature move** of the page: on navigation the marker glides to the new folder, the
  centre content slides, and the user sees where they went.
- **Roving focus** per the WAI-ARIA tree pattern; type-ahead buffer resets after 500ms.
- **Policy:** locked node → `ResourceService.checkAuthStatus` state decides; signed-out activation calls
  the existing `showLoginModal` (defined in `home.js`, already called from `file-actions.js`) with a callback that
  invalidates and reloads that node.
- **Header:** pane title ("Folders"), a refresh icon button (invalidates current path + ancestors) and
  the collapse button. No search box in the tree — the centre toolbar search already exists; adding a
  second filter field is out of scope.

### 4. Persistent browse shell across navigation

- `BrowsePage.render(container, path)` checks `container.querySelector('.browse-split')`. If present,
  it only resets centre-pane state, re-renders the centre pane and inspector, and tells the tree
  `setCurrent(path)`. Otherwise it builds the full shell.
- `router.js`: when both the outgoing and incoming routes are `browse`, skip
  `document.startViewTransition` and the `route-enter` animation, skip `window.scrollTo(0)` unless the
  split is above the fold, and call `Motion.reveal` on the centre pane only. Popstate goes through the
  same path, so Back/Forward keep the tree.
- Every in-pane link already uses `data-link`; nothing else changes in routing.

### 5. Motion plan (all gated by `Motion.allowsMotion()` / `allowsFlip()`)

| Move | How | Duration / easing | Reduced / potato |
|---|---|---|---|
| Current-marker travel (signature) | `transform: translateY` on one element | `--dur-3` `--ease` | instant |
| Tree expand | children `ul`: `grid-template-rows: 0fr → 1fr` wrapper + chevron `rotate(90deg)`; children fade/rise 8px with 20ms stagger (max 8 staggered) | `--dur-2` `--ease-out` | no stagger, no rise |
| Tree collapse | reverse at ~70% duration | `--dur-1` | instant |
| Centre folder change | outgoing rows fade 120ms; incoming rows `translateX(±12px)` + opacity, 25ms stagger, capped at 12 rows; direction from path depth (deeper = from reading end) | `--dur-2` `--ease-out` | crossfade only / none |
| Pane collapse/reset/inspector open | grid track transition via `.is-animating` | `--dur-3` `--ease` | instant |
| Live drag | none — follows pointer | — | — |
| Handle feedback | grip width + colour on hover/focus | `--dur-1` | colour only |
| Drawer (mobile) | `transform: translateX(-100%) → 0` + scrim opacity | `--dur-3` `--ease` | instant |
| Loading row | existing skeleton shimmer | — | static |

Only `transform`/`opacity` animate per frame; the grid track animates only on discrete events.

### 6. Visual treatment (house rules within the existing brand)

- Tree pane surface: one tone step below the centre card (`--bg-sunken` vs `--bg-card`), no border
  between them — the handle's grip is the only divider, and it is a filled shape, not a hairline.
- No shadows on resting panes; the drawer and its scrim are the only floating layers.
- Gold accent only on: current-folder marker, focused/dragged handle grip, primary actions already in
  the centre pane.
- Type: existing UI face; tree names 14px/20px, the pane title 13px sentence case (not tracked caps).
- Empty root: the tree shows one sentence ("Nothing published yet") in full ink, not an illustration.

### 7. i18n

New keys (EN + FA): `treeTitle`, `treeCollapse`, `treeExpand`, `treeRefresh`, `treeLoading`,
`treeRetry`, `treeLoadError`, `treeEmpty`, `foldersDrawer`, `resizeTree`, `resizeInspector`.

## Risks / Trade-offs

- **Router special-case** couples `router.js` to one route's needs → keep it as a single
  `sameShell = prevRoute === route && route === 'browse'` check; no generic "keep-alive" framework.
- **Ancestor fetch chain on deep links** costs N sequential requests → fine at portal depths (≤5); the
  current-folder fetch is shared with the table so only ancestors are extra.
- **Stale tree after a server change** → explicit refresh button and the existing page refresh both
  invalidate; no polling.
- **Narrow laptops (1024–1279px)** with tree + inspector would squeeze the centre → inspector stacks
  below the table there, as today; the 480px centre minimum is enforced by the clamp.
- **`localStorage` widths from a big monitor applied on a small one** → clamped on restore.

## Migration Plan

Frontend-only; ships with a version bump of the `?v=` query on browse assets. Rollback = revert the
commit. No data or API migration.

## Open Questions

- Should the tree show files at all, or folders only? The mock shows both; specs assume both. If the
  root gets many loose files, a "folders only" toggle can be added later.
