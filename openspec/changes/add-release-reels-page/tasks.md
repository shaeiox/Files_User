# Tasks

## 1. Backend: latest-release endpoints and auth gate

- [x] 1.1 Add `GET /release9/latest` and `GET /release8/latest` handlers in `lib/api-router.js` that resolve `listLatestReleases(root, 1, 'el9'|'el8')`, then `getDownloadTarget` + `streamDownload` — verify with `curl -fLO http://localhost:4000/release9/latest` after seeding a `pvm-release-<v>-el9-*.tgz` file: the downloaded filename and bytes match the highest-version file
- [x] 1.2 Return an error status with no body when the endpoint's folder yields no items — verify with `curl -i http://localhost:4000/release8/latest` against an empty `el8` folder: non-2xx status and zero file bytes
- [x] 1.3 Add `/release9/latest` and `/release8/latest` to the `protectedPrefixes` list in `pathRequiresAuth()` (`lib/auth-service.js`) — verify with `AUTH_ENABLED=true`: unauthenticated `curl -i` returns `401 AUTH_REQUIRED`, authenticated request streams the file and renews the session cookie
- [x] 1.4 Land a repeatable check script or documented curl sequence covering 1.1–1.3 (this repo has no test runner; the curl sequence is the test) — verify the sequence passes from a clean `node server.js` start

## 2. Routing: clean root entry for the page

- [x] 2.1 Extend the SPA branch in `lib/api-router.js` to serve the shell for `pathname === "/download/release"` — verify `curl -i http://localhost:4000/download/release` returns `200 text/html` (currently 404)
- [x] 2.2 Register the route in **both** `resolveRoute()` copies in `assets/js/router.js` and add the render branch dispatching to `ReleasePage.render(app, path)` — verify in-browser: navigating to `/browse`, then clicking the navbar Releases tab, renders the release page without a full reload, and Back returns to Browse
- [x] 2.3 Verify direct load/refresh of `/download/release` renders the Releases page (not home, not 404) in a fresh tab
- [x] 2.4 Run `node --check` on every touched JS file and confirm the server starts cleanly (`node server.js`) — verification: no syntax errors, no startup warnings beyond the pre-existing FILES_ROOT warning when unset

## 3. Releases page UI (template → production logic)

- [x] 3.1 Create the page module (e.g. `assets/js/releases.js`) rendering the structure from `template/release/code.html` into `#app`, styled with `assets/css/tokens.css` tokens only — verify: page renders with no CDN/remote resources (DevTools Network shows only same-origin assets)
- [x] 3.2 Implement the `el8`/`el9` tabbed package list calling `GET /api/releases?os=<tab>` with `el9` as default — verify: switching tabs refetches and shows only files whose parent folder matches the tab; empty folder shows an empty state with no error
- [x] 3.3 Implement the "Deterministic Automated Fetch" section: selecting a row renders `curl -fLO '<absolute-url>'` built via ResourceService URL primitives — verify: selecting `pvm-release-7.1.29-el9-...tgz` produces the identical string across selections and page reloads, and running that command downloads the exact file
- [x] 3.4 Add the page's `en` and `fa` strings to `assets/js/i18n.js` dictionaries — verify: toggling the language dropdown switches every new label with no raw keys visible
- [x] 3.5 Verify empty/missing `RELEASE_PVM` degrades gracefully: page loads and shows its empty state instead of crashing (matches `listLatestReleases` fallback behavior)

- [x] 3.6 Add a Verify SHA-256 action for the selected package that calls `GET /api/hash/<path>` via `ResourceService.hashHref`, shows the digest, and renders `echo '<digest>  <name>' | sha256sum -c -` with a copy button — verify: running the download command then the verify command prints `<name>: OK`; listing/selection issues no `/api/hash` request (DevTools Network); changing selection clears the digest; a `FILE_TOO_LARGE`/404/401 shows the matching error and no command

## 4. Navbar integration

- [x] 4.1 Add the single Releases `.nav-tab` in `index.html` with `href="/download/release"` and `data-nav-tab="/download"` — verify: `syncNavTab` marks it active only while on the route root, and no other view links to the route (grep the codebase for `/download/release` outside the navbar entry and router registration)
- [x] 4.2 Confirm the mobile disclosure menu (`navDisclosure`) includes and toggles the new tab correctly below 900px — verify in a narrow viewport: button toggles `aria-expanded` and the tab is clickable

## 5. Documentation

- [x] 5.1 Document `GET /release9/latest` and `GET /release8/latest` (params, response, error codes, auth) in `docs/API.md` — verify: each documented status code is reproducible with curl
- [x] 5.2 Update `docs/DATAFLOWS.md` (Releases flow) and `docs/EXTENDING.md`/`docs/SECURITY.md` (new protected prefixes; RELEASE_PVM-under-FILES_ROOT gating caveat) — verify: doc commands/paths match the shipped behavior when executed

## 6. Integration verification

- [ ] 6.1 End-to-end pass with `AUTH_ENABLED=true`: navbar → page → tab switch → select row → run generated curl command → `curl -I /release9/latest` authenticated and unauthenticated — all outcomes match `specs/releases-page/spec.md` scenarios
- [x] 6.2 Run `openspec validate add-release-reels-page --strict` — verification: exits clean (no long requirement descriptions, no missing scenarios)

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied (`/opsx-archive`), which syncs the delta into `openspec/specs/releases-page/`.
