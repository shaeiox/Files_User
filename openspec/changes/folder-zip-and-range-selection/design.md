# Design

## 1. Server: folder expansion with per-descendant authorization

### 1.1 Layering

```
routes/content.js  ── builds mayDownload(rel) from the request context (policy + legacy gate)
      │
      ▼
archive-service.createArchive(root, dir, items, { allow })      façade (unchanged signature + options)
      │
      ├── archive-selection.resolveSelection(...)   validate, expand folders, dedupe, enforce ceilings
      │         └── files-service.resolveReadableFile / resolveReadableDir   (containment + hidden policy)
      └── zipStream(entries)                         writer: file entries + directory entries
```

- **`archive-selection.js` (new).** Owns selection validation and folder expansion. It knows nothing
  about sessions or policies. It receives an `allow(rel) → boolean` predicate (dependency injection,
  the same pattern as `summarizeTree(dir, allow)`).
- **Fail closed.** If no `allow` is given, a folder in the selection is refused with `400 NOT_A_FILE`,
  as it is today. Only a caller that supplies authorization can expand folders.
- **`archive-service.js`** keeps the writer and the façade, and re-exports `resolveSelection` so
  existing imports keep working.
- **`files-service.resolveReadableDir()` (new, 25 lines).** It mirrors `resolveReadableFile` (same
  `resolveInsideRoot` containment, hidden policy and realpath check) and returns the directory's
  canonical location. No second path implementation is added.

### 1.2 Authorization of descendants

`request-context` gains `mayDownload(rel)`. It does not answer the request:

```
mayDownload(rel) = decideFor(rel, "download").result === "allow"
                && !(legacy release gate applies to rel && no valid session)
```

Rules during the walk (for every child of every walked folder):

| Child | Action |
|---|---|
| hidden name (dotfile, index.html) | skip |
| symlink / junction / special file | skip (the listing skips them too, so a link can never reach a governed target) |
| `mayDownload(rel) === false` | skip, and do not descend (hidden > locked > lowest level all propagate down, so pruning is exact) |
| directory | emit a directory entry and descend (depth ≤ 64) |
| file | emit a file entry and add its size to the 4 GiB budget |

The folders **named** in the request are still gated by the existing `gate()`. That gate refuses the
whole request: 401 if locked, 404 if hidden, 403 if view-only. The **descendants** are screened, not
refused. A folder with one locked file still downloads, without that file. Refusing the whole folder
would make folder download useless under fine-grained policies. Listing a folder already behaves this
way (it filters entries instead of failing).

Paths are checked as **canonical** paths (realpath of the walked folder, built on POSIX segments).
On Windows a case alias of a governed folder therefore cannot get around a policy. This matches
`gate()`, which checks both the requested and the canonical form.

### 1.3 Ceilings and work bounds

- The entry counter includes directory entries. When it passes 65 535, the walk stops with
  `413 TOO_MANY_ENTRIES`.
- The byte budget is checked after each file stat. When it passes 4 GiB, the walk stops with
  `413 ARCHIVE_TOO_LARGE`.
- Depth is capped at 64, which guards against pathological trees. Symlinks are never followed, so
  there are no cycles.
- **Overlap dedupe.** A selection can name a folder and also a file inside it (for example from
  recursive search results). Both produce the same entry name, which always means the same file.
  The duplicate is dropped instead of answering `409`.

### 1.4 Writer: directory entries

A directory entry has a name ending in `/`, method STORE, size 0 and CRC 0. It has **no** data
descriptor and no bit 3. External attributes: `(0o040755 << 16) | 0x10` (MS-DOS directory bit). The
central directory record matches. The archive is still validated by `unzip -t` (check script).

### 1.5 Naming

`archiveName(dirRel, count, soleFolder)`: a selection of exactly one folder is named
`<folder>.zip`. All other selections keep `<dir>-<n>-files.zip`.

## 2. Client: selection architecture

```
selection-model.js   PURE (no DOM). Immutable state transitions + geometry. Unit-tested in Node.
      ▲
bulk-download.js     owns the Set + anchor, applies transitions, one render per batch
      ▲                        ▲
marquee-select.js    pointer gesture → band rect → hit rows → BulkDownload.paint(…)
browse.js            keyboard (Shift+Arrow, Space, Ctrl+A, Esc) → BulkDownload API
```

### 2.1 `selection-model.js` (pure)

State: `{ selected: ReadonlySet<string>, anchor: string|null, baseline: ReadonlySet<string>|null }`.
Every function returns a **new** state. Nothing is mutated.

