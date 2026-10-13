# Proposal: Browse Page Inspector Redesign

## Why

The Browse page is the second route of the portal and the only surface a user touches when they
actually want a file. It is currently the least-designed screen in the product: it was deliberately
frozen when the rest of the application was redesigned, so it still renders the pre-redesign layout
while inheriting the new design tokens — a documented, accepted drift that has now become the norm
rather than the exception.

The intended replacement design exists at `template/browse/code.html`. It introduces a real
operational need that the current page cannot serve at all: a user selecting a file has **no way to
inspect it before downloading**. There is no per-file detail surface, no integrity check, and no way
to take action on more than one item at a time. The current page answers "what is in this folder" and
nothing else.

## What Changes

- **Unfreeze the Browse page.** This change supersedes the Browse freeze declared by
  `enterprise-ui-redesign` (proposal D9 / assumption I22), which cancelled that change's Phase 5 and
  required `browse.css`, `browse.js`, and `file-actions.js` to remain byte-identical. Those three
  files are modified here by explicit decision, and the freeze is retired for them.
- **Replace the Browse layout** with the design in `template/browse/code.html`: a package context
  header (breadcrumb, counts, primary actions), a toolbar (search, filter chips, sort, view
  switcher), a denser file table with a selection column, and a right-hand inspector column.
- **Port the design into the existing token system.** The mockup is Tailwind/Material-3 shaped and
  loads `cdn.tailwindcss.com`, Google Fonts, and Material Symbols. Every one of those is a remote
  origin blocked by the CSP (`lib/http-utils.js`). The design is re-expressed in the project's own
  CSS custom properties and existing six-stylesheet system. No CDN, no remote font, no framework.
- **Preserve all existing Browse behavior.** The search → filter → sort → render pipeline, folders-first
  ordering, the five sort modes, list/grid view with `localStorage` persistence, skeleton loading,
  empty states, and the in-page 401/404/server-error states all continue to work unchanged.
- **Add a File Metadata Card (inspector).** Opening on row selection, it shows only values the server
  can actually derive: exact byte size, modified time, a type label, and the resolved relative path.
- **Add on-demand SHA-256 verification.** Hashing is computed for real, server-side, over the file's
  actual bytes, and only runs when a file is selected and the user activates **Verify SHA-256**. It is
  never computed eagerly on listing.
- **Add multi-select and bulk actions**, including real multi-file download and server-side ZIP
  download.
- **Add extension filter chips** (e.g. `.exe (2)`) as a filter dimension alongside the existing
  all/directory/file type filter.
- **Add keyboard affordances** — `/` to focus search, plus arrow-key navigation, Enter to download,
  and copy-hash — replacing the mockup's Mac-only `⌘C` binding with one that also works on Windows.
- **Bidirectional (RTL/LTR) parity is a requirement, not a follow-up.** The mockup is LTR-only. Every
  new layout rule, inspector placement, breadcrumb separator, and toolbar control gets a `[dir="rtl"]`
  mirror, matching how `home.js` and `home.css` already handle direction.
- **Motion is tier-aware.** The metadata card opens with a smooth animation that respects
  `prefers-reduced-motion` and the existing `[data-perf]` performance tiers.

### Explicitly out of this change

- **Digital signature** verification and **VirusTotal**-style scan status are removed from the design.
  Neither is verifiable on this host, and this change ships no fabricated values.
- **Archive-level totals and archive checksums** are removed. The portal has no archive concept, and
  no aggregate "total archive size" or directory hash will be invented.
- **"Signed by CloudAvid Core"** survives only as static product chrome. It is presentation text and
  performs, and implies, no cryptographic verification. This is recorded explicitly so it is never
  later mistaken for a verified property.
- **Split Tree View** (the mockup's third view mode) is deferred; it has no defined lazy-loading data
  contract and half-building it would be worse than omitting it.

## Capabilities

### New Capabilities
- `file-inspector`: The per-file File Metadata Card — its open/close interaction and animation, its
  real-data-only content contract, and on-demand SHA-256 verification of a selected file.
- `bulk-download`: Selection state across Browse rows, real multi-file download, and server-side ZIP
  streaming for a selection.

### Modified Capabilities
- `browse-page`: The freeze requirement is retired and the page's layout, toolbar, filter, view-mode,
  keyboard, RTL, and motion-tier requirements are restated for the new design. The capability path is
  preserved from `enterprise-ui-redesign`.

## Impact

**Frontend**
- `assets/js/browse.js` — new markup for header/toolbar/table/inspector; all fetch, pipeline, sort,
  error-state, and breadcrumb logic preserved. Search/filter/sort/view wiring re-parented to new nodes.
- `assets/js/file-inspector.js` — **new**. Card rendering, selection binding, open/close animation,
  and SHA-256 verification UI. All inspector concerns live here, not in `browse.js`.
- `assets/js/bulk-download.js` — **new**. Selection set, select-all, and download orchestration.
- `assets/js/services/resource-service.js` — new URL primitives for the hash and ZIP routes.
  Remains the only place target URLs are constructed.
- `assets/js/file-actions.js` — unchanged; its per-row Download action and ownership boundary stand.
- `assets/js/i18n.js` — additive keys in **both** `en` and `fa`.
- `assets/css/browse.css` — new layout, inspector, and card styles in the project's token vocabulary.
- `assets/css/performance-modes.css` — `[data-perf]` overrides and reduced-motion handling for the new
  card animation.
- `index.html` — `<script>` tags for the two new modules only. No markup or stylesheet changes.

**Backend**
- `lib/hash-service.js` — **new**. Streaming SHA-256 with a size cap. Isolated; imports no new deps.
- `lib/archive-service.js` — **new**. Streaming ZIP for a multi-file selection. Isolated.
- `lib/files-service.js` — exposes the path resolution the two new services need. Path-traversal
  defense (`resolveInsideRoot`) and hidden-file policy are reused unchanged, never re-implemented.
- `lib/api-router.js` — two new GET routes. Both inherit the existing rate limiter, the auth gate
  (`pathRequiresAuth`), and the GET-only method restriction.

**Unchanged**
- `lib/http-utils.js` and the CSP. No CDN, no Tailwind, no remote fonts, no remote images.
- `assets/js/router.js` and the `data-file` download contract.
- `server.js`, `nginx.conf`, `package.json` — no new runtime dependency.