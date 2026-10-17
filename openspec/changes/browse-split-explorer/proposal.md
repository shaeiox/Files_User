# Proposal

## Why

Browsing today is one folder at a time: every hop into a sub-folder replaces the whole page, so a user
looking for one package across `release`, `tmp` and `AutoLogger` loses their place on each click and has
to come back through the breadcrumb or the home cards. The new UI direction puts the portal's root on a
persistent left pane and the selected folder's contents in the centre, the way every desktop file
manager works — and lets the user drag the boundary between them to suit long names or wide tables.

## What Changes

- The `/browse` route gains a **left explorer pane**: a lazily-loaded tree of the portal root's folders
  and files. Expanding a folder fetches only that folder's children; selecting a folder navigates the
  centre pane to it.
- The existing context header, toolbar, file table and bulk bar move into a **centre pane**, unchanged
  in behaviour. The existing right-hand inspector stays as the third, optional pane.
- A **drag handle** between the tree and the centre pane (and between the centre pane and the open
  inspector) resizes them with mouse, touch or keyboard. Widths are clamped, persisted per browser, and
  reset by double-clicking the handle.
- Navigating between folders **keeps the tree mounted**: its expansion state, scroll position and focus
  survive; only the centre pane re-renders, with a short directional slide.
- The tree pane can be **collapsed** to a slim rail and restored; below the tablet breakpoint it becomes
  an off-canvas drawer opened from the context header.
- Locked and view-only entries in the tree follow the same admin policy display as the table (lock
  badge, "sign in to open").
- Motion: tree expand/collapse, current-folder indicator travel, centre-pane slide and resize all use
  the existing `--ease`/`--dur-*` tokens and the `Motion` gates (reduced motion, performance tier).
- The home page's resource cards are **replaced** by the same explorer, embedded below the hero and
  browsed in place (the URL stays `/`). A **Full screen** control opens `/browse/<folder>`; the explorer
  morphs up from under the hero into the full page with a View Transition, and **Exit full screen**
  morphs it back. (Revised after the first build, at the user's request.)

## Capabilities

### New Capabilities

- `browse-explorer`: the persistent folder tree, its lazy-loading data contract, keyboard model,
  current-folder sync, and the resizable/collapsible pane system shared by tree, centre and inspector.

### Modified Capabilities

- `browse-page`: the page layout requirement changes from "table + inspector" to "tree + centre +
  inspector"; the full-width requirement now applies to the centre pane (it fills whatever the tree
  leaves); RTL mirroring adds the tree pane and resize handles; motion requirements add the tree, pane
  slide and resize.

## Impact

- **Code**: `public/assets/js/browse.js` (shell split, persistent re-entry), new
  `public/assets/js/browse-tree.js` and `public/assets/js/pane-resize.js`, `public/assets/css/browse.css`
  (pane grid, handle, tree, drawer), `public/assets/js/i18n.js` (new EN/FA strings),
  `public/assets/js/router.js` (browse→browse navigation must not tear down the tree or scroll the page
  to top), `template/browse/code.html` (reference mock updated).
- **APIs**: none new. The tree reuses `GET /api/files/<path>` through `ResourceService.listFiles`;
  root listing uses `GET /api/files/`. Server-side admin policy filtering already applies.
- **Dependencies**: none. Resizing uses Pointer Events + CSS custom properties; no splitter library.
- **Storage**: two `localStorage` keys for pane widths/collapsed state, wrapped in try/catch.
