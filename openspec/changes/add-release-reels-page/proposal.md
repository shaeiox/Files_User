# Proposal

## Why

The portal serves PVM release artifacts from the `RELEASE_PVM` directory, but users have no dedicated page to browse them: releases are only reachable through the generic Browse route and the `GET /api/releases` API, and there is no way to grab "the latest el9 build" with a single stable CLI link. A dedicated Releases page turns the existing release-scanning backend into a first-class, discoverable experience and gives automation a stable URL per OS family.

## What Changes

- Add a new Releases (Reels) page rendered inside the app shell at the clean root route `/download/release`, with its layout taken from `template/release/code.html` (UI/UX reference only; logic is implemented fresh).
- Add a two-tab package list (`el8` / `el9`) whose tab switch re-queries `GET /api/releases?os=<el8|el9>`, mapping each tab to the matching `RELEASE_PVM` subfolder.
- In the "Deterministic Automated Fetch" section, every selected row generates a ready-to-copy CLI download command derived from the file's API-relative path.
- Add on-demand SHA-256 checksum verification for the selected package: a Verify action calls the existing `GET /api/hash/*` endpoint and shows the digest plus a `sha256sum -c` command for the downloaded file.
- Add auto "latest release" download endpoints: `/release9/latest` and `/release8/latest`, each streaming the highest-version artifact for its OS family (version parsed from the `pvm-release-<version>` filename prefix, highest semver wins).
- Add exactly one navbar tab entry pointing at `/download/release`; no other UI entry point links to the page, and the route must resolve as a clean root entry (deep-link/refresh renders the page, not a 404).
- Keep the page behind the existing release auth gate so `AUTH_ENABLED=true` deployments protect the new endpoints the same way they protect `GET /api/releases`.

## Capabilities

### New Capabilities

- `releases-page`: The Releases (Reels) page — presentation of release artifacts in an el8/el9 tabbed table, deterministic CLI download link generation, on-demand SHA-256 checksum verification, the per-OS `/releaseN/latest` download endpoints, and navbar-only discoverability of the page.

### Modified Capabilities

<!-- None: browse-page, bulk-download, and file-inspector requirements are unchanged. -->

## Impact

- **Frontend:** `index.html` (navbar tab), `assets/js/router.js` (route resolution + render branch, in both existing `resolveRoute` copies), new page module modeled on `assets/js/browse.js`/`home.js` patterns, `assets/js/i18n.js` dictionaries (en/fa) for new strings, `template/release/code.html` as the visual source.
- **Backend:** `lib/api-router.js` (SPA fallback branch extended to `/download/release`; new `/release8|9/latest` routes), `lib/files-service.js` (reuses `listLatestReleases`, `extractVersion`, `compareVersions` — no listing logic added), `lib/auth-service.js` (`pathRequiresAuth` protected-prefix list extended so the new latest-endpoints cannot bypass the release gate), `lib/static-handler.js` (reuses `streamDownload`).
- **APIs:** new `GET /release9/latest`, `GET /release8/latest`; existing `GET /api/releases`, `GET /api/download/*`, `GET /api/hash/*` reused unchanged.
- **Config/docs:** `.env` `RELEASE_PVM` must contain `el8/` and `el9/` folders (already the documented convention); `docs/API.md`, `docs/DATAFLOWS.md`, `docs/EXTENDING.md` updated to record the new endpoints.
- **Dependencies:** none added.
