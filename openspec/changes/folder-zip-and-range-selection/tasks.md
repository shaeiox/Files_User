# Tasks

## 1. Plan

- [x] 1.1 Root-cause analysis and proposal
- [x] 1.2 Design: layering, descendant authorization, selection model, gesture
- [x] 1.3 Spec delta for `bulk-download`

## 2. Server — folder ZIP (TDD)

- [x] 2.1 RED: `test/archive-selection.test.js`: expansion, directory entries, hidden/symlink skip, `allow` pruning, fail-closed without `allow`, dedupe, ceilings, naming
- [x] 2.2 RED: folder ZIP over HTTP: `test/endpoints.test.js` (locked / members-only / unpublished / hidden descendants, locked and unpublished named folders, empty folder), `test/levels.test.js` (view-only folder 403, per-member deny), `test/legacy-auth.test.js` (legacy release gate)
- [x] 2.3 `files-service.resolveReadableDir()`
- [x] 2.4 `lib/archive-selection.js` (walk + screening + ceilings) and writer directory entries in `archive-service.js`
- [x] 2.5 `request-context.mayDownload()` and the route passing `{ allow }`. Single-folder archive name
- [x] 2.6 GREEN: unit + endpoint tests; `test/checks/archive-service.check.js` section 6 validates folder archives with `unzip -t` (the .NET validator needs PowerShell, which is absent on Linux CI images; that check alone reports "tool missing")
- [x] 2.7 Central-directory host = Unix (`version made by` 3.x). Found during manual verification: Info-ZIP applied OEM translation to UTF-8 names from an MS-DOS host, garbling Persian folder names. This bug predates the change and affects file names too. RED→GREEN in `test/archive-selection.test.js`

## 3. Client — selection (TDD)

- [x] 3.1 RED: `test/selection-model.test.js`: toggle, Shift range (anchor state, rubber band, baseline kept, missing anchor), paint add/remove, setAll, hitTest (list + grid), immutability
- [x] 3.2 `selection-model.js`
- [x] 3.3 `bulk-download.js`: anchor + batch commit, Shift on row/checkbox, quiet/flush, folders in ZIP, URL-length guard
- [x] 3.4 `marquee-select.js`: threshold, capture, band, rAF hit-test, auto-scroll, click swallow, Escape
- [x] 3.5 `browse.js` keyboard: Shift+Arrow, Space, Ctrl/Cmd+A, Esc (scoped to the table)
- [x] 3.6 `browse.css`: `.is-marquee`, `.marquee-band`, `.bulk-hint` (hidden on `hover: none`). There are no transitions or animations, so no reduced-motion rule is needed

## 4. Client — folder download

- [x] 4.1 `ResourceService.folderZipHref`
- [x] 4.2 `FileActions` `download-folder` action; preflight `too-large`
- [x] 4.3 `FileInspector` folder card action; ZIP count includes folders
- [x] 4.4 i18n EN/FA keys

## 5. Ship

- [x] 5.1 Stamp asset URLs (`bulk-download.js`, `marquee-select.js` added to targets), STYLEGUIDE line counts
- [x] 5.2 `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/DATAFLOWS.md`, main spec `openspec/specs/bulk-download/spec.md` (delta merged)
- [x] 5.3 Lint, typecheck, full test suite, coverage gate
- [x] 5.4 Live-server verification:
  - curl + `unzip` / Python `zipfile` against a running portal: folder ZIP, empty folder kept, dotfiles excluded, byte-identical extraction, Persian + comma folder name round-trip
  - real client modules driven in jsdom (23 checks): click, Shift-click on row and checkbox, rubber band, link passthrough, drag add/remove, threshold, click swallow, one notification per drag, Escape restore, touch ignored, folder actions, ZIP with folders, hint
- [ ] 5.5 Visual check in a real desktop browser (band rendering, auto-scroll feel, RTL). jsdom has no layout, so these were not exercised
