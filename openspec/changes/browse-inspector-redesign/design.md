# Design: Browse Page Inspector Redesign

## Context

See `proposal.md` — Why for motivation. This section records only the current state and constraints
that shape the technical approach.

The Browse page is an SPA route. `router.js` resolves `/browse*` to `BrowsePage.render(app, path)`
(`assets/js/router.js:16`, `:127`), which builds the entire page by assigning `container.innerHTML`
(`assets/js/browse.js:73-159`). It is therefore a **string-and-DOM generator**, not a component tree
with a persistent DOM. Any panel that must animate across a content update has to be a container that
outlives the innerHTML swap — this drives D1 and D8.

Four constraints shape everything:

1. **CSP.** `lib/http-utils.js:57` sets `script-src 'self'`, `style-src 'self' 'unsafe-inline'`,
   `font-src 'self' data:`, `img-src 'self' data: blob:`. The mockup loads `cdn.tailwindcss.com`,
   Google Fonts, and Material Symbols. All are remote origins. **Nothing in the mockup's `<head>` can
   ship.** The design must be re-expressed in `assets/css/tokens.css` custom properties. Note
   `style-src` does allow `'unsafe-inline'`, so inline `style` attributes are legal — but this codebase
   does not use them as a styling strategy and neither will this change.

2. **GET-only routing.** `assets/../lib/api-router.js:43` permits `GET` and `HEAD`; `POST` is accepted
   only under `/api/auth/`. Both new endpoints are therefore `GET`, which rules out a POST-body
   selection payload. Selection must travel in the query string.

3. **No new runtime dependency.** `package.json` has exactly `bcrypt`, `dotenv`, `lenis`. There is no
   archive library, so ZIP is produced with Node's built-in `zlib` (see D4).

4. **Freeze supersession.** `enterprise-ui-redesign` (proposal D9 / assumption I22) requires
   `browse.css`, `browse.js`, and `file-actions.js` to stay byte-identical. This change removes that
   freeze for the first two. It does **not** touch `file-actions.js`; that module's ownership boundary
   remains governed by the `file-actions` capability.

`assets/js/router.js` intercepts clicks at the document level via `e.target.closest("a[href]")`
(`:160-176`) and skips any link carrying `data-file` (`:170`). Every generated download anchor must
keep `data-file="true"` or the router swallows it and navigates to a 404 (`:74-76`). This is a
correctness constraint on all new download markup, not a style preference.

## Goals / Non-Goals

**Goals:**
- Re-express `template/browse/code.html` in the project's own token vocabulary with zero remote origins.
- Add the metadata card, real SHA-256 verification, selection, multi-download, and ZIP download as
  isolated modules on both the client and the server.
- Preserve every existing Browse behavior — pipeline, sorts, view persistence, skeletons, empty and
  error states, per-row File Action, breadcrumb, router contract.
- Make RTL parity and motion-tier compliance part of the definition of done, not a follow-up.

**Non-Goals:**
- Any digital-signature or third-party scan-status capability.
- Archive totals, directory-level checksums, or any aggregate that would require recursive hashing.
- The third "Split Tree View" mode, and any lazy-loading contract it would need.
- Touching `file-actions.js`, `router.js`, `http-utils.js`/CSP, `server.js`, `nginx.conf`.
- Any new npm dependency.

## Decisions

### D1. Two new frontend IIFEs; `BrowsePage` owns lifecycle only

`assets/js/file-inspector.js` and `assets/js/bulk-download.js` become PascalCase IIFE globals attached
to `window`, matching `FileActions` and `ResourceService`. Both are loaded in `index.html` **before**
`browse.js` (it already loads `file-actions.js` that way, `index.html:331-332`).

`BrowsePage.render()` creates the static skeleton — header, toolbar, table shell, inspector container,
bulk bar — then calls a single mount function per module and lets each module own its own event
delegation from there.

- **Rejected:** have the modules self-initialize on `DOMContentLoaded`. The page is built by
  `innerHTML` after load, so the modules would race the router's 150 ms transition and bind against a
  DOM that does not exist yet.
