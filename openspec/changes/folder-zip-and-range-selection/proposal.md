# Proposal

## Why

Two gaps make bulk work in Browse slow:

1. **Folders cannot be downloaded.** A user who needs a release folder has to open it, select every
   file, and download them. Sub-folders have to be opened one at a time. The bulk "Download ZIP"
   action drops folders without saying so.
2. **Selecting many rows means many clicks.** Every row is a separate toggle. There is no Shift range,
   no drag-to-select and no keyboard way to extend a selection. Selecting 200 files takes 200 clicks.

## Root cause

| Symptom | Root cause (code) |
|---|---|
| A folder cannot be zipped | `archive-service.resolveSelection()` resolves every item with `files-service.resolveReadableFile()`, which throws `400 NOT_A_FILE` for a directory. Nothing expands a folder into its files. |
| A folder ZIP would be unsafe to add naively | The route gates only the paths **named in the request** (`gate(relPaths, …, "download")`). Admin policies can apply to any **descendant** (a locked file deep in an open folder), and the legacy release gate is prefix-based. A naive recursive walk would leak locked, hidden and view-only content. |
| Empty folders would disappear | The ZIP writer emits only file entries. It has no directory entries. |
| The UI has no folder download | `BulkDownload.downloadZip()` filters `type === "file"`. `FileActions` has no directory action. The inspector shows no actions for a folder. |
| No Shift range | `BulkDownload.onRowClick()` only calls `toggle(rel)`. It ignores `shiftKey`, keeps no anchor, and has no ordered model to compute a range from. |
| No drag-select | No pointer handling exists on the table. Dragging starts a native text selection instead. |
| Fast multi-change would stutter | Each `toggle()` repaints the bulk bar and synchronously re-renders the inspector card through `onChange`. A 200-row range would cost 200 renders. |

## What Changes

- **Server — folder-aware ZIP.** `/api/download-zip` accepts folders in `items`. Each folder is walked
  recursively. Every descendant is screened by the **same** per-path decision the endpoints use
  (admin policy at `download` level + legacy release gate). The walk does not enter a descendant the
  caller may not download, and leaves it out of the archive. Folders become real ZIP directory
  entries, so empty folders are kept. Hidden files are skipped, and so are symlinks (the listing
  skips them too). The classic-ZIP ceilings (65 535 entries, 4 GiB) apply to the expanded set and
  stop the walk early. A single-folder archive is named `<folder>.zip`.
- **Client — folder download everywhere.** Folder rows get a "Download folder as ZIP" action. The
  inspector card for a folder gets a primary ZIP button. The bulk "Download ZIP" includes the
  selected folders.
- **Client — selection UX.**
  - **Shift + click** selects the range from the anchor. Clicking a checkbox works the same way. The
    range takes the anchor's state. Repeated Shift-clicks move the range end like a rubber band.
  - **Drag with the mouse** across rows paints a marquee and selects every row it touches. Starting on
    a selected row deselects instead. Near the edges the list auto-scrolls. A plain click still
    toggles one row.
  - **Keyboard:** Shift+↑/↓ extends the range, Space toggles, Ctrl/Cmd+A selects all visible rows and
    Esc clears. These keys work only while focus is in the table.
  - Selection changes from one gesture are applied as **one batch**. The inspector updates once,
    when the gesture ends.

## Non-goals

- ZIP64 (> 4 GiB / > 65 535 entries). These are refused with a clear message, as today.
- Changing what a plain click does. It stays a toggle, so existing users keep their habits.
- Touch drag-select. On touch, a drag stays a scroll.

## Capabilities

### Modified Capabilities

- `bulk-download`: folder ZIP, descendant screening, range, drag and keyboard selection.

## Impact

- Server: `lib/archive-service.js`, new `lib/archive-selection.js`, `lib/files-service.js` (one
  exported resolver), `lib/request-context.js` (one non-answering predicate), `lib/routes/content.js`.
- Client: new `selection-model.js` (pure) and `marquee-select.js` (pointer), `bulk-download.js`,
  `file-actions.js`, `file-inspector.js`, `browse.js` (keyboard), `resource-service.js`, `i18n.js`,
  `browse.css`.
- No new dependencies (ADR-001 / ADR-006).
