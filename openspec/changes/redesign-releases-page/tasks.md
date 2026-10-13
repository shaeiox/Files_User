# Tasks

## 1. State and command generation (`assets/js/releases.js`)

- [x] 1.1 Add shell state (`posix` | `pwsh`) read from `localStorage` `rel_shell` inside try/catch, validated, defaulting to `posix`. Replace `fileCommand`/`verifyCommand`/the latest command with per-shell builders per design §2. Verify: the console check `ReleasePage` commands for one file match the strings in design §2 for both shells, and corrupting `rel_shell` to `x` falls back to posix.
- [x] 1.2 Read the `os` query param on render (fallback `el9`) and `replaceState` on tab switch. Verify: `/download/release?os=el8` opens el8, `?os=el7` opens el9, and after switching tabs, Back leaves the page.
- [x] 1.3 Split `load()` outcomes into ok / empty / locked / error, with the Retry button calling `load()`, and add the delayed (>150ms) loading placeholder. Verify: stop `RELEASE_PVM` access or return 500 (DevTools request blocking on `/api/releases`) and the error state + Retry appear, not "No releases". A 401 shows the locked state.
- [x] 1.4 Run `node --check assets/js/releases.js`. Verify: exits 0.

## 2. Markup and interaction

- [x] 2.1 Render the lead block from `items[0]`: version (largest type), file name, size, date, primary Download, and the latest command + Copy. Hide it in empty/error/locked states. Verify: on el9 it shows the same file `curl -fLOJ /release9/latest` saves.
- [x] 2.2 Add the shell segmented control (`role="radiogroup"`, labelled). Switching it regenerates all three commands without a new `/api/hash` request. Verify in DevTools Network: no hash request on shell switch, and the digest stays visible.
- [x] 2.3 Make whole-row click select via the row's radio, skipping the Download link, and replace the pill badge with a "Latest" text marker. Verify: clicking a date cell selects the row, clicking Download keeps the prior selection, and arrow keys move the selection.
- [ ] 2.4 Add a shared visually-hidden `role="status"` for copy results. Verify with a screen reader (NVDA/Narrator) that "Copied" is announced and the clipboard matches the shown command.
- [x] 2.5 Add the new `en` + `fa` strings to `assets/js/i18n.js` (shell labels, error/retry, lead block, copy announcements). Verify: toggling language shows no raw keys, and `fa` mirrors the layout.

## 3. Visual rebuild (`assets/css/release.css`)

- [x] 3.1 Rewrite on existing tokens per design §4 and §8: two-column ≥1024px with sticky panel (min-height 720px), stacked below, and a stacked-row table below 640px. Remove uppercase/letter-spaced headers, the pill badge, resting shadows and gradients. Verify: screenshots at 1440 / 1024 / 768 / 390 show no horizontal page scroll and all data visible.
- [x] 3.2 Add selection indication (radio + tone step + inline-start accent bar), visible `:focus-visible` on every control, and `prefers-reduced-motion` handling. Verify: tab through the page with every focus visible, and selection is distinguishable in grayscale.
- [x] 3.3 Run the design gate: `node ~/.claude/skills/design-taste-frontend/scripts/lint.mjs assets/js/releases.js assets/css/release.css` and `inspect.mjs http://localhost:4000/download/release`, then fix every FAIL. Record any `--allow` (image floor, motion count) with a one-line reason in the change notes. Verify: no FAILs, contrast passes in light and dark themes.

## 4. Integration verification

- [x] 4.1 End-to-end in both shells: select a release → copy download → run → Verify SHA-256 → copy verify command → run. Verify: posix prints `<name>: OK`, and PowerShell 5.1 prints `True`.
- [x] 4.2 Run `openspec validate redesign-releases-page --strict`. Verify: exits clean.

## Workflow follow-up

- Archive `add-release-reels-page` first (creates the base `releases-page` spec), then archive this change.