- **Rejected:** fold both into `browse.js`. `browse.js` is already 599 lines and the repo's existing
  boundary discipline (`file-actions.js`'s documented ownership contract) argues for keeping
  inspector and bulk concerns out of the page controller.

### D2. The metadata card is a persistent container, not part of the row render

`renderFilesList()` rewrites `#rows` wholesale on every filter change. If the card lived inside that
fragment it would be destroyed and rebuilt on each keystroke, so it could not animate open.

The card is therefore a sibling container in the page skeleton that is never re-rendered by the list
pipeline. Selection state changes its content and toggles an animation class; the animation is driven
by a class toggle on a stable element, not by element insertion.

- **Rejected:** render the card inside the row markup. Breaks animation entirely and couples card
  lifetime to list filtering.
- **Rejected:** use the Web Animations API. Class-driven CSS keeps the animation overridable by
  `prefers-reduced-motion` and `[data-perf]` in the stylesheet, which is the project's existing
  mechanism.

### D3. Row selection uses delegated clicks that yield to existing targets

Selecting a row must not break the three targets `file-actions` already established: the name link,
the Browse icon link, and the per-row Download anchor. A single delegated handler on the table body
bails out when the click originated inside an interactive descendant:

```
row click → if (e.target.closest('a[href], button, input, select, [role="button"]')) return;
         → otherwise toggle selection
```

Anchors then continue to bubble to the router untouched, so SPA navigation and `data-file` downloads
behave exactly as today.

- **Explicit deviation, recorded:** `browse-file-actions` design D7 asserted "rows have no click
  handlers" as the reason no handler was needed for the icon target. That assertion remains true *for
  that change's purpose* — the icon target needs no handler because it is an anchor. This change
  introduces a row-level handler for a **different** concern (selection), and the bail-out above is
  what keeps the two concerns isolated. No anchor's behavior changes.

### D4. Hash verification is a separate `GET`, streamed, with a size cap

`GET /api/hash/<relPath>` in `lib/hash-service.js`. The response carries the hex digest, the byte size,
the algorithm name, and the resolved relative path.

The service resolves the path through the **existing** containment helper and streams the file with
`crypto.createHash("sha256")` fed by `fs.createReadStream`. The file is never read into memory.

The size cap is read from an env var with a sane default, and is the calibration knob: hashing is I/O
bound, so the ceiling is about protecting a shared host, not about correctness. Files over the cap are
refused with a distinct error code so the card can say "too large to verify" rather than failing
generically.

- **Rejected:** compute the hash during download and show it afterward. The requirement is an explicit
  user-triggered verification that produces a digest *before* transfer; folding it into the download
  couples the two and makes the digest unavailable for a file the user is inspecting but not
  downloading.
- **Rejected:** compute hashes for the whole listing on load. Explicitly forbidden by the spec, and
  O(total bytes) on every page view.
- **Rejected:** `readFile` + `createHash`. Unbounded memory on files the design itself shows at
  100 MB+.

### D5. ZIP is produced by a hand-rolled streaming writer over `zlib`

`GET /api/download-zip?dir=<dir>&items=<relPaths>` in `lib/archive-service.js`.

There is no archive dependency and adding one for a single endpoint is not justified, so the service
writes the ZIP container format directly: a local file header and deflated data stream per entry,
followed by a central directory and end-of-central-directory record. `zlib.createDeflateRaw()` is a
Node built-in, so this adds no dependency.

Entries are streamed one at a time and the writer is reused across entries, so peak memory stays at one
compression chunk regardless of selection size.

Entry names are relative to the browsed directory, so two files with the same base name in different
subfolders keep distinct paths and neither overwrites the other.

- **Rejected:** `archiver` / `yazl` dependency. One endpoint does not justify a new supply-chain
  surface, and ADR-001's no-build, minimal-dependency posture argues against it.
- **Rejected:** build the archive in a temp file and send it. Unbounded disk for a request that can be
  streamed, and it introduces a cleanup obligation on failure.

**Known ceiling:** the writer targets classic ZIP (no ZIP64). Selections exceeding 65535 entries or
4 GiB total are rejected with an explicit error rather than producing a corrupt archive. If real
selections ever approach that, ZIP64 is the upgrade path — recorded here rather than built now.

### D6. Multi-file download is client-side sequencing, and ZIP is the recommended path

`bulk-download.js` starts one download per selected file from the existing single-file endpoint, with a
small stagger between requests, reporting per-file success or failure.

**Browsers throttle or block multiple automatic downloads.** This is a genuine platform constraint,
not a theoretical one. ZIP exists precisely because it sidesteps it: one user action, one response,
one browser download. The UI surfaces ZIP as the primary bulk action and keeps the per-file path for
small selections.

### D7. Selection is a `Set` of relative paths, cleared on navigation

`bulk-download.js` holds `Set<relPath>`. Because the list pipeline re-renders on filter changes,
selection must live outside the row markup to survive filtering — and it must, so that narrowing a
filter does not silently drop a user's selection.

Navigation resets the set, because the new directory has a different item universe. Select-all operates
on the currently rendered rows, so it naturally respects the active search and filters without needing
to know about them.

### D8. Extension chips are derived client-side from the fetched listing

No new endpoint. `browse.js` already holds the full normalized listing (`allFiles`) before filtering,
so chip labels and counts are computed from that array. A directory with no files renders no chips
because no extension exists.

### D9. All new target URLs go through `ResourceService`

`resource-service.js` gains `hashHref(relPath)` and `zipDownloadHref(dir, relPaths)`. This preserves
the rule already documented in `file-actions.js:37-39` — `ResourceService` is the single place URLs
are constructed — and keeps the new endpoints consistent with `browseHref` / `downloadHref`.

Every generated download anchor carries `data-file="true"` so the router does not intercept it
(`router.js:170`).

### D10. RTL parity uses explicit `[dir="rtl"]` mirroring

`home.css` establishes the convention with 24 explicit `[dir="rtl"]` rules. This change follows it for
structural changes (grid column order, inspector placement, breadcrumb separator glyph, bulk bar
order), and uses CSS logical properties for one-directional spacing so trivial mirrors do not need a
selector. No direction-sensitive rule ships without its RTL counterpart.

### D11. Motion is transform/opacity only, gated by the existing tier system

The card opens with a transform-and-opacity transition driven by a class toggle on the persistent
container (D2). Durations and easing use the existing `--dur-1` / `--dur-2` / `--ease` tokens.

The animation is suppressed under `prefers-reduced-motion` and under the `[data-perf]` tiers already
implemented in `performance-modes.css`, following the same pattern used for every other effect in the
project. Only compositor-friendly properties animate, so the transition does not trigger layout.

### D12. Both endpoints inherit rate limiting and the auth gate for free

`api-router.js` applies the rate limiter at `:20` and `pathRequiresAuth` at `:85` before any route
dispatch. Mounting the new routes inside that pipeline means neither needs its own auth or throttling
logic. Both resolve paths through `files-service`'s existing containment helper, so path traversal
defense and the hidden-file policy are reused rather than reimplemented.

## Risks / Trade-offs

- **Multiple automatic downloads are browser-throttled** → ZIP is the primary bulk action; the
  per-file path is presented for small selections and documented as throttled. See D6.
- **Hashing a large file consumes host I/O on demand** → size cap with an env-configurable ceiling,
  distinct "too large" error, and hashing only ever runs on explicit user request. See D4.
- **Hand-rolled ZIP writer is a correctness surface** → classic ZIP only, with explicit rejection above
  65535 entries / 4 GiB rather than silent corruption, and verification by extracting a generated
  archive with standard unzip tooling during acceptance. See D5.
- **Selection state surviving filter changes may surprise users** → the bulk bar always shows the live
  selected count, and navigation clears the set. See D7.
- **The freeze supersession touches two previously frozen files** → scoped strictly to `browse.css` and
  `browse.js`; `file-actions.js` stays untouched, and every preserved behavior in `specs/browse-page`
  is a restated contract that must hold after the rewrite.
- **The static "Signed by CloudAvid Core" label asserts a trust property the server never checks** →
  recorded explicitly in `specs/browse-page` as presentation-only, with no code path permitted to
  compute or imply verification. It is a product-chrome decision, and the spec keeps the boundary
  honest so it cannot later be mistaken for a verified result.
- **Selection travels in a query string because POST is unavailable outside `/api/auth/`** → entries
  are percent-encoded and length-capped; oversized selections are rejected client-side before the
  request is made. See D2 in Context and `bulk-download`.

## Migration Plan

No data migration, no schema change, no persisted state, and no new dependency. The change ships as a
set of file edits and is deployable and revertible as a unit.

Rollback is a plain revert of the touched files. The two new endpoints are additive — nothing existing
calls them — so reverting the server restores the prior API surface exactly. Because the Browse freeze
has already been lifted by the specs in this change, rolling back does not require re-freezing
anything.

Suggested order, each step independently verifiable: token port → static layout → preserved logic
re-parented → inspector → selection/bulk → ZIP endpoint → hash endpoint → RTL and motion audit.

## Open Questions

None. Every deferrable unknown was resolved before drafting: tree view deferred, signature and
scan-status removed, archive totals removed, bulk download implemented as both sequencing and ZIP with
ZIP as primary, and the checksum copy chord specified as cross-platform rather than macOS-only.