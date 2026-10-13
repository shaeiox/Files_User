# Design

## Context

See `proposal.md` — Why. Relevant current state (verified against source):

- `lib/files-service.js` already owns release logic: `resolveReleaseRoot()` (RELEASE_PVM), `listLatestReleases(projectRoot, limit, os)` with a per-subfolder `osFilter` + traversal guard, `extractVersion()` (`/pvm-release-(\d+(?:\.\d+)*)/i`, generic semver fallback), and `compareVersions()` (newest-first, mtime tie-break).
- `lib/api-router.js` serves `GET /api/releases`, `GET /api/download/*` (→ `streamDownload`), and an auth gate driven by `authService.pathRequiresAuth()`. Its SPA branch covers only `/`, `/index.html`, `/browse*` — any other path falls to `serveStatic()` → 404.
- `assets/js/router.js` dispatches `home` / `browse` / `notfound`, and contains **two copies** of `resolveRoute()` (top-level + a nested duplicate in `navigate()`); unknown routes redirect to `/404.html`. The navbar is `index.html` `<nav id="navTabs">` with `.nav-tab` anchors and `data-nav-tab` active-state syncing in `syncNavTab()`.
- `template/release/code.html` (931 lines) is the visual reference only.

## Goals / Non-Goals

**Goals:**
- Reuse the existing release scan/version logic rather than adding parallel implementations.
- One new capability (`releases-page`), one new SPA route, two new read-only endpoints.
- Close the auth-gate gap for any new pathname that streams release bytes.

**Non-Goals:**
- No changes to `browse-page`, `bulk-download`, or `file-inspector` behavior.
- No upload/publish pipeline for releases; the page reads what's on disk.
- No new dependencies, build tooling, or database.

## Decisions

1. **Tab data via existing `GET /api/releases?os=el8|el9`.** Alt: a new `/api/releases/<os>` route. Rejected — the `os` query param already maps to `path.join(releaseDir, osFilter)` with a traversal guard, and the response already includes `browsePath`, `version`, and sorted-first "latest".
2. **Latest endpoints live in `lib/api-router.js` as `GET /release9/latest` / `GET /release8/latest`.** They call `listLatestReleases(root, 1, 'el9'|'el8')`, resolve `items[0].path` through `getDownloadTarget()`, and stream via `streamDownload()` — so version selection stays defined by `extractVersion`/`compareVersions` (single source of truth, satisfies the spec's parse rule). Alt: redirect to `/api/download/...` — rejected; a redirect makes the CLI URL fragile and exposes intermediate paths.
3. **Auth gate extension:** add `/release9/latest`, `/release8/latest` (and their exact `/releaseN/latest` variants) to the `protectedPrefixes` list in `pathRequiresAuth()`. Alt: route them under `/api/...` — rejected; the spec fixes the public URLs. This is mandatory: without it the gate silently doesn't match new pathnames (discovery finding).
4. **Client route registration in both `resolveRoute()` copies** plus the render dispatch branch (`ReleasePage.render(app, path)` alongside `HomePage`/`BrowsePage`), and the server SPA branch extended with `pathname === "/download/release"`. Alt: collapse the duplicated `resolveRoute` — nice cleanup but out of scope; touching it risks regressions in this change, recorded as a follow-up.
5. **Navbar:** a single `.nav-tab` anchor `href="/download/release"` with `data-nav-tab="/download"` (the router derives the route root from the second path segment) and a `data-i18n` label in both `en` and `fa` dictionaries. No links from home/browse views — "navbar-only" is enforced by not adding any others.
6. **CLI command format:** generated client-side as `curl -fLO '<absolute-download-url>'`, where the URL is built by the existing ResourceService URL primitives (project convention: action URLs only via ResourceService). Same file → same string, determinism satisfied by construction.
7. **Default tab = `el9`** (primary example in the request; matches the `/release9/latest` emphasis). Assumption recorded here per workflow rules.
8. **UI:** structure/classes copied from `template/release/code.html`, restyled with `assets/css/tokens.css` custom properties and the existing stylesheet system — same rule the Browse redesign followed (no CDN, no Material tokens).
9. **Checksum via existing `GET /api/hash/*`, on demand only.** Alt: embed digests in `/api/releases` — rejected; hashing every listed artifact on each tab switch would read GBs per request, and `hash-service` already enforces `HASH_MAX_BYTES`, containment, and the release auth gate (`/api/hash/{rel}` is a protected prefix). The page mirrors the File Inspector rule: no hash request until the user activates Verify, and a new selection clears the digest. The verify command is a separate line (`echo '<digest>  <name>' | sha256sum -c -`) so the download command stays deterministic regardless of whether a digest was fetched; `<name>` is the last segment of the download URL — the exact filename `curl -O` writes.

## Risks / Trade-offs

- [Duplicate `resolveRoute()` copies drift] → Implementation checklist verifies both call sites; a task explicitly covers each copy.
- [Auth bypass via new pathnames] → Adding the exact prefixes to `protectedPrefixes` is a required task; verify with an unauthenticated `GET /release9/latest` while `AUTH_ENABLED=true`.
- [RELEASE_PVM outside FILES_ROOT] → `pathRequiresAuth()` returns `false` in that case ("never gate everything"). Pre-existing behavior; latest endpoints inherit it. Mitigation: document in `docs/SECURITY.md` that latest endpoints are only gated when RELEASE_PVM lives under FILES_ROOT; flag for a follow-up if deployments place it outside.
- [Empty/missing `el8` or `el9` folders] → `listLatestReleases` already returns `{browsePath, items: []}` on unreachable subfolders; page renders an empty state. For latest endpoints, empty `items` → error status with no bytes (per spec).
- [Template drift vs. real logic] → Template is used for markup/visuals only; all list/link/latest behavior comes from API responses, never from hardcoded markup in the template.

## Migration Plan

1. Backend first (routes + auth prefix) — additive; existing endpoints untouched, so rollback is reverting the branch.
2. Frontend route + page module + navbar entry.
3. Docs update (`docs/API.md`, `docs/DATAFLOWS.md`, `docs/EXTENDING.md`).
Rollback: revert the commit; no data or schema migration. Feature is inert unless `RELEASE_PVM` is configured.

## Open Questions

- Exact hostname/domain (`https://xxxx.com/...`) used in docs examples — deployment-specific, not needed to implement.