- `toggle(state, rel)`: flips one row, sets `anchor = rel` and clears `baseline`.
- `extendTo(state, order, rel)`: Shift-range. On the first Shift step, `baseline = selected`. The
  result is `baseline` with every row between `anchor` and `rel` set to the anchor's state. Because
  it always starts from `baseline`, a second Shift-click to a nearer row shrinks the range (rubber
  band). Rows selected before the Shift run stay selected. With no anchor (or an anchor that is no
  longer visible), it falls back to `toggle`.
- `paint(baseline, hits, mode)`: drag result. `mode` is `"add"` (baseline ∪ hits) or `"remove"`
  (baseline ∖ hits).
- `setAll(state, rels, on)`: select-all / clear.
- `hitTest(rects, band)`: which row rectangles a band rectangle intersects. Coordinates are content
  coordinates, so scrolling during a drag extends the band correctly. This works in list and grid
  mode.

The selection plus a range anchor follows the WAI-ARIA multi-select listbox pattern (Shift+Arrow
extends from the anchor).

### 2.2 `bulk-download.js` changes

- It holds `anchor` and `baseline` next to the existing `selection` Set, and applies model
  transitions through one `commit(next, { quiet })` path that repaints rows and the bar once.
- `quiet: true` (used during a drag) skips the `onChange` listeners. `flush()` at the end of the
  gesture notifies them once, so the inspector renders one time per gesture instead of 60 times a
  second.
- **Shift on a checkbox.** The click's `preventDefault()` cancels the native toggle (no `change`
  event), and the range is applied instead.
- **Shift on a row.** `mousedown` with Shift calls `preventDefault()`, so the browser does not extend
  a text selection.
- `downloadZip()` includes folders. A URL-length guard (8 000 chars, under nginx's default 8 KiB
  request line) catches very large selections before the request. It tells the user to select the
  parent folder instead, which is now possible.
- The checkbox model, select-all scope (visible rows only), and navigation clearing do not change.

### 2.3 `marquee-select.js` (pointer gesture)

- **Start:** primary-button `pointerdown` from a mouse or pen, on a row's inert area, the checkbox
  cell, or empty table space. It never starts on links, buttons, locked rows or the header. Touch is
  ignored, so scrolling still works.
- **Arm:** the drag starts after 5 px of movement. Below that, the gesture stays a click and the
  existing click handler toggles the row. Once armed, the module calls `setPointerCapture`, adds the
  `.is-marquee` class (`user-select: none`), clears any text selection, and snapshots the row
  rectangles (content coordinates) and the baseline selection.
- **Mode:** if the drag starts on a selected row, it removes; otherwise it adds.
- **Move:** coalesced with rAF. It positions the band element (`.marquee-band`), hit-tests, and calls
  `BulkDownload.paint(hits, mode, baseline, { quiet: true })`.
- **Auto-scroll:** within 40 px of the scroll container's top or bottom edge, the list scrolls with
  speed proportional to depth, and the band is recomputed.
- **End:** on pointerup or pointercancel it removes the band, calls `BulkDownload.flush()`, and
  swallows the next `click` (capture phase), so the start row is not toggled again.
- **Escape** during a drag restores the baseline.
- `prefers-reduced-motion` and performance tiers: the band is a static outline with no transitions.

### 2.4 Folder download entry points

- `ResourceService.folderZipHref(rel)` is the only URL builder. It produces
  `dir = parent(rel), items = [rel]`.
- `FileActions` gets a `download-folder` action (directory, not locked, not view-only). It is an
  `a[data-file]`, so the existing app-wide download guard handles the HEAD preflight, sign-in on 401,
  refresh on 404 and the error note. No new download code path is added.
- `FileInspector`: a folder card gets a primary "Download folder (ZIP)" anchor through the same guard.
  The multi-selection ZIP count now includes folders.
- `FileActions.preflight()` maps 413 to `"too-large"` so the user sees why.

## 3. Risks

| Risk | Mitigation |
|---|---|
| Leaking governed descendants | Every child is decided individually on its canonical path. Tests cover a locked file, a hidden folder, a view-only file and an unpublished folder inside a downloaded folder. |
| A huge folder blocks the event loop | The walk is async (`readdir`/`stat` promises), bounded by the entry and byte ceilings and depth 64. |
| Drag breaks clicks or links | The 5 px threshold, never starting on `a`/`button`, and suppressing the click only after an armed drag. |
| Stale cached JS after deploy | New modules are imported with stamped URLs. `bulk-download.js` is added to the stamp targets. |
