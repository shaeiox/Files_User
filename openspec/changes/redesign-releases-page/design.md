# Design

## Context

See `proposal.md` — Why. Current state (verified against source):

- `assets/js/releases.js` (~350 lines) is an IIFE `ReleasePage` with module state (`activeOs`, `items`, `selectedPath`, `digest`, request/hash sequence ids) and string-template rendering. The command builders are `fileCommand()` (`curl.exe -fLO`), `verifyCommand()` (`sha256sum -c`) and an inline latest command (`curl.exe -fLOJ`), so the output currently mixes Windows and Linux commands.
- The `load()` catch branch renders the empty state for every non-401 error.
- `assets/css/release.css` uses tokens from `assets/css/tokens.css` (`--s*` spacing, `--radius-*`, `--color-ember-pulse` accent, `--font-mono`). It also contains the house-rule violations the redesign removes: an uppercase letter-spaced `th`, the `.rel-badge` pill, and `display:none` column hiding on mobile.
- `/api/releases` returns items sorted newest-first by the same `listLatestReleases` used by `/releaseN/latest`, so `items[0]` is the artifact the latest endpoint streams. No backend change is needed for the lead block.
- `assets/js/router.js` resolves routes on `location.pathname` only, so a `?os=` query does not affect routing.
- `localStorage` access in this codebase is wrapped in `try {} catch {}` (`browse.js` `view_mode`, `i18n.js` `ui_lang`).

## Goals / Non-Goals

**Goals:** rework presentation and client state inside the two existing files, `releases.js` and `release.css`, plus i18n strings.

**Non-Goals:**
- No server, API or auth changes. One router line changed during apply: `init()`'s boot `replaceState` now keeps `location.search`/`hash`, without which `?os=` was stripped before the page rendered.
- No search/filter over releases. Each folder is capped at 50 items and is already sorted newest-first; add search when folders outgrow that.
- No changelog or release notes. No such data exists on disk.
- No new fonts, colours, libraries or build step.

## Decisions

1. **Lead block = `items[0]`.** Alt: call `/releaseN/latest` with `HEAD`. Rejected because it is an extra request, and the list order already shares one source of truth with the endpoint (`compareVersions`).
2. **Shell is a two-option segmented control (`role="radiogroup"`),** stored in `localStorage` key `rel_shell` (`posix` | `pwsh`), defaulting to `posix`. The command builders become one function per shell, keyed by shell, and the rest of the code stays shell-agnostic. Alt: auto-detect from `navigator.userAgent`. Rejected because the reader often runs the command on a server, not on the browsing machine.
   - posix: `curl -fLO '<url>'` · `curl -fLOJ '<origin>/releaseN/latest'` · `echo '<digest>  <name>' | sha256sum -c -`
   - pwsh: `curl.exe -fLO '<url>'` · `curl.exe -fLOJ '<origin>/releaseN/latest'` · `(Get-FileHash -Algorithm SHA256 '<name>').Hash -eq '<DIGEST>'`. `-eq` is case-insensitive, so the lowercase digest compares correctly.
   - The existing quoting rule is kept: single-quoted URL, with `'` percent-encoded.
3. **Row selection keeps one native radio per row** (arrow-key navigation comes free from the radio group). A click handler on `tr` checks that row's radio, but skips clicks on the Download link and the radio itself. Selection is shown by the checked radio, a row tone step, and an inline-start accent bar (not color alone). Alt: `role="grid"` / `aria-selected` rows. Rejected as more ARIA for the same result.
4. **Layout:** CSS grid. One column below 1200px (raised from 1024px during apply: at 1024 the list column wrapped file names mid-token). Above that, `minmax(0,1.6fr) minmax(320px,1fr)`, with the selected-package panel `position: sticky`. Below 640px, table rows become stacked blocks via CSS (`display:block` on `tr`/`td` with visible labels), so no data is hidden. Logical properties (`inset-inline-start`, `padding-inline`) handle RTL.
5. **States:** `load()` distinguishes four outcomes: ok, empty (`items.length === 0`), locked (401 / `AUTH_REQUIRED`), and error (everything else, rendered with a Retry button that calls `load()`). The loading state reuses the existing `aria-busy` and renders three static placeholder rows. A placeholder only appears if loading takes more than 150ms, so fast responses don't flash.
6. **URL tab:** read `new URLSearchParams(location.search).get("os")` in `render()` and validate it against `TABS`. On switch, call `history.replaceState(history.state, "", "?os=" + os)`, which keeps the router's `state.path`, so Back/popstate behaviour is unchanged.
7. **Copy feedback:** one shared visually-hidden `role="status"` element whose text is set on copy. The button label still changes for 1.5s as it does today.
8. **Visual mapping onto tokens (house rules):** one accent (`--color-ember-pulse`), used only on the primary Download and the selection bar. Surfaces are separated by tone steps (`--bg-card` / `--bg-sunken`), with no resting shadow and no gradient. Table header text is sentence case, not uppercase. "Latest" is plain text after the version, not a pill. Monospace is used only in command blocks, digests and file names. The lead version is the page's largest type (`clamp()` from the existing scale). Radii come from the existing tokens. Table rules stay because tables are exempt.
9. **Motion:** only transform/opacity on control feedback and a ≤200ms fade when the list content swaps, wrapped in `prefers-reduced-motion`. The taste-skill full motion layer (≥8 moving elements) targets marketing pages and is skipped here: this is a work screen.

## Risks / Trade-offs

- [Rendered output differs from the `design-taste-frontend` inspector's landing-page expectations (image floor, motion count)] → Run `inspect.mjs` with the relevant rules passed via `--allow` and record why. Lint and contrast still must pass.
- [`Get-FileHash` on Windows PowerShell 5.1 vs 7] → Both support `-Algorithm SHA256`. Verify on PS 5.1, the oldest shipped version.
- [Sticky panel taller than the viewport on short screens] → Sticky applies only with `@media (min-height: 720px) and (min-width: 1024px)`.
- [Stored `rel_shell` with a garbage value] → Validate against the two known values and fall back to `posix`.

## Apply notes

- **design-taste inspector:** the page's own findings are all fixed (eyebrow label, monospace outside `<code>`, text under 13px). The remaining FAILs come from the shared shell and are out of scope here: navbar/footer monospace and tiny caps, the footer hairlines, the `aura-glow` gradients, and the 12px body measured from the footer. `few-pictures`, `no-footage` and `still-page` are accepted per §9 because this is a work screen. `grey-body` (6.4:1) is defended: descriptions are secondary notes, and data and commands use the full ink.
- **Lint:** `.rel-name` and `.rel-digest` carry `taste-skill-ignore` because they style literal file names and digests. The em-dash WARN is the "—" missing-value glyph.

## Migration Plan

Front-end only. Rollback means reverting the commit. Archive `add-release-reels-page` before archiving this change.
