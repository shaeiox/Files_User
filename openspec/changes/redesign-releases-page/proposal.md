# Proposal

## Why

The Releases page works, but it reads like a generic admin table. The question visitors arrive with, "what is the newest build and how do I get it?", is answered only by a small "Latest" pill in row one. The CLI section mixes shells (it builds a Windows `curl.exe` download next to a Linux `sha256sum` check). A failed fetch looks the same as an empty folder, and the selected OS tab is lost on refresh or when the link is shared. This change makes the page answer that question first and makes every command copy-pasteable on the reader's actual shell.

## What Changes

- **Latest-release lead block:** the first screen shows the newest version for the active OS family in large type, with its file name, size, date, a primary Download button and the stable `/releaseN/latest` command beside it.
- **Shell selector (Linux/macOS · Windows PowerShell):** the download, latest and verify commands are all generated for the chosen shell (`curl` + `sha256sum`, or `curl.exe` + `Get-FileHash`). The choice persists per browser. This fixes the current mixed-shell output.
- **Release list rework:** the whole row is the selection target (not just a radio), the newest row is marked in text rather than with a pill badge, and the file name stays primary. Version, size and date use tabular figures. On narrow screens the table becomes a stacked list instead of hiding columns.
- **Two-column workspace ≥1024px:** the list sits on the left, with the selected-package panel (commands + Verify SHA-256) sticky on the right. Below 1024px they stack.
- **Distinct states:** a loading skeleton, an empty state (folder has no releases), an error state with Retry (request failed), and the existing locked state (auth). A failed request no longer shows as "No releases".
- **URL-addressable OS tab:** `/download/release?os=el8` opens the el8 tab, and switching tabs updates the URL with `replaceState`. The default stays `el9`.
- **Copy feedback is announced** through a polite live region. Every control has a visible focus state and RTL (`fa`) layout mirrors correctly.
- **Visual house rules** (from the design-taste house style, mapped onto the existing `tokens.css`): no uppercase letter-spaced labels, no pill badges, no gradients or resting shadows, and monospace only for real code (commands, digests, file names). No new fonts or colours.

No backend, API or auth changes.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `releases-page`: adds requirements for the latest-release lead block, shell-specific command generation, list selection/states, and URL-addressable tab. Existing requirements (route, el8/el9 tabs, deterministic command per file, on-demand checksum, latest endpoints, auth gate) are kept unchanged. **Depends on** `add-release-reels-page` being archived first, because that change introduces the `releases-page` base spec.

## Impact

- **Frontend:** `assets/js/releases.js` (render/state rework), `assets/css/release.css` (rewrite on existing tokens), `assets/js/i18n.js` (new `en`/`fa` strings).
- **Backend / APIs:** none. The page keeps using `GET /api/releases?os=`, `GET /api/download/*`, `GET /api/hash/*` and `/releaseN/latest` unchanged.
- **Dependencies:** none added.
