# Tasks

Verification approach: this repository has no automated test suite (`docs/DEVELOPMENT.md`), so most
items are verified by observable browser behavior. Where logic is non-trivial and hand-rolled — the ZIP
writer and the hash streaming — the task names an actual runnable check, because those are the two
places a silent defect would be invisible until a user hit it.

## 1. Design token port

- [x] 1.1 Map every Material-3 token in `template/browse/code.html` to an existing project token or
      declare a new one in `assets/css/tokens.css`; verify no `surface-*`, `on-surface*`, `*-container`,
      or `outline-variant` name survives into shipped CSS
      → **Done.** Of the 47 names in the mockup's Tailwind config only 16 are actually referenced by
      its markup; the rest are generator boilerplate and were not ported. All six `surface-container*`
      tiers plus `on-surface`, `on-surface-variant`, `on-primary`, `primary`, `secondary`, and `error`
      match the project dark values by exact hex. `tertiary` (#a5ebff) was the sole value with no
      equivalent and is now `--info`. `outline` / `outline-variant` deliberately do **not** map by hex:
      a11y-ux-debt tasks 2.2/2.3 re-pointed those steps for contrast, so they map to `--text-3` /
      `--text-4`. Mapping table documented at the end of `tokens.css`; verified brace-balanced, no M3
      name declared as a live token, and no `url()` added.
- [x] 1.2 Port the typography scale onto the existing `--text-*` / `--radius-*` tokens and verify
      rendered type matches `tokens.css` rather than the mockup's Tailwind scale
      → **Done (unblocked by 2.1).** `browse.css` now consumes only project tokens:
      `--text-headline-lg/sm`, `--text-body-lg`, `--text-body`, `--text-label-code`,
      `--text-label-mono-sm`, `--text-heading-sm`, and `--radius-sm/md/lg/tags/buttons/panels`.
      The mockup's Tailwind type scale was already a 1:1 match, so no value was translated —
      only the token names changed. Verified: zero Material-3 names in `browse.css` or `browse.js`.
- [x] 1.3 Replace every Material Symbols glyph in the mockup with an inline SVG consistent with
      `browse.js`'s existing `svgIcon()`; verify no remote font or icon URL appears in the network panel
      → **Done.** `assets/js/browse-icons.js` ships 21 inline SVGs matching the existing 24×24 / 2px /
      `aria-hidden` convention. `account_tree`, `download_for_offline`, and `inventory_2` are excluded
      with their removed features. `browse.js`'s `svgIcon()` now delegates to the set instead of
      carrying duplicate path data. Verified: all 20 required glyph names resolve, none render empty,
      none contain `https:`, `<script`, or `url(`.
- [x] 1.4 Verify the ported page loads with the CSP enforced and the console reports no blocked
      resource and no CSP violation
      → **Done.** Loaded `/browse/` in headless Chrome against a live server. CSP header present and
      unchanged (`script-src 'self'`, `font-src 'self' data:`); all 3 data rows rendered their 18px
      icons through the new chain; zero CSP violations in console output; every resource-loading
      attribute on the page is same-origin (the only remote `href`s are footer navigation links, which
      the router already skips).

## 2. Page layout and preserved logic

- [x] 2.1 Rebuild the Browse page skeleton in `browse.js` — context header, toolbar, table with
      selection column, inspector container — and verify it renders at `/browse` and at a nested path
      → **Done.** New skeleton: `.browse-ctx` (breadcrumb + title + counts + static badge),
      `.browse-toolbar` (search, chips, type, sort, view), and a `.browse-body` grid holding
      `.file-tbl` + `.browse-inspector`.
      **Row-structure conflict resolved:** the `file-actions` spec normatively requires
      icon/name/type/**modified**/size/actions in fixed positions, which the mockup's 5-cell row
      violates by folding modified under the name. Resolution: prepend the select cell and keep all
      six original cells in their original order → 7 cells, header and rows sharing one track count,
      `nth-child(4|5|6)` addressing exactly type/modified/size. Verified: 7 cells in the header and in
      all 14 rows; select is child 1; `.f-actions` is child 7.
      **Layout revised after review:** the table is now FULL WIDTH by default with the inspector track
      collapsed to `0px`; selecting an item animates that track to `340px` while the table collapses,
      and clearing the selection reverses it. Both tracks always exist because
      `grid-template-columns` can only interpolate between track lists of equal length — a one-to-two
      track change would snap instead of animate. This also removed a latent dead-space bug, where a
      persistent `1fr 340px` template left 340px empty whenever the card was hidden. Verified at
      1600px: table 1546 → 1190 (delta 356 = 340 card + 16 gap) through 7 intermediate widths,
      monotonic, and back to 1546 on close; below 1280px the card stacks and the table keeps full
      width.
- [x] 2.2 Re-parent breadcrumb construction onto the new markup and verify every crumb segment
      navigates, the last segment is non-interactive, and the separator mirrors under `[dir="rtl"]`
      → **Done.** Home crumb uses the shared `folder_special` icon; the last segment is a `<span>`
      carrying `aria-current="page"`; direction is mirrored by `[dir="rtl"] .crumb-sep svg` rather
      than by swapping markup. Verified: `/bin/` renders `bin` as both `#folderName` and the active
      crumb; under RTL the chevron computes to `matrix(-1, 0, 0, 1, 0, 0)`.
- [x] 2.3 Re-parent the search binding and verify typing filters rows case-insensitively with no
      network request, and that header totals still report unfiltered counts
      → **Done.** Verified: `lib` narrows 14 → 3 rows (`av_libglesv2.dll`, `libHarfBuzzSharp.dll`,
      `libSkiaSharp.dll`); exactly one `/api/files` request for the whole session; the header totals
      keep reporting the unfiltered directory contents.
- [x] 2.4 Re-parent the type filter and all five sort modes; verify folders stay ahead of files under
      every mode and the active mode is reflected in the control
      → **Done.** Verified: directory=5 rows, file=9 rows, all=14. In all five modes the first file
      sits at index 5, immediately after the five folders. `name-asc` yields
      `bin,binConfigs,guiConfigs,guiLogs,guiTemps`; `name-desc` reverses it.
- [x] 2.5 Re-parent list/grid view toggles; verify the choice persists across reloads and grid mode
      still renders cards
      → **Done.** Verified: grid applies `grid-mode` and writes `view_mode=grid`; list restores both;
      a fresh page load returns in the stored mode, which exercises the restore path.
- [x] 2.6 Implement extension filter chips derived from the loaded listing, with real per-extension
      counts; verify a chip narrows to that extension, composes with search and the type filter, and
      that no chips render for a directory containing no files
      → **Done.** Chips derive from `allFiles` with no extra request. Verified on a 14-entry fixture:
      6 chips (All + `.dll`×4, `.exe`×2, `.icns`, `.png`, `.tmp`); the `.dll` chip narrows to exactly
      the four dlls; `.exe` → 2; exactly one chip marked active; chip + search compose (`.exe` +
      "AmazTool" → `AmazTool.exe`); a directory with no files renders only the All chip. Extension
      keys on the **last** dot, so `AmazTool.exe.tmp` is `.tmp` and is correctly excluded by `.exe`.
- [x] 2.7 Bind `/` to focus search, arrow keys to move focus between rendered rows, and `Enter` to
      activate the focused row's primary target; verify each works from a row and from the document
      body, and that `/` is inert while a text field has focus
      → **Done.** Verified: `/` from the body focuses search and is `preventDefault`ed; `/` dispatched
      on the focused input is **not** hijacked (`defaultPrevented === false`) so it types normally;
      ArrowDown/ArrowUp move focus between rows; Enter on a focused folder row navigates to
      `/browse/v2rayN-windows-64/bin/` with `#folderName` and the breadcrumb following. The
      copy-hash chord ships with the hash feature in group 5.
- [x] 2.8 Re-parent skeleton, empty, and in-page 401 / 404 / server-error states; verify each renders
      in place with no full-page navigation, and that the locked state's control re-runs the listing
      → **Done, and it required a real fix.** Verified: skeleton renders on load; an empty directory
      shows the empty state with controls still visible; 404 shows the in-page not-found state with
      the 404 code, title, and echoed path and no navigation to `/404.html`; 401 (fetch stubbed
      in-page, no source change) renders the locked state with a working `browseAuthBtn`; 500 renders
      the generic error state. All three collapse `.browse-body` to one column and hide the inspector.
      **Pre-existing bug fixed:** `resource-service.js` threw `new Error(await parseError(res))`,
      which discards `.status` and `.code`, so the 401 and 404 branches were unreachable and every
      listing error degraded to the generic state. It now rethrows the `parseError` object at all
      four sites; browse.js was the only consumer reading those fields, so nothing else changes.
      The locked and 404 states had also been inline-styled per instance — that styling now lives in
      `browse.css`, so dropping the inline `style` attributes did not regress their appearance.
- [x] 2.9 Confirm `FileActions.render()` is still called unconditionally per row and that
      `file-actions.js` is byte-identical to its pre-change state
      → **Done.** `git diff --quiet assets/js/file-actions.js assets/js/router.js` reports identical.
      Verified at runtime: directory rows still emit an empty `.f-actions` container, file rows emit
      a Download anchor built from `ResourceService.downloadHref` carrying `data-file="true"`.

## 3. Selection and bulk actions

- [x] 3.1 Add `assets/js/bulk-download.js` as a `window` IIFE holding the selection set, and register
      it in `index.html` before `browse.js`; verify it loads with no console error
      → **Done.** 21-icon `BrowseIcons` sibling module owning selection, select-all, the summary,
      Copy File List, and multi-download. Loaded at `index.html:333`, after `resource-service.js`
      and before `browse.js`. Verified: `BulkDownload` global resolves, the bulk bar is in the DOM,
      and no console error is raised.
- [x] 3.2 Implement delegated row selection that yields to `a[href]`, `button`, and `input`; verify
      clicking a name link still navigates, a row download still downloads, and clicking elsewhere on
      the row toggles selection
      → **Done.** Delegated handler on `#tableContainer` bails on `a[href], button, input, select,
      [role=button]`, so anchors still bubble to the router untouched. Verified: row click selects
      and marks `.is-selected`, the row checkbox mirrors it, a second click deselects; the name link
      still navigates (`→ /guiConfigs/`) and the folder icon target still navigates (`→ /guiLogs/`);
      the row's Download anchor is **not** `preventDefault`-ed (the `data-file` contract holds) and
      does **not** toggle selection. Checkbox `change` selects exactly once — the row click handler
      ignores inputs, so there is no double-toggle. End-to-end download confirmed over HTTP:
      `GET /api/download/v2rayN-windows-64/v2rayN.exe` → 200, `Content-Disposition: attachment`,
      bytes identical to the source file.
- [x] 3.3 Implement header select-all over rendered rows only; verify it selects just the visible rows
      under an active filter, and clears the selection when re-activated while fully selected
      → **Done.** Select-all iterates the rendered set, so it never sees filtered-out rows.
      Verified: with search `lib` (3 of 14 visible) select-all selects exactly 3, and the selection
      equals precisely `av_libglesv2.dll`, `libHarfBuzzSharp.dll`, `libSkiaSharp.dll`; re-activating
      clears it; a partial selection shows `indeterminate`. Selection also **survives a filter
      change** (2 selected before and after clearing the filter), which is why it lives in the
      module rather than the row markup.
- [x] 3.4 Render the live selected-count and combined-size summary; verify a selected folder contributes
      a count of one and no byte total
      → **Done, and it required a real fix.** Verified: folder only → count 1 and the size reads
      "files only", i.e. no fabricated recursive total; folder + 14-byte file → count 2 and
      "14 B selected", so the folder contributes a count but zero bytes.
      **Bug fixed:** selection toggled before `setRendered()` ran for the current pass could not
      resolve item metadata, so the total silently read "files only" and Copy File List produced
      nothing. Rows now carry `data-name`/`data-size`, and `toggle()` registers an unknown item from
      its row, so metadata no longer depends on call ordering.
- [x] 3.5 Disable bulk controls when the selection is empty; verify activating them does nothing
      → **Done.** All three controls start `disabled` and the bar is `hidden` (not merely emptied).
      Verified: clicking a disabled control leaves the selection at 0; controls enable the moment a
      row is selected.
- [x] 3.6 Implement Copy File List from the real selected relative paths in listing order; verify the
      clipboard matches the selection and excludes filtered-out rows
      → **Done.** Verified with the clipboard stubbed in-page: the captured text is exactly
      `v2rayN-windows-64/v2rayN.exe\nv2rayN-windows-64/libSkiaSharp.dll` — real relPaths, listing
      order, filtered-out rows excluded. Falls back to `execCommand` when the Clipboard API is
      unavailable outside a secure context.
- [x] 3.7 Implement staggered multi-file download from the existing single-file endpoint with
      per-file success/failure reporting; verify a failing file does not stop the others and is not
      reported as successful
      → **Done.** Each file is HEAD-probed first (`streamDownload` answers HEAD with headers only,
      zero body bytes — confirmed: HEAD returns 200/Content-Length 14, a missing file returns 404),
      then started from its own anchor carrying `data-file`. Verified with one file forced to fail:
      3 selected → exactly 2 downloads started, the failing file was never triggered, the others
      still started after it, the failed row is `.is-failed` and not `.is-started`, started rows are
      `.is-started`, and folders are skipped. Reporting distinguishes **started** from **failed** and
      never claims "completed", because the browser owns the transfer.

## 4. ZIP download endpoint

- [x] 4.1 Add a path-resolution export to `lib/files-service.js` that reuses the existing containment
      helper and hidden-file policy; verify no traversal test case regresses
      → **Done.** `resolveReadableFile()` is a thin wrapper over the same `resolveInsideRoot`,
      `isHidden`, and `getRoot` used by listing and single-file download — no second path
      implementation, so traversal and symlink rules cannot drift. Verified by the check: traversal
      → `INVALID_PATH`/400, hidden dotfile → `FORBIDDEN_ENTRY`/403.
- [x] 4.2 Create `lib/archive-service.js` with a streaming classic-ZIP writer over
      `zlib.createDeflateRaw`; verify with a runnable check that a generated archive extracts with
      standard unzip tooling and entry contents match the originals
      → **Done.** Runnable check at `lib/archive-service.check.js` (18/18 pass). Sizes and CRC are
      deferred to a data descriptor (general-purpose bit 3) because they are unknown until an entry
      finishes compressing. CRC-32 comes from Node's built-in `zlib.crc32`, so no CRC table is
      hand-rolled and no dependency is added. Validated against **two independent implementations**:
      `unzip -t` reports "No errors detected" and .NET `ZipArchive` opens it and lists every entry;
      extraction is byte-identical to the sources. Check found two real writer bugs:
      `(0o100644 << 16)` overflowed into a negative int32, and entry names were doubled
      (`a.bin/a.bin`) because the filename was appended to a path that already ended with it.
- [x] 4.3 Enforce the ceiling of 65535 entries and 4 GiB total, rejecting oversized selections with a
      distinct error rather than emitting a corrupt archive; verify both boundaries are refused
      → **Done.** Verified for real: 65536 entries → `TOO_MANY_ENTRIES`/413; a 5 GiB **sparse**
      file (no disk consumed) → `ARCHIVE_TOO_LARGE`/413. Both refuse before any bytes are written.
- [x] 4.4 Keep duplicate base names distinguishable by relative path; verify two same-named files from
      different subfolders both survive extraction
      → **Done.** Entry names keep their directory structure relative to the browsed directory.
      Verified: `sub/same.txt` and `other/same.txt` both extract and hold their own distinct content
      (`copy-one` / `copy-two`); two selections colliding on one name are refused with
      `DUPLICATE_ENTRY`/409 rather than silently overwriting.
- [x] 4.5 Mount `GET /api/download-zip` inside the existing pipeline; verify it is rate-limited,
      requires auth where the directory requires auth, and refuses any entry resolving outside the
      browsed directory or matching the hidden-file policy
      → **Done, and it required a security fix.** Verified: rate limiting engages (109×200 then
      21×429); `POST` → 405; a sibling file outside the browsed dir → `ENTRY_OUTSIDE_DIR`/403;
      traversal → 400; a directory as entry → 400.
      **Hole found and closed:** path-scoped auth keys off the URL *pathname*, but this route carries
      its target in the *query string*, so the gate never saw it — ZIP returned 200 for a path where
      `/api/files` and `/api/download` correctly returned 401. The route now evaluates the same
      `pathRequiresAuth` helper against synthetic `/api/files/<rel>` pathnames, covering both the
      browsed `dir` **and** every requested entry (a crafted request could otherwise hide the gated
      path in `items`). Verified: 401 for `dir=releases/el9`, 401 when the gated path appears only in
      `items`, 200 for ungated directories — parity with the existing routes.
- [x] 4.6 Add `zipDownloadHref` to `ResourceService` and verify every generated anchor carries
      `data-file="true"`
      → **Done, with a second real bug fixed.** Verified in-browser: the href is
      `/api/download-zip?dir=…&items=…`, the anchor carries `data-file="true"`, the router does not
      intercept it (`defaultPrevented=false`, no navigation), and a trusted CDP mouse click reaches
      the server, which logs `GET 200 zip · 3 entries`.
      **Bug fixed:** `zipDownloadHref` percent-encoded each path segment and then the whole query
      value, so the server received a literal `%20` instead of a space. The route now decodes each
      item; verified by archiving a file named `lib Skia Sharp.dll`, which round-trips with correct
      content. Commas remain safe as separators because `encodeURIComponent` encodes them as `%2C`. so the router does not intercept it

## 5. Metadata card and hash verification

- [x] 5.1 Create `assets/js/file-inspector.js` as a `window` IIFE and register it in `index.html`
      before `browse.js`; verify it mounts after `BrowsePage.render` with no race
      → **Done.** Loaded at `index.html:334`, after `bulk-download.js` and before `browse.js`.
      `BrowsePage.render` calls `FileInspector.mount()`, which subscribes to selection changes.
      Verified: the global resolves and the card opens on selection with no console error.
      **Extended after review:** the card no longer closes when more than one item is selected — a
      tab strip above the metadata section now carries one tab per selected item, in listing order,
      and activating a tab swaps the content in place. Verified: 2 and 5 selected produce 2 and 5
      tabs; exactly one selected produces none; the card keeps showing the previously-open item
      when a second is added; activating a tab switches it and marks only that tab selected.
      Keyboard follows the ARIA tablist pattern (Arrow/Left/Right/Home/End with roving tabindex),
      and switching tabs does not replay the entrance animation or re-collapse the table.
      Checksum state is per-item: switching tabs clears the digest, the error, and any in-flight
      verification, so one file's digest can never appear under another file's name.
- [x] 5.2 Implement the card as a persistent container outside the re-rendered rows fragment; verify
      the card survives a filter change without being destroyed
      → **Done.** `#inspector` is a sibling of the table inside `.browse-body`. Verified it is not
      inside `#rows`, and that its content is unchanged across a search that narrows the listing.
- [x] 5.3 Render only real server-derived values — exact bytes, human-readable size, modified time,
      type label, relative path; verify no signature field, scan-status field, or placeholder text is
      present for any file
      → **Done.** Verified: exact byte count, human-readable size, modified timestamp, and the real
      relative path all render; and there is **no** signature field, **no** VirusTotal/scan field,
      **no** archive total or archive checksum, and **no** placeholder sample data (the mockup's
      `8f3c7e4…` never appears). A slot needing an unverifiable value is omitted entirely.
- [x] 5.4 Add the class-toggled transform/opacity open animation on a stable element; verify it plays
      once per open, never on filter keystrokes, and does not shift layout
      → **Done.** The animation is a class toggle on the persistent container, not element insertion,
      so the list pipeline cannot re-trigger it. Verified the transition animates only `opacity` and
      `transform` (compositor-only, no layout) and that filtering does not disturb it.
- [x] 5.5 Omit file-only controls including verification when a folder is selected
      → **Done.** Verified for `guiConfigs`: the card opens and shows real specs, but the Verify
      SHA-256 control, the checksum section, and the command-line snippet are all absent.
- [x] 5.6 Create `lib/hash-service.js` streaming `crypto.createHash("sha256")` from
      `fs.createReadStream`; verify with a runnable check that a digest matches a known-good hash of the
      same bytes and that memory stays flat on a large file
      → **Done.** Runnable check at `lib/hash-service.check.js` (17/17 pass): digests match
      independently computed SHA-256 values for text, 200 KB of random binary, and the empty file
      (the well-known `e3b0c442…`); a one-byte change changes the digest. Memory proven flat by
      hashing a **128 MiB** file: RSS moved 40.0 → 41.1 MB, a 1.1 MB delta.
- [x] 5.7 Add an env-configurable size cap with a distinct "too large" error code; verify a file over
      the cap is refused and no digest is shown
      → **Done.** `HASH_MAX_BYTES`, default 512 MiB. Verified against a live server with the cap set to
      8 bytes: a 14-byte file → `413 FILE_TOO_LARGE` with a specific message and no digest; a 4-byte
      file under the cap still verifies and matches `sha256sum`.
- [x] 5.8 Mount `GET /api/hash/<relPath>`; verify it is rate-limited and auth-gated, and refuses a path
      the user may not read
      → **Done.** Verified: digest matches `sha256sum` exactly; a `RELEASE_PVM`-gated path → 401,
      matching `/api/files` and `/api/download`; hidden file → 403; directory → 400; missing → 404;
      `POST` → 405. `/api/hash/${rel}` was added to `auth-service`'s protected prefixes so the
      path-scoped gate covers the new route natively rather than by a side-channel.
- [x] 5.9 Wire the Verify SHA-256 control so it fires only on explicit activation; verify selecting a
      file issues no hash request and listing a directory issues none either
      → **Done.** Verified with a fetch interceptor: zero hash requests during page load, zero on
      selecting a file, zero on selecting a folder, and exactly one on clicking Verify.
- [x] 5.10 Report removal, unreadable, and over-cap failures in-card without navigating away; verify no
      failure state reads as a successful verification
      → **Done, and it required a real fix.** Verified five failure modes — 404 removed, 403
      forbidden, 413 too large, 500, and a malformed 200 whose digest is not hex — each shows a
      specific in-card message, exposes no digest, does not read as verified, stays on the browse
      route, and is announced with `role="alert"`; a successful retry clears the error.
      **Bug fixed:** the error was written straight into the DOM and then immediately wiped by the
      `refresh()` that followed the failed request, so no failure was ever visible. The message is
      now module state rendered by the card, which is the single source of truth.
- [x] 5.11 Render the full digest selectable with a copy control, and build the fetch snippet from the
      real download target; verify no hard-coded external domain appears
      → **Done.** Verified: the full 64-char digest renders, matches the server, is `user-select: all`,
      and copies to the clipboard verbatim. The snippet is built from `ResourceService.downloadHref`
      plus the live origin, so the mockup's hard-coded `dl.cloudavid.net` is gone.
- [x] 5.12 Give the close control an accessible name and confirm keyboard operation with no focus trap
      → **Done.** Verified: the close control has an `aria-label`, is focusable, and dismisses the card
      while clearing the selection so the card and bulk bar never disagree. Focus is not trapped.

## 6. Bidirectional parity, motion, i18n, and documentation

- [x] 6.1 Add an explicit `[dir="rtl"]` counterpart for every direction-sensitive rule, following
      `home.css`; verify inspector placement, breadcrumb separators, table column order, and bulk bar
      all mirror, with no horizontal overflow at 320 / 640 / 1024 / 1440 px
      → **Done.** Explicit mirrors for the breadcrumb chevron and the selected-row accent inset; the
      remaining one-directional values use CSS logical properties (`padding-inline`, `text-align: end`,
      `inset-inline-start`) so they mirror by construction. Verified at 1440px: in RTL the inspector
      sits left of the table (x=24 vs 380) and in LTR right of it (x=1070 vs 24); the two-column grid
      resolves 1030px | 340px in both; the chevron computes to `matrix(-1,0,0,1,0,0)` under RTL; rows
      render and the card stays visible; no horizontal overflow (scrollWidth 1434 ≤ 1440). Checked at
      320 / 640 / 1024 / 1440 with no overflow in either direction.
- [x] 6.2 Add `prefers-reduced-motion` and `[data-perf]` suppression for the card animation; verify the
      card is fully usable with animation off
      → **Done.** `prefers-reduced-motion` was already handled globally by `performance-modes.css`, and
      a component-local rule guarantees the card still settles visible. Added tier overrides: `medium`
      shortens the transition to 90ms; `low` and `potato` drop it and show the card settled. Verified
      with `data-perf="low"`: transition `none`, opacity 1, and the Verify control present and enabled.
- [x] 6.3 Add every new user-visible string to both `en` and `fa` in `i18n.js`; verify switching
      language renders the redesigned page and card with no untranslated literal and no key fallback
      → **Done, and it required a real fix.** Verified all new keys exist in both dictionaries and none
      is left as English in `fa`. Switching to `fa` and back renders the whole surface in Persian —
      card labels, bulk buttons, bulk summary, toolbar chips, and the context badge — with Persian
      dates and byte counts, and verification still returns the correct digest.
      **Gap closed:** the bulk bar and metadata card are built at render time and carry no
      `data-i18n` nodes, so they kept stale-language text. `applyLang` now dispatches an
      `i18n:changed` event and both modules re-render on it.
- [x] 6.4 Confirm the "Signed by CloudAvid Core" label is static text with no code path computing or
      implying verification
      → **Done.** The label renders as static text and is identical in LTR and RTL. Verified with a
      fetch interceptor and the resource-timing list that **no** signature, virus, scan, or
      attest/verify-cert request is ever made and no such URL is ever loaded. Its spec requirement
      states explicitly that no code path may compute or imply verification.
- [x] 6.5 Update `docs/DATAFLOWS.md` with the two new endpoints and the selection flow, and
      `docs/API.md` with the hash and ZIP routes including their error codes; verify both read
      accurately against the implemented routes
      → **Done.** `API.md` gains `GET /api/hash/*` and `GET /api/download-zip` with parameters,
      headers, full error-code tables, the `HASH_MAX_BYTES` knob, source paths, and how to run each
      verification script; both routes are added to the auth summary table. `DATAFLOWS.md` gains a
      bulk-selection section covering the selection model, the HEAD-probed multi-download, the ZIP
      pipeline, and on-demand verification. Every status code documented was observed live.
- [x] 6.6 Record the Browse freeze retirement in the change's audit trail so the supersession is
      discoverable from `enterprise-ui-redesign` D9 / I22
      → **Done.** `enterprise-ui-redesign/proposal.md` now carries a SUPERSEDED banner on D9 and an
      annotated I22 naming the superseding change, recording that `browse.css` and `browse.js`
      changed, that `file-actions.js` did not, and how the 6-child row contract is preserved by the
      new 7-cell row.

## Workflow follow-up

- Archive the change once the project's review requirements are satisfied.
- Verify the archived result.