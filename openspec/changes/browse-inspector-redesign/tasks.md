# Tasks

Verification approach: this repository has no automated test suite (`docs/DEVELOPMENT.md`), so most
items are verified by observable browser behavior. Where logic is non-trivial and hand-rolled — the ZIP
writer and the hash streaming — the task names an actual runnable check, because those are the two
places a silent defect would be invisible until a user hit it.

## 1. Design token port

- [ ] 1.1 Map every Material-3 token in `template/browse/code.html` to an existing project token or
      declare a new one in `assets/css/tokens.css`; verify no `surface-*`, `on-surface*`, `*-container`,
      or `outline-variant` name survives into shipped CSS
- [ ] 1.2 Port the typography scale onto the existing `--text-*` / `--radius-*` tokens and verify
      rendered type matches `tokens.css` rather than the mockup's Tailwind scale
- [ ] 1.3 Replace every Material Symbols glyph in the mockup with an inline SVG consistent with
      `browse.js`'s existing `svgIcon()`; verify no remote font or icon URL appears in the network panel
- [ ] 1.4 Verify the ported page loads with the CSP enforced and the console reports no blocked
      resource and no CSP violation

## 2. Page layout and preserved logic

- [ ] 2.1 Rebuild the Browse page skeleton in `browse.js` — context header, toolbar, table with
      selection column, inspector container — and verify it renders at `/browse` and at a nested path
- [ ] 2.2 Re-parent breadcrumb construction onto the new markup and verify every crumb segment
      navigates, the last segment is non-interactive, and the separator mirrors under `[dir="rtl"]`
- [ ] 2.3 Re-parent the search binding and verify typing filters rows case-insensitively with no
      network request, and that header totals still report unfiltered counts
- [ ] 2.4 Re-parent the type filter and all five sort modes; verify folders stay ahead of files under
      every mode and the active mode is reflected in the control
- [ ] 2.5 Re-parent list/grid view toggles; verify the choice persists across reloads and grid mode
      still renders cards
- [ ] 2.6 Re-parent skeleton, empty, and in-page 401 / 404 / server-error states; verify each renders
      in place with no full-page navigation, and that the locked state's control re-runs the listing
- [ ] 2.7 Confirm `FileActions.render()` is still called unconditionally per row and that
      `file-actions.js` is byte-identical to its pre-change state

## 3. Selection and bulk actions

- [ ] 3.1 Add `assets/js/bulk-download.js` as a `window` IIFE holding the selection set, and register
      it in `index.html` before `browse.js`; verify it loads with no console error
- [ ] 3.2 Implement delegated row selection that yields to `a[href]`, `button`, and `input`; verify
      clicking a name link still navigates, a row download still downloads, and clicking elsewhere on
      the row toggles selection
- [ ] 3.3 Implement header select-all over rendered rows only; verify it selects just the visible rows
      under an active filter, and clears the selection when re-activated while fully selected
- [ ] 3.4 Render the live selected-count and combined-size summary; verify a selected folder contributes
      a count of one and no byte total
- [ ] 3.5 Disable bulk controls when the selection is empty; verify activating them does nothing
- [ ] 3.6 Implement Copy File List from the real selected relative paths in listing order; verify the
      clipboard matches the selection and excludes filtered-out rows
- [ ] 3.7 Implement staggered multi-file download from the existing single-file endpoint with
      per-file success/failure reporting; verify a failing file does not stop the others and is not
      reported as successful

## 4. ZIP download endpoint

- [ ] 4.1 Add a path-resolution export to `lib/files-service.js` that reuses the existing containment
      helper and hidden-file policy; verify no traversal test case regresses
- [ ] 4.2 Create `lib/archive-service.js` with a streaming classic-ZIP writer over
      `zlib.createDeflateRaw`; verify with a runnable check that a generated archive extracts with
      standard unzip tooling and entry contents match the originals
- [ ] 4.3 Enforce the ceiling of 65535 entries and 4 GiB total, rejecting oversized selections with a
      distinct error rather than emitting a corrupt archive; verify both boundaries are refused
- [ ] 4.4 Keep duplicate base names distinguishable by relative path; verify two same-named files from
      different subfolders both survive extraction
- [ ] 4.5 Mount `GET /api/download-zip` inside the existing pipeline; verify it is rate-limited,
      requires auth where the directory requires auth, and refuses any entry resolving outside the
      browsed directory or matching the hidden-file policy
- [ ] 4.6 Add `zipDownloadHref` to `ResourceService` and verify every generated anchor carries
      `data-file="true"` so the router does not intercept it

## 5. Metadata card and hash verification

- [ ] 5.1 Create `assets/js/file-inspector.js` as a `window` IIFE and register it in `index.html`
      before `browse.js`; verify it mounts after `BrowsePage.render` with no race
- [ ] 5.2 Implement the card as a persistent container outside the re-rendered rows fragment; verify
      the card survives a filter change without being destroyed
- [ ] 5.3 Render only real server-derived values — exact bytes, human-readable size, modified time,
      type label, relative path; verify no signature field, scan-status field, or placeholder text is
      present for any file
- [ ] 5.4 Add the class-toggled transform/opacity open animation on a stable element; verify it plays
      once per open, never on filter keystrokes, and does not shift layout
- [ ] 5.5 Omit file-only controls including verification when a folder is selected
- [ ] 5.6 Create `lib/hash-service.js` streaming `crypto.createHash("sha256")` from
      `fs.createReadStream`; verify with a runnable check that a digest matches a known-good hash of the
      same bytes and that memory stays flat on a large file
- [ ] 5.7 Add an env-configurable size cap with a distinct "too large" error code; verify a file over
      the cap is refused and no digest is shown
- [ ] 5.8 Mount `GET /api/hash/<relPath>`; verify it is rate-limited and auth-gated, and refuses a path
      the user may not read
- [ ] 5.9 Wire the Verify SHA-256 control so it fires only on explicit activation; verify selecting a
      file issues no hash request and listing a directory issues none either
- [ ] 5.10 Report removal, unreadable, and over-cap failures in-card without navigating away; verify no
      failure state reads as a successful verification
- [ ] 5.11 Render the full digest selectable with a copy control, and build the fetch snippet from the
      real download target; verify no hard-coded external domain appears
- [ ] 5.12 Give the close control an accessible name and confirm keyboard operation with no focus trap

## 6. Bidirectional parity, motion, i18n, and documentation

- [ ] 6.1 Add an explicit `[dir="rtl"]` counterpart for every direction-sensitive rule, following
      `home.css`; verify inspector placement, breadcrumb separators, table column order, and bulk bar
      all mirror, with no horizontal overflow at 320 / 640 / 1024 / 1440 px
- [ ] 6.2 Add `prefers-reduced-motion` and `[data-perf]` suppression for the card animation; verify the
      card is fully usable with animation off
- [ ] 6.3 Add every new user-visible string to both `en` and `fa` in `i18n.js`; verify switching
      language renders the redesigned page and card with no untranslated literal and no key fallback
- [ ] 6.4 Confirm the "Signed by CloudAvid Core" label is static text with no code path computing or
      implying verification
- [ ] 6.5 Update `docs/DATAFLOWS.md` with the two new endpoints and the selection flow, and
      `docs/API.md` with the hash and ZIP routes including their error codes; verify both read
      accurately against the implemented routes
- [ ] 6.6 Record the Browse freeze retirement in the change's audit trail so the supersession is
      discoverable from `enterprise-ui-redesign` D9 / I22

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied.
- Verify the archived result.