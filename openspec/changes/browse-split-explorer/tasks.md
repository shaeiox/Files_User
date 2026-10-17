# Tasks

## 1. Shared groundwork

- [x] 1.1 Export `mapEntry`, `isHidden` and the folders-first name sort from `browse.js` (or a small shared module) so the table and the tree use one implementation
- [x] 1.2 Add the new EN/FA i18n keys listed in design §7 to `i18n.js`
- [x] 1.3 Update `template/browse/code.html` to the three-pane reference (tree · handle · centre · handle · inspector)

## 2. Pane layout and resizing

- [x] 2.1 Restructure `browse.css`: `.browse-split` 3/5-track grid driven by `--tree-w` / `--insp-w`, sticky full-height scroll panes, ≥1024 / 768–1023 / <768 breakpoints, `.is-animating` track transition, `.is-resizing` global cursor/select/pointer-events rule
- [x] 2.2 Write `pane-resize.js`: Pointer Events + `setPointerCapture`, rAF-coalesced custom-property writes, clamps (tree 200…40%/centre ≥480, inspector 300…520), RTL delta sign, `role="separator"` keyboard model, double-click/Enter reset
- [x] 2.3 Persist `{tree, insp, collapsed}` to `localStorage['browse.panes']` on drag/key end, restore and clamp before the shell is inserted; all storage access in try/catch
- [x] 2.4 Move the existing inspector open/close from the 2-track to the 5-track template; confirm the tree width does not change when it opens
- [x] 2.5 Collapse-to-rail control on desktop and remembered state

## 3. Tree pane

- [x] 3.1 Write `browse-tree.js`: module-scoped cache `Map<relPath,{status,children}>`, lazy `ResourceService.listFiles`, loading row, inline error + retry row, refresh invalidates current path and ancestors
- [x] 3.2 Render nested `role="tree"` / `treeitem` / `group` markup with `aria-level/setsize/posinset/expanded`, logical-property indentation, ellipsis + `title`, lock badges
- [x] 3.3 WAI-ARIA keyboard model: roving tabindex, arrows (swapped in RTL), Home/End, Enter, 500ms type-ahead
- [x] 3.4 Folder activation navigates via the router; file activation navigates to the parent and selects the file in the table/inspector
- [x] 3.5 Deep-link path: load root + each ancestor, expand them, mark current, scroll into view
- [x] 3.6 Locked nodes: no expansion when signed out, open `showLoginModal`, reload node on success
- [x] 3.7 Travelling current-folder marker (single element, `translateY`)

## 4. Persistent shell across navigation

- [x] 4.1 `BrowsePage.render`: if `.browse-split` exists, re-render only centre + inspector and call `tree.setCurrent(path)`; seed the tree cache from the centre fetch so each folder costs one request
- [x] 4.2 `router.js`: for browse→browse (including popstate) skip the View Transition, `route-enter`, and scroll-to-top; reveal only the centre pane
- [x] 4.3 Restore the expanded set from memory when returning to `/browse` from another route

## 5. Narrow viewports

- [x] 5.1 "Folders" button in the context header below 768px; off-canvas drawer with scrim, focus trap, Escape/scrim close, close on folder activation, focus return
- [x] 5.2 44px rows and touch-friendly handle hit-area in drawer/tablet modes

## 6. Motion

- [x] 6.1 Tree expand/collapse (0fr→1fr wrapper, chevron rotate, capped child stagger) and centre-pane directional row entrance per design §5, all behind `Motion.allowsMotion()` / reduced-motion fallbacks
- [x] 6.2 Grid-track transition only on discrete changes; verify no easing during live drag at any tier

## 7. Verification

- [x] 7.1 Manual pass in EN and FA at 1920, 1440, 1024, 768 and 390px: resize, collapse, drawer, deep link, Back/Forward keep tree state, inspector open/close keeps tree width
- [x] 7.2 Network check: expanding a folder twice makes one request; opening a folder from the tree makes one request total
- [x] 7.3 Keyboard-only pass of tree + separators; screen-reader announces tree level/expanded and separator value
- [x] 7.4 Reduced-motion and `potato` tier pass: no travel animations, all content visible
- [ ] 7.5 Locked-folder flow signed out → sign in from the tree → children load
- [x] 7.6 Add one runnable check for the clamp/RTL-delta math in `pane-resize.js` alongside the existing tests in `test/`
- [x] 7.7 Bump the `?v=` query on browse assets in `router.js` / `index.html`

## 8. Home embed and full screen

- [x] 8.1 Replace the home resource cards with the embedded explorer; folder links stay in place on `/`
- [x] 8.2 Full screen / Exit full screen control with a shared `view-transition-name` morph between Home and Browse
- [x] 8.3 Fix: tree nodes carried `data-locked`, which the global FileActions guard treats as locked, so every real click opened sign-in
