# Tasks: Enterprise UI Redesign ("Obsidian Kinetic")

Incremental delivery. Each phase is independently verifiable, leaves the application working, preserves 100%
of existing behavior, and does not implement any later phase's work. **No phase may be started without
explicit human approval.** If any task appears to violate a Locked Invariant (I1–I20), that task is invalid
and work stops.

Every phase below declares a **HARD GATE** scenario where a locked invariant is at risk. Failing a HARD GATE
blocks phase approval regardless of all other passing work.

**Global rules for every phase**

- Read `openspec/changes/enterprise-ui-redesign/proposal.md` (D1–D7, I1–I20, Out of Scope) and `design.md`
  before touching any file.
- Do not modify `template/new-home.html` (I17). It is reference-only.
- Do not modify `browse.html` (I18, D7).
- Do not modify anything under `lib/` (I9).
- Do not run `git add`, `git commit`, or `git push`.
- Do not fix any of the 11 pre-existing defects recorded in Phase 0 (authoring rule 7). Do not regress them
  further either. If a redesign step makes one more likely to trigger, record it as a risk in the phase
  report and stop.

---

## Phase 1 — Design Tokens + Fonts

**Objective:** Replace the live token values in `assets/css/tokens.css` with the authoritative D4 palette,
add the light-theme block, introduce the four new scales plus `--nav-h`, self-host the three font families,
and remove the CSP-blocked Google Fonts links — with **zero** behavioral delta.

**Prerequisites:** Human approval of the OpenSpec artifacts. Resolution of OQ-1 (light-theme values), OQ-2
(alias bridge), and OQ-5 (font file provenance). None.

**In-scope files:**

- `assets/css/tokens.css`
- `assets/fonts/*.woff2` (new — nine files, D6)
- `index.html` — **font `<link>` tags only**

**Out-of-scope files:** every other file. Specifically `base.css`, `components.css`, `home.css`,
`browse.css`, `performance-modes.css`, `browse.html`, all of `assets/js/**`, all of `lib/**`,
`template/new-home.html`, `server.js`, `package.json`, `nginx.conf`.

**Tasks:**

- [ ] 1.1 Confirm the four current token blocks in `assets/css/tokens.css` and record their exact declaration
  order. Do not restructure the file; only replace and append declarations.
- [ ] 1.2 Declare the complete D4 palette in `:root`, verbatim, per `design.md` §2.2. Group order: core
  surfaces, foreground, outlines, primary (Cyber Amber), secondary (Electric Indigo), tertiary (Cyan
  Stream), error, glows.
- [ ] 1.3 Declare the nine-token typography scale, six-token radius scale, ten-token spacing scale, and
  nine-token z-index scale from D6 in `:root`. `--radius-DEFAULT` is required verbatim.
- [ ] 1.4 Declare `--nav-h` in `:root` at the current desktop value, and add its mobile override inside the
  existing `@media (max-width: 640px)` block at the current mobile value. Add **no** `calc()` consumer
  anywhere in this phase.
- [ ] 1.5 Convert every legacy token name listed in `design.md` §2.4 into an alias resolving to exactly one D4
  token. Do not delete any legacy name that has a live consumer. Mark `--s1`…`--s24`, `--r1`…`--r-full`,
  `--radius`, `--a-1`…`--a-8`, unused `--n-*`, unused `--color-*`, `--warning`, `--ease-out`, `--dur-1`…`--dur-3`,
  unused `--text-*` size tokens, and `--hero-grad` as deprecated with a comment; do not remove them.
- [ ] 1.6 Resolve the `--background` name collision: D4's `--background: #121316` wins over the dead shadcn
  HSL-triplet of the same name. Drop or rename the shadcn triplet block; confirm no rule wraps any shadcn
  token in `hsl()`.
- [ ] 1.7 ~~Repoint the `--hero-grad` token~~ **CANCELLED by D8/I21.** `--hero-grad` is consumed only by the
  frozen `.hero-max`, so it must keep its current value in both theme blocks. Verified by task 1.13.
- [ ] 1.8 Rewrite the `[data-theme="light"]` block so it declares exactly the same token names as
  `[data-theme="dark"]`, applying D4's derivation rule and sourcing any unpinned value from the
  already-present light-theme declarations per OQ-1. Keep `--primary-container: #ffb800` in both themes.
      - **HARD GATE:** the light block and the dark block must have identical token-name sets.
- [ ] 1.9 Add the nine `@font-face` declarations for Inter, JetBrains Mono, and Vazirmatn at weights 400/500/600,
  each with `font-display: swap`, sourcing from `/assets/fonts/*.woff2`. Confirm every path satisfies the CSP
  `font-src 'self' data:` directive.
- [ ] 1.10 Repoint `--font`, `--font-display`, `--font-hero`, `--font-fa`, `--mono` to the self-hosted families
  per `design.md` §3.3.
- [ ] 1.11 Remove the three Google Fonts `<link>` tags from `index.html` (two `preconnect` and the `css2`
  stylesheet). Change nothing else in `index.html` — not the six stylesheet links, not the icon link, not the
  inline pre-paint theme/perf script, not `<main id="app">`, not the script load order.
- [ ] 1.12 Do **not** touch `browse.html` even though it carries the same Google Fonts tags (I18).
- [ ] 1.13 **Hero token insulation audit.** Grep `home.css` for all token references inside `.hero-max` and
  its descendants. Document which tokens the Hero consumes. If any of these tokens will change value in task
  1.1-1.3, add explicit pinned-value overrides in `home.css` scoped to `.hero-max` to prevent visual drift.
  Validation: visual diff of the Hero section before and after token changes shows zero difference.
      - Per `design.md` §2.4, the alias rows that MUST be pinned are: `--color-ember-pulse` (feeds
        `.hero-pill-dot` and the hero gradient stop), `--color-electric-iris` (feeds the headline `.accent`
        gradient stop), and `--radius-panels` (feeds `.hero-max` and its `::before`/`::after` clip paths).
      - `--hero-grad` is consumed **only** by the frozen `.hero-max`, so task 1.7 is cancelled by D8: the
        token keeps its current value in both theme blocks.
      - **HARD GATE:** `.hero-max` innerHTML and computed styles are byte-identical before and after Phase 1.

**Validation:**

- `git diff --stat` lists only `assets/css/tokens.css`, `index.html`, and the new `assets/fonts/` files.
- Grep assertion — no selector, id, class, or `data-*` changed: `git diff index.html` shows deletions only on
  the three `<link>` lines.
- Grep assertion — no new colors outside D4: `git diff assets/css/tokens.css` contains no hex or `rgba(`
  literal absent from D4 except the two explicitly marked `derive` entries.
- Token-set equality: extract the token names declared in `[data-theme="light"]` and in `[data-theme="dark"]`
  and confirm the sorted sets are identical.
- Legacy-survival: for each name in `design.md` §2.4, confirm it is still declared.
- `@font-face` count is 9; every declaration carries `font-display: swap`; every `src` path is under
  `/assets/fonts/` and ends in `.woff2`.
- No `hsl(` wrapper anywhere references a removed shadcn token.
- Visual: dark and light themes both render with no unstyled flash; `--nav-h` is declared but unreferenced.
- Behavioral (HARD GATE, I1): scroll the page — `.nav` remains visible and stuck at 12 px from the top.
- Behavioral (I2): `body { overflow-x: hidden }` still present in `base.css`; `.page` and `#app` still have
  no `overflow` declaration; `html` still has no `overflow`.
- Behavioral: `.aura-backdrop` still renders (the `home.css` override still wins with `z-index: -1`).
- Behavioral: `⌘K` still focuses `#globalSearch`; autocomplete still opens; theme toggle still switches;
  language pill still shows `EN`.
- Hero section visual regression check: the Hero must look identical before and after token changes.
- **HARD GATE (D8/I21):** `.hero-max` innerHTML and computed styles are byte-identical before and after Phase 1.

**Completion condition:** tokens replaced, light theme structurally parallel, fonts self-hosted, Google
Fonts links gone, `git diff` confined to the three allowed paths, and **zero** behavioral delta.

**Applicable Agent Skills:** `frontend-ui-engineering`, `constraint-driven-development`.

### Phase 1 — Final Report Template

```
## Phase 1 — Design Tokens + Fonts: COMPLETE / BLOCKED

### Files changed
- (list with line counts)

### Tokens
- D4 tokens declared: N / M
- Legacy aliases converted: N
- Deprecations marked (not removed): N
- Light/dark token-name sets identical: YES / NO
- OQ-1 resolution used: (state which derivation was applied)

### Fonts
- woff2 files added: N / 9
- @font-face declarations: N
- All font-display: swap: YES / NO
- Google Fonts links removed from index.html: YES / NO
- browse.html untouched: YES / NO

### HARD GATE results
- Light/dark structural parallel: PASS / FAIL
- I1 sticky navbar intact: PASS / FAIL
- I2 no overflow on .page / #app: PASS / FAIL

### Validation evidence
- git diff --stat: (paste)
- token-set equality command + result: (paste)

### Behavior deltas observed
- (list, or "none")

### Pre-existing defects
- (list any that became MORE likely to trigger, or "none")

### Risks / notes
- (list, or "none")
```

---

## Phase 2 — Backdrop & Shell Base

**Objective:** Restyle the existing `.aura-backdrop` / `.aura-base` / `.aura-glow-1` / `.aura-glow-2` layers
with pure CSS to evoke Obsidian Kinetic, and add the `[data-perf]` tier overrides that gate them.

**Prerequisites:** Phase 1 approved and its report accepted.

**In-scope files:**

- `assets/css/base.css`
- `assets/css/home.css` (backdrop rules only)
- `assets/css/performance-modes.css` (backdrop tier overrides only)

**Out-of-scope files:** `tokens.css`, `components.css`, `browse.css`, `index.html`, `browse.html`, all of
`assets/js/**`, all of `lib/**`, `template/new-home.html`.

**Tasks:**

- [ ] 2.1 Restyle `.aura-backdrop` in `base.css:95-101` — preserve its resolved `position: fixed`, viewport
  coverage, `overflow: hidden`, `pointer-events: none`, and `z-index: 0`.
- [ ] 2.2 Restyle `.aura-base`, `.aura-glow-1`, `.aura-glow-2` in `base.css:103-133` using the D4 surface ramp
  plus two offset radial-gradient orbs tinted by `--glow-amber` and `--glow-indigo`. Use
  `--surface-container-lowest` for the deepest tone.
- [ ] 2.3 Preserve the `home.css:1385-1392` override block exactly in effect: `position: fixed`, viewport
  coverage, `pointer-events: none`, `z-index: -1`. Do **not** raise it above `--z-base`; `.page` at
  `z-index: 1` is what separates the backdrop from content.
- [ ] 2.4 Leave `.aura-vignette` and its `display: none` rule untouched (no matching element exists; adding one
  would be markup scope creep).
- [ ] 2.5 Add the peripheral vignette as part of the `.aura-base` wash using D4 tokens only.
- [ ] 2.6 Add an optional `backdrop-filter` to `.aura-base` for the frosted-glass read.
- [ ] 2.7 Add `[data-perf="low"]` and `[data-perf="potato"]` overrides in `performance-modes.css` that collapse
  the orbs to a single static gradient and remove `backdrop-filter` entirely (I12).
      - **HARD GATE:** every backdrop rule using `backdrop-filter`, `blur`, `filter`, or `animation` has a
        matching override in **both** tier blocks.
- [ ] 2.8 Add a `prefers-reduced-motion: reduce` guard for any backdrop animation.
- [ ] 2.9 Confirm no JavaScript was added or changed. **No WebGL, no `requestAnimationFrame`, no
  `ResizeObserver`, no `mousemove` listener, no `<canvas>` element** (D5).
- [ ] 2.10 Confirm no `overflow` value was added to `.page`, `#app`, or `html` (I2).

**Validation:**

- Grep assertion — no forbidden technology: zero occurrences of `canvas`, `webgl`, `requestAnimationFrame`,
  `ResizeObserver`, `mousemove`, `getContext` across the three touched stylesheets.
- Grep assertion — `git diff --stat` lists only the three in-scope stylesheets.
- Grep assertion — `.aura-backdrop` still has `pointer-events: none` and resolves to `z-index: -1`.
- Grep assertion — `.page` and `#app` still have no `overflow` declaration.
- Perf parity: each new backdrop selector appears under both `[data-perf="low"]` and `[data-perf="potato"]`.
- Visual: backdrop visible in the dark theme; not overpowering content; `.hero-visual` overhang and
  `mix-blend` reads correctly against it.
- **HARD GATE (D8/I21):** `.hero-visual`'s `right` / `top` / `transform` / `width` declarations and its
  `≤1024px` and `≤640px` overrides are byte-identical after Phase 2. A stray change to
  `.hero-visual { right }` during Phase 1 or 2 is grounds for reverting that change.
- Behavioral (HARD GATE, I1): backdrop never intercepts clicks — clicking anywhere over it, including the
  page edges, activates the underlying control.
- Behavioral: scrolling the page still moves the backdrop correctly (it is fixed, not sticky).
- Responsive: the backdrop renders acceptably at 1440, 1024, 900, 768, 640, and 480 px.
- Perf: with `data-perf="low"` and `data-perf="potato"` forced, no `backdrop-filter` blur remains active.

**Completion condition:** backdrop restyled in pure CSS with zero new JavaScript, correct stacking, and
complete `low`/`potato` tier overrides.

**Applicable Agent Skills:** `frontend-ui-engineering`, `performance-optimization`.

### Phase 2 — Final Report Template

```
## Phase 2 — Backdrop & Shell Base: COMPLETE / BLOCKED

### Files changed
- (list with line counts)

### Layers restyled
- .aura-base: (one-line description)
- .aura-glow-1: (one-line description)
- .aura-glow-2: (one-line description)
- .aura-backdrop stacking resolved to: (position / z-index / pointer-events)

### Technology compliance
- Zero canvas/webgl/rAF/ResizeObserver/mousemove: YES / NO
- Zero new JavaScript: YES / NO

### HARD GATE results
- I2 no overflow added to .page / #app / html: PASS / FAIL
- I1 backdrop never intercepts clicks: PASS / FAIL
- I12 perf override for every new effect: PASS / FAIL

### Validation evidence
- forbidden-technology grep + result: (paste)
- perf-tier override grep + result: (paste)

### Behavior deltas observed
- (list, or "none")

### Pre-existing defects
- (list any that became MORE likely to trigger, or "none")

### Risks / notes
- (list, or "none")
```

---

## Phase 3 — Navbar Redesign

**Objective:** Restyle `.nav`, `.nav-bar`, `.nav-logo`, `.nav-tabs`, `.nav-tab`, `.nav-actions`,
`.perf-pill`, `.perf-dropdown-menu`, `.lang-dropdown-wrap`, `.lang-dropdown-menu`, and the theme button to
Obsidian Kinetic, while the navbar remains a floating sticky pill at `top: 12px`.

**Prerequisites:** Phases 1 and 2 approved and their reports accepted.

**In-scope files:**

- `assets/css/components.css` (navbar rules only)
- `assets/css/tokens.css` (`--nav-h` consumption only; no other token change)
- `assets/css/performance-modes.css` (navbar tier overrides only)
- `index.html` — class additions only, each individually documented in the phase report

**Out-of-scope files:** `base.css`, `home.css`, `browse.css`, all of `assets/js/**`, `browse.html`, all of
`lib/**`, `template/new-new-home.html` / `template/new-home.html`, `server.js`, `package.json`.

**Tasks:**

- [ ] 3.1 Restyle `.nav` (`components.css:9-14`) — **`position: sticky` and `top: 12px` are unchanged**; replace
  `z-index: 50` with `var(--z-sticky)`, which reproduces 50 exactly.
      - **HARD GATE (I1):** `.nav` must still be `position: sticky` with `top: 12px`; never `fixed`, never
        `absolute`.
- [ ] 3.2 Restyle `.nav-bar` (`components.css:16-29`) — keep `display: flex`, the three-region
  `justify-content: space-between` layout, and `backdrop-filter: blur(16px)`; repoint `height` to
  `var(--nav-h)`; repoint `background` to the D4 navbar surface; repoint `border` to `--border-hairline`;
  add the D4 amber hover border using `--border-active`.
- [ ] 3.3 Preserve the `.nav-bar` height override inside the existing `@media (max-width: 640px)` block, now
  driven by `--nav-h`'s mobile value.
- [ ] 3.4 Restyle `.nav-logo`, `.nav-logo img`, `.nav-logo-text strong`, `.nav-logo-text span` — glass tile,
  amber hairline, `--glow-amber` on the brand mark. Image `src` stays `/assets/icon/logo.webp` (remote
  Stitch images are CSP-blocked and D3-forbidden).
- [ ] 3.5 Restyle `.nav-tabs` and `.nav-tab` — keep `.nav-tabs` `position: absolute; left: 50%;
  transform: translateX(-50%)` (it depends on `.nav` being a positioned ancestor for stickiness). Keep the
  three existing tabs with their real hrefs and `aria-current="page"`. **Do not add the Stitch's five
  workspace tabs** — they have no destination and would fabricate navigation (D3).
- [ ] 3.6 Preserve `.nav-tabs { display: none }` inside the existing `@media (max-width: 900px)` block exactly as
  written. This is existing verified behavior, not chrome.
- [ ] 3.7 Restyle `.nav-actions`, `.perf-pill`, `.perf-option`, `.perf-indicator-dot`, `.perf-dropdown-menu` —
  keep `.show` on the **wrapper** as the open mechanism and keep the four-property hidden state
  (`opacity` + `visibility` + `transform` + `pointer-events`). Keep `data-perf-val` values
  (`AUTO`/`HIGH`/`MEDIUM`/`LOW`/`POTATO`).
- [ ] 3.8 Restyle `.lang-dropdown-wrap`, `.lang-pill`, `.lang-dropdown-menu`, `.lang-option` — **keep the
  CSS `:hover`-only open mechanism**. Do not add a `.show` path and do not start updating `aria-expanded`;
  that recorded pre-existing gap is out of scope (authoring rule 7).
- [ ] 3.9 Restyle `#themeBtn`, `.icon-sun`, `.icon-moon` — the two stacked SVGs are clipped by the button's
  `overflow: hidden`, which must be preserved.
- [ ] 3.10 Add `[data-perf="low"]` and `[data-perf="potato"]` overrides for every new navbar effect (I12).
- [ ] 3.11 Add `[dir="rtl"]` mirrors for every new direction-sensitive navbar rule (I13). Prefer logical
  properties where an existing physical-property rule is not being rewritten.
- [ ] 3.12 If any `index.html` class addition is strictly required, document each one individually in the phase
  report with its justification. **No id change. No `data-*` change. No element added to or removed from
  `.nav-bar`.** `.nav` and `.footer` stay siblings of `#app`, never moved inside it (I5).

**Validation:**

- Grep assertion — `.nav` rule still contains `position: sticky` and `top: 12px`, and contains no `fixed` or
  `absolute`.
- Grep assertion — the z-index value resolves to 50: confirm `--z-sticky` is `50`.
- Grep assertion — `#themeBtn`, `#langBtn`, `#currentLangLabel`, `.lang-dropdown-menu`, `.perf-pill`,
  `.perf-dropdown-menu`, `.nav-tabs`, `.nav-tab` all still present in `index.html`.
- Grep assertion — `data-i18n` attributes on the navbar unchanged (`brand`, `subtitle`, `website`, `docs`,
  `downloads`, `perfLabel`, `perfAuto`, `perfHigh`, `perfMed`, `perfLow`, `perfPotato`); `data-link` on
  `.nav-logo`; `data-perf-val` on all five perf options.
- Grep assertion — the `@media (max-width: 900px)` `.nav-tabs { display: none }` rule is unchanged.
- Grep assertion — the `@media (max-width: 640px)` nav-height rule is present.
- Diff assertion — no change to `assets/js/theme.js`, `assets/js/i18n.js`, or `assets/js/home.js`.
- Behavioral (HARD GATE, I1): scroll a long page — the navbar stays visible, stuck 12 px from the top, and
  never detaches, clips, or jumps.
- Behavioral (HARD GATE, I2 — negative): confirm `.page` and `#app` still have **no** `overflow` declaration.
  Adding `overflow` to either is rejected outright, not fixed forward.
- Behavioral: the performance dropdown opens on click, closes on outside click, and the selected option keeps
  its indicator dot.
- Behavioral: the language menu opens on hover, the active language keeps `.active`, and `#currentLangLabel`
  updates.
- Behavioral: the theme button still toggles `data-theme`, persists to `localStorage['cav_theme']`, updates
  `<meta name="theme-color">`, and triggers the `.wiping` logo animation.
- Behavioral: the three nav tabs navigate or open externally as before; the Downloads tab keeps
  `aria-current="page"`.
- Responsive: renders correctly at 1440, 1024, 900, 768, 640, and 480 px in both themes; no horizontal
  overflow; `.nav-bar` stays within its height at every width.
- RTL: switch to Persian and confirm the navbar mirrors correctly.

**Completion condition:** navbar fully restyled as a floating sticky pill with every id, `data-*`, dropdown
mechanism, and responsive rule intact.

**Applicable Agent Skills:** `frontend-ui-engineering`, `code-review-and-quality`.

### Phase 3 — Final Report Template

```
## Phase 3 — Navbar Redesign: COMPLETE / BLOCKED

### Files changed
- (list with line counts)

### index.html class additions (if any)
- (each addition + justification, or "none")

### Restyled selectors
- (list)

### HARD GATE results
- I1 .nav position sticky / top 12px / z-index 50: PASS / FAIL
- I2 NEGATIVE: no overflow added to .page / #app: PASS / FAIL
- I12 perf override for every new navbar effect: PASS / FAIL
- I13 RTL mirror for every new direction-sensitive rule: PASS / FAIL

### Preserved mechanisms (confirm unchanged)
- .perf dropdown opens via .show on wrapper: YES / NO
- .lang dropdown opens via :hover only: YES / NO
- .themeBtn clipped via overflow: hidden: YES / NO
- ≤900px .nav-tabs display: none: YES / NO
- ≤640px nav height override: YES / NO
- --nav-h now consumed by .nav-bar: YES / NO

### Validation evidence
- sticky-rule grep + result: (paste)
- id/data-* survival grep + result: (paste)

### Behavior deltas observed
- (list, or "none")

### Pre-existing defects
- (list any that became MORE likely to trigger, or "none")

### Risks / notes
- (list, or "none")
```

---

## Phase 4 — Home Page Redesign

**Objective:** Restyle the Home page areas OUTSIDE the frozen Hero section: `.resources-section` (resource
cards), `.bottom-grid` (releases, quick access, OS tabs), `#resultsBox` (search results panel), and
`.status-bar`. The Hero section (`.hero-max` and all descendants) is FROZEN per D8/I21 and must not be
modified.

**Prerequisites:** Phases 1–3 approved and their reports accepted.

**In-scope files:**

- `assets/css/home.css` — **excluding every rule whose selector targets `.hero-max` or one of its descendants**
- `assets/css/components.css` (only if a shared component styled here is restyled)
- `assets/js/home.js` — **presentational markup only, excluding the Hero-emitting code path**
- `assets/css/performance-modes.css`

**Out-of-scope files:** `base.css`, `browse.css`, `tokens.css`, `browse.html`, `router.js`,
`services/resource-service.js`, `file-actions.js`, `theme.js`, `autocomplete.js`, `i18n.js`,
`lib/idle-timer.js`, all of `lib/**`, `template/new-home.html`.

**Out-of-scope files/selectors (D8/I21):**

- `.hero-max` and all descendant selectors in `home.css` (`.hero-content`, `.hero-pill`, `.hero-pill-dot`,
  `.hero-bg`, `.hero-desc`, `.hero-search`, `.search-keys`, `.logo-shader`, `.logo-swap`, `.logo-layer`,
  `.hero-visual`)
- The Hero-emitting code path in `home.js` (the portion of `render()` that builds `.hero-max`)
- The `.ac-dropdown` / `.ac-list` / `.ac-item` styles **as they render inside `.hero-max`**
- The `#globalSearch` element and its `.input-wrap` ancestor

**Allowed markup edits in `home.js`:** class names, wrapper `<div>` elements, inline decorative `style`
attributes, inline SVG markup — **none of these inside the Hero-emitting code path.**

**Forbidden markup edits in `home.js`:** any id, any `data-*` attribute, any `data-i18n*` attribute, any
element count JS depends on, the `textContent` of any element JS reads, and any URL construction.

**Tasks:**

- [ ] 4.1 **Hero freeze verification.** Before any Home page CSS or JS change, run a visual snapshot / DOM
  hash of `.hero-max`. After all Phase 4 changes, verify the Hero DOM and computed styles are byte-identical.
  If any drift is detected, revert the offending change. Additionally confirm byte-identical preservation of
  `.hero-max { overflow: visible !important }` (`components.css:626`) and of the `.hero-search` /
  `.input-wrap` `z-index: 1000 !important` stacking chain, both of which the autocomplete dropdown depends on.
  - **HARD GATE:** `.hero-max` innerHTML and computed styles are byte-identical before and after Phase 4.
  - **HARD GATE:** `#globalSearch` still has a `.input-wrap` ancestor (autocomplete contract).
  - **HARD GATE:** `#logoSwap` wipe animation still functions (700 ms `.wiping` class).
- [ ] 4.2 Restyle `.resources-section`, `.section-head`, `.section-head-left`, `.section-icon`, `.section-title`,
  `.section-sub`, `.section-controls`.
- [ ] 4.3 Restyle `.resource-card` with the Stitch card chrome — `--radius-lg`, `--surface-container-low` fill,
  `--border-hairline`, amber border plus `--glow-amber` on hover, `--inset-highlight` top edge, hover
  translate. Keep `.resource-card:hover` transform behavior coherent with the existing rules.
- [ ] 4.4 Restyle `.resource-icon`, `.resource-meta`, `.resource-bottom`, `.resource-arrow`, `.status-live`,
  `.status-error`, `.dot`, `.dot-error`, `.badge`, `.badge-error`, `.badge-new`, `.stat-empty`.
- [ ] 4.5 Preserve `id="resourcesGrid"` on the grid — `home.js` reads it at four call sites — and the `.stagger`
  class.
- [ ] 4.6 Restyle `.bottom-grid`, `.panel`, `.panel-head`, `.panel-head-left`, `.panel-icon`, `.panel-title`,
  `.panel-sub`, `.panel-head-controls`, `.panel-link`.
      - **HARD GATE:** `#viewAllReleases` is given `display: inline-flex` by JS in two places; the restyled
        `.panel-link` must remain `inline-flex` so the JS-set value still matches the class's layout.
- [ ] 4.7 Restyle `.releases-table` and its cells. **Preserve** the `≤768px` rules that hide `nth-child(3)` and
      `nth-child(5)` — the table's hard-coded `colspan="6"` in `home.js` is coupled to exactly those
      ordinals, and the column count must not change.
- [ ] 4.8 Restyle `.type-cell`, `.version-cell`, `.version-name`, `.download-btn`, `.row-actions`,
  `.quick-list`, `.quick-item`, `.quick-icon`, `.quick-meta`, `.quick-meta-title`, `.quick-meta-sub`,
  `.quick-arrow`.
- [ ] 4.9 Restyle `.results-panel`, `.results-bar`, `.results-bar-title`, `.results-bar-meta`, `.results-body`,
  `.res-row`, `.res-info`, `.res-path`.
      - **HARD GATE:** `.results-body { max-height: 360px; overflow-y: auto }` must be preserved — it is one of
        only three nested scroll containers in the application.
- [ ] 4.10 Restyle `.status-bar`, `.status-item`, `.status-item-icon`, `.status-item-text`, `.status-item-label`,
  `.status-item-sub`, `.status-dot`. Preserve the `≤900px` 2×2 and `≤480px` 1-column collapses and their
  border rules.
- [ ] 4.11 Preserve `id="lastSyncTime"` — `home.js` writes it.
- [ ] 4.12 If any presentational markup edit is made in `home.js`, restrict it to the whitelist above and
      document every edit in the phase report.
- [ ] 4.13 Preserve `window.triggerAuthModal = showLoginModal` (`home.js:1113`) exactly. **No new `window.*`
      global** (I14).
- [ ] 4.14 Do not widen the XSS surface. `resourceCard()` and `addResult()` interpolate server strings
  unescaped today; new markup must not add further unescaped interpolation, and the existing code must not
  be modified to remove the escaping it does have.
- [ ] 4.15 Do not fix the two hard-coded English sort options (`home.js:126`, `home.js:130`).
- [ ] 4.16 Add `[data-perf="low"]` / `[data-perf="potato"]` overrides for every new effect (I12) and `[dir="rtl"]`
      mirrors for every new direction-sensitive rule (I13).
- [ ] 4.17 Assert **no** D3-banned string appears: `SOC 2`, `ISO/IEC 27001`, `HIPAA`,
      `Tier-1 Infrastructure Carrier`, `Cryptographically Verified Release Mirrors`, `v4.8`, `8 Packages`,
      and no fabricated card data.

**Validation:**

- Grep assertion — every Home id in I6 still present in `home.js` or `index.html`: `#globalSearch`,
  `#searchBtn`, `#stopBtn`, `#logoSwap`, `#resourcesGrid`, `#catFilterWrap`, `#sortFilterWrap`,
  `#refreshResourcesBtn`, `#viewGridBtn`, `#viewListBtn`, `#releasesContainer`, `#releasesBody`,
  `#releaseAuthAction`, `#viewAllReleases`, `#releaseLogoutBtn`, `#quickAccessList`, `#resultsBox`,
  `#resultsTitle`, `#progress`, `#resultsList`, `#lastSyncTime`, `#osTabs`.
- Diff assertion — `git diff assets/js/home.js` contains **no** changed id, no changed `data-*`, no changed
  `data-i18n*`.
- Structural assertion (HARD GATE): `#globalSearch` still has `.input-wrap` as an **ancestor**, and
  `.ac-dropdown` still resolves inside that wrapper.
- Behavioral: typing in `#globalSearch` opens the autocomplete dropdown after the 150 ms debounce; ↑/↓ navigate
  with `scrollIntoView`; Enter on a file downloads; Enter on a directory SPA-navigates; Escape closes.
- Behavioral: `⌘K` focuses `#globalSearch`.
- Behavioral: `Enter` runs the full search, `#stopBtn` cancels, `#resultsBox` becomes visible and scrolls into
  view, `#progress` updates, `#resultsList` populates, and clicking a result navigates or downloads.
- Behavioral (three call sites): the auth modal opens from the releases locked state, from the
  `[data-url]` path, and from Browse's locked state. `window.triggerAuthModal` still resolves.
- Behavioral: the releases table renders with 6 columns and the `≤768px` collapse still hides columns 3 and
  5; `colspan="6"` rows still align.
- Behavioral: the category filter menu is rebuilt by `populateCategoryFilter` and its options still carry
  `data-val`; selecting an option still filters.
- Behavioral: `#refreshResourcesBtn` still shows the `.spinning` state and forces a cache-clearing refetch.
- Behavioral: the Home grid/list toggle still writes `gridTemplateColumns` and moves `.active`.
- Behavioral: `#lastSyncTime` updates after a successful load.
- Behavioral (HARD GATE): `.panel-link` remains `inline-flex` after `#viewAllReleases` is shown.
- Behavioral (HARD GATE): `.results-body` still scrolls internally at `max-height: 360px` without moving the
  page scroll.
- Content: cards render only from `ResourceService.getResources()`; counts and dates come from the API; no
  fabricated data; all D3-banned strings absent (grep).
- Responsive: all six breakpoints render correctly in both themes and both directions; `≤640px` still hides
  `.section-controls .view-toggle`.
- Perf: forcing `data-perf="low"` and `"potato"` disables every new blur/animation.
- HARD GATE: `.hero-max` innerHTML and computed styles are byte-identical before and after Phase 4.
- HARD GATE: `#globalSearch` still has `.input-wrap` ancestor (autocomplete contract).
- HARD GATE: `#logoSwap` wipe animation still functions (700ms `.wiping` class).
- Grep assertion (D8/I21): `git diff assets/css/home.css` contains **no** added, removed, or modified
  declaration whose selector targets `.hero-max` or one of its descendants, other than the token-pinning
  overrides authorised by task 1.13.

**Completion condition:** Home fully restyled with zero id/`data-*` deltas, all three auth call sites intact,
autocomplete intact, and all content API-driven.

**Applicable Agent Skills:** `frontend-ui-engineering`, `incremental-implementation`.

### Phase 4 — Final Report Template

```
## Phase 4 — Home Page Redesign: COMPLETE / BLOCKED

### Files changed
- (list with line counts)

### home.js markup edits
- (each edit: renderer function, what changed, why, or "none — CSS only")

### HARD GATE results
- .panel-link remains inline-flex: PASS / FAIL
- .results-body keeps max-height 360px + overflow-y auto: PASS / FAIL
- #globalSearch still inside .input-wrap: PASS / FAIL
- .wiping contract on #logoSwap intact: PASS / FAIL
- I12 / I13 parity: PASS / FAIL

### Id / data-* delta
- ids changed: (list or "none")
- data-* changed: (list or "none")
- data-i18n* changed: (list or "none")

### Preserved behavior confirmed
- autocomplete (debounce / arrows / enter / escape): YES / NO
- ⌘K focus: YES / NO
- full search + stop + scrollIntoView: YES / NO
- auth modal from all three call sites: YES / NO
- window.triggerAuthModal resolves: YES / NO
- releases table 6 columns + ≤768 collapse: YES / NO
- category filter rebuild + data-val: YES / NO
- refresh button + .spinning: YES / NO
- grid/list toggle + gridTemplateColumns: YES / NO
- #lastSyncTime updates: YES / NO

### Content discipline
- D3-banned strings present: (list or "none")
- Card data source: ResourceService.getResources()

### Behavior deltas observed
- (list, or "none")

### Pre-existing defects
- (list any that became MORE likely to trigger, or "none")

### Risks / notes
- (list, or "none")
```

---

## Phase 5 — Browse Page Redesign

**Objective:** Restyle the Browse row, controls, breadcrumbs, and states to Obsidian Kinetic, with the
six-child row contract as the hardest gate in this change.

**Prerequisites:** Phases 1–4 approved and their reports accepted.

**In-scope files:**

- `assets/css/browse.css`
- `assets/js/browse.js` — row chrome only
- `assets/css/performance-modes.css`

**Out-of-scope files:** `base.css`, `home.css`, `components.css`, `tokens.css`, `browse.html`, `router.js`,
`services/resource-service.js`, `file-actions.js`, `theme.js`, `autocomplete.js`, `i18n.js`,
`lib/idle-timer.js`, all of `lib/**`, `template/new-home.html`.

**Allowed markup edits in `browse.js`:** class names, wrapper elements, inline decorative styles, inline SVG
markup.

**Forbidden markup edits in `browse.js`:** the child count, the child order, any id, any `data-*` attribute,
the shared `linkAttr` computation, and any URL construction.

**Tasks:**

- [ ] 5.1 Restyle `.browse-layout`, `.browse-head`, `.browse-title-row`, `.browse-title-left`,
  `.browse-stats`, `.stat-item`, `.stat-val`, `.stat-dot`.
- [ ] 5.2 Restyle `.crumbs`, `.crumb`, `.crumb-active`, `.crumb-sep`.
      - **HARD GATE (I13):** preserve the `html[dir="rtl"] .crumb-sep svg { transform: scaleX(-1) }` mirror —
        the separator chevron direction is flipped in CSS and is the visible RTL indicator.
- [ ] 5.3 Restyle `.browse-controls`, `.browse-search`, `.filter-dropdown-wrap`, `.filter-pill`, `.filter-value`,
  `.filter-option`, `.view-toggle`, `.vt-btn`.
- [ ] 5.4 Preserve the `≤900px` rule that makes `.browse-search` full-width with `order: 1` and the
  `:focus-within` grow — behavior, not chrome.
- [ ] 5.5 Restyle `.file-tbl` — panel fill, `--radius-lg`, `--border-hairline`.
      - **HARD GATE (I2-adjacent):** `.file-tbl`'s `overflow: hidden` and `overflow-x: auto` must both
        survive. It is one of only three nested scroll containers and provides horizontal overflow protection.
- [ ] 5.6 Restyle `.file-tbl .trow` chrome — hover wash, border, transition.
      - **HARD GATE (I3):** do **not** change the desktop `grid-template-columns` track count or values,
        `gap`, `align-items`, `height`, or `padding` semantics in a way that breaks column alignment.
- [ ] 5.7 Restyle `.thead`, and preserve the `≤640px` rule that sets `.thead { display: none }`.
- [ ] 5.8 Restyle `.f-icon`, `.f-icon-dir`, `.f-icon-file`, `.f-icon-link`, and both `[data-theme="dark"]`
  variants. Keep the cell at its existing size so hover/focus emphasis causes no layout shift.
      - **HARD GATE (I3):** do **not** change the `.f-icon` box size, which would desynchronise it from the
        pinned 26 px action track.
- [ ] 5.9 Restyle `.f-name`, `.f-link` (list view ellipsis), and the `.grid-mode` 2-line `-webkit-line-clamp`
  variant.
- [ ] 5.10 Restyle `.badge`, `.badge-dir`, `.badge-file`, `.f-sub`.
- [ ] 5.11 Restyle `.f-actions` and `.f-action`.
      - **HARD GATE (I20):** the `.f-actions` hidden state continues to use `opacity` + `pointer-events`.
        `display: none` and `visibility: hidden` are forbidden — they would remove the control from the tab
        order and the accessibility tree, violating the archived `file-actions` spec.
      - **HARD GATE (I3):** `.f-action` stays `26px × 26px`. If it changes, `browse.css:177`,
        `browse.css:492`, and `.f-action` must all change together in the same task.
- [ ] 5.12 Preserve `:hover` and `:focus-within` reveal, and preserve the `@media (hover: none)` block that forces
  `opacity: 1; pointer-events: auto` for touch devices.
- [ ] 5.13 Restyle `.empty-box`, `.empty-circle`, `.empty-circle.err`, `.empty-text`.
- [ ] 5.14 Restyle `.locked-state`, `.locked-icon`, `.locked-title`, `.locked-desc` and its button, including the
  `≤1024px`, `≤768px`, and `≤480px` size collapses.
      - **HARD GATE:** `#browseAuthBtn` must keep its three-step handler chain
        (`HomePage.showLoginModal` → `window.triggerAuthModal` → `Router.navigate("/")`).
- [ ] 5.15 Restyle `.resources-error` and the in-page 404 block, preserving the dashed border treatment and the
  escaped `<code>` path display.
      - **HARD GATE:** the 404 path remains **in-page with no redirect**, and `#browseControls` is still hidden
        on error.
- [ ] 5.16 Restyle `.skeleton-box`, `.skeleton-line` (including the `.skeleton-line-title`, `-desc`, `-desc-sm`,
  `-meta` variants used by Home).
- [ ] 5.17 If any row markup edit is made in `browse.js`, restrict it to the whitelist and document each edit.
- [ ] 5.18 Do not add a new view mode, pagination, selection, or lazy loading.
- [ ] 5.19 Add `[data-perf="low"]` / `[data-perf="potato"]` overrides (I12) and `[dir="rtl"]` mirrors (I13).
- [ ] 5.20 Assert **no** D3-banned string appears.

**Validation:**

- DOM assertion — **HARD GATE (I3):** every `.trow` in `#rows` has exactly **6** element children.
- DOM assertion — **HARD GATE (I3):** a directory row also has exactly 6 children, with child 6 being
  `.f-actions` containing **zero** `.f-action` elements.
- DOM assertion — child order is `.f-icon` (1) → `.f-name` (2) → `.badge` wrapper (3) → `.f-sub` (4) →
  `.f-sub` (5) → `.f-actions` (6).
- DOM assertion — **HARD GATE (I4):** every file row's `.f-icon-link` and `.f-link` carry
  `data-file="true"`; every directory row's carry no `data-file`.
- DOM assertion — `.f-icon-link` and `.f-link` for the same item have **identical** `href` values.
- DOM assertion — no interactive element is nested inside another (no `<a>` inside an `<a>`).
- DOM assertion — `.thead` has 6 cells matching the 6 tracks.
- CSS assertion — the desktop and `≤640px` `grid-template-columns` declarations both still end in the 26 px
  action track, and `.f-action` is still 26 px wide.
- CSS assertion — `.f-actions` hidden state uses `opacity` and `pointer-events`; no `display: none` or
  `visibility: hidden` on it or on `.f-action`.
- CSS assertion — `.file-tbl` still has `overflow-x: auto`; `.page` and `#app` still have no `overflow`.
- Behavioral: the icon target and the name target each navigate or download **exactly once**, with no
  double activation and no row-level behavior.
- Behavioral: clicking a file row's `.f-action` starts exactly one download and does not also trigger the name
  link.
- Behavioral (I3/I4 with the router): a directory name/icon click performs SPA navigation with `pushState`
  and no full reload; a file target bypasses the router and downloads.
- Behavioral: `.f-actions` reveals on row hover, on `:focus-within`, and is permanently visible under
  `hover: none`.
- Behavioral: `#localSearchInput` filters, `#typeFilterWrap` filters by type, `#sortFilterWrap` sorts,
  **directories still sort above files for every sort option**, and the outside-click close still works.
- Behavioral: `#viewList` / `#viewGrid` toggle `.grid-mode`, persist to `localStorage['view_mode']`, and
  restore on load.
- Behavioral: `#breadcrumb` builds correctly, the leaf is `crumb-active`, ancestors are links, and the RTL
  chevron flips.
- Behavioral: skeletons show then are replaced; empty state appears for an empty folder and for a
  no-search-match folder; 401 shows the locked state; 404 shows the in-page error without redirecting; a
  generic failure shows `.resources-error`.
- Behavioral: `#folderCount` and `#fileCount` reflect the unfiltered totals.
- Responsive: the `≤640px` collapse still produces 3 tracks with children 3/4/5 hidden and `.thead` hidden;
  renders correctly at all six breakpoints in both themes.
- RTL: switch to Persian; breadcrumb chevron mirrors; name truncation still ellipsizes.
- Content: no fabricated data; all D3-banned strings absent (grep).

**Completion condition:** Browse fully restyled with the 6-child contract, three independent targets,
`data-file` coverage, sort semantics, and the `≤640px` collapse all verifiably intact.

**Applicable Agent Skills:** `frontend-ui-engineering`, `incremental-implementation`.

### Phase 5 — Final Report Template

```
## Phase 5 — Browse Page Redesign: COMPLETE / BLOCKED

### Files changed
- (list with line counts)

### browse.js markup edits
- (each edit + justification, or "none — CSS only")

### HARD GATE results
- I3 file row has exactly 6 children: PASS / FAIL
- I3 directory row has exactly 6 children incl. empty .f-actions: PASS / FAIL
- I3 child order correct: PASS / FAIL
- I3 both grid-template-columns end in the 26px track + .f-action is 26px: PASS / FAIL
- I4 every file target carries data-file="true": PASS / FAIL
- I20 .f-actions hidden via opacity + pointer-events only: PASS / FAIL
- I1/I2 .nav sticky intact + no overflow on .page / #app / #file-tbl overflow-x intact: PASS / FAIL
- Three auth handler chain on #browseAuthBtn intact: PASS / FAIL
- In-page 404 with no redirect: PASS / FAIL

### DOM assertion evidence
- child count per row type: (paste)
- child order: (paste)
- data-file coverage: (paste)
- href agreement icon vs name: (paste)
- .thead cell count: (paste)

### Preserved behavior confirmed
- icon/name/action each activate exactly once: YES / NO
- router SPA-nav for dirs / download bypass for files: YES / NO
- action reveal: hover / focus-within / hover:none: YES / NO
- local search + type filter + sort (folders first): YES / NO
- view toggle + localStorage restore: YES / NO
- breadcrumbs + RTL chevron: YES / NO
- skeletons / empty / 401 / 404 / generic error: YES / NO
- folderCount / fileCount reflect unfiltered totals: YES / NO
- ≤640px 3-track collapse + .thead hidden: YES / NO

### Content discipline
- D3-banned strings present: (list or "none")

### Behavior deltas observed
- (list, or "none")

### Pre-existing defects
- (list any that became MORE likely to trigger, or "none")

### Risks / notes
- (list, or "none")
```

---

## Phase 6 — Overlays & States

**Objective:** Restyle the auth modal and all four dropdowns in place, plus the skeleton, empty, error, and
locked states.

**Prerequisites:** Phases 1–5 approved and their reports accepted.

**In-scope files:**

- `assets/css/home.css` (auth modal lives here at `home.css:1462-1630`)
- `assets/css/components.css` (`.ac-dropdown` and any shared overlay primitive)
- `assets/css/browse.css` (only if a Browse-scoped overlay needs parity)
- `assets/css/performance-modes.css`

**Out-of-scope files:** `base.css`, `tokens.css`, `assets/js/home.js`, `assets/js/browse.js`,
`assets/js/router.js`, `assets/js/i18n.js`, `assets/js/autocomplete.js`, `assets/js/theme.js`,
`browse.html`, all of `lib/**`, `template/new-home.html`.

**Note:** detect where each overlay rule currently lives and restyle it **in place**. Do not relocate a rule
between stylesheets — the cascade order relative to `.panel`, `.results-panel`, and the navbar depends on it.

**Tasks:**

- [ ] 6.1 Restyle `.auth-overlay` — `position: fixed`, `inset: 0`, and `pointer-events: none` in the closed state
  all unchanged; repoint `z-index` to `var(--z-modal)` (= 999999).
      - **HARD GATE (I19):** the `opacity` transition duration remains exactly **250 ms**, because
        `home.js:1076` removes the node after a 250 ms timeout.
- [ ] 6.2 Restyle `.auth-modal` — `--surface-container-high` fill, `--radius-xl`, `--shadow-modal` (D4's
      elevation, replacing `--shadow-xl`), an `.auth-modal::before` amber/indigo aurora.
      - **HARD GATE (I19):** the `transform` transition remains exactly **250 ms**.
- [ ] 6.3 Restyle `.btn-close-modal` — preserve its absolute positioning at `z-index: 10` and its
      RTL-inverted side (`left: 16px; right: auto` when `d.dir === "rtl"`).
- [ ] 6.4 Restyle `.auth-header`, `.auth-form`, `.auth-input-group`, its `input` focus ring (radius from
      `--radius-inputs`), `.auth-error`, `.btn-login`.
      - **HARD GATE:** the modal's ids `#authOverlay`, `#closeAuthBtn`, `#authForm`, `#authUsername`,
        `#authPassword`, `#authError`, `#authSubmitBtn` are all created by `home.js` and are not touched by
        CSS — confirm the CSS restyle keeps them addressable and does not add a wrapper that breaks the
        `autocomplete` attributes.
- [ ] 6.5 Add `[data-perf="low"]` / `[data-perf="potato"]` overrides removing the overlay's `backdrop-filter:
      blur(12px)` (currently ungated) (I12).
      - **HARD GATE:** both tier blocks present for the overlay blur.
- [ ] 6.6 Restyle `.filter-dropdown-wrap`, `.filter-pill`, `.filter-value`, `.filter-option`, `.filter-dropdown-menu`,
  preserving the `.show`-on-**wrapper** open mechanism and the three-property closed state.
      - **HARD GATE:** `.show` must remain on the wrapper, not moved to the menu.
- [ ] 6.7 Restyle `.perf-dropdown-menu`, preserving its four-property closed state including `pointer-events`.
- [ ] 6.8 Restyle `.lang-dropdown-menu` and `.lang-option`, **keeping the CSS `:hover`-only open mechanism**. Do not
  add a `.show` path and do not start updating `#langBtn`'s `aria-expanded` (recorded pre-existing gap,
      out of scope).
- [ ] 6.9 Restyle `.ac-dropdown`, `.ac-list`, `.ac-item`, `.ac-item-left`, `.ac-icon`, `.ac-icon-dir`,
  `.ac-icon-file`, `.ac-info`, `.ac-name`, `.ac-path`, `.ac-highlight`, `.ac-footer`.
      - **EXCEPTION (D8/I21):** the `.ac-dropdown` as it renders **inside `.hero-max`** is FROZEN. The
        dropdown is created by `Autocomplete.bind()` into `#globalSearch`'s `.input-wrap`, which lives in the
        Hero, so any restyle must be constrained so the rendered-in-Hero appearance is unchanged. If a single
        rule cannot serve both contexts, the Hero-scoped case takes precedence and the change is dropped.
      - **HARD GATE:** `.ac-list { max-height: 280px; overflow-y: auto }` must be preserved, as must
        `.ac-dropdown`'s `.show` mechanism and `pointer-events: none` closed state. `.ac-dropdown` also
        depends on `.hero-max { overflow: visible !important }` and the `z-index: 1000 !important` chain —
        both untouched.
- [ ] 6.10 Restyle the `.ac-dropdown` z-index reference to `var(--z-autocomplete)` where the existing chain allows,
      without changing the **effective** ceiling of 1000 that the ancestor stacking contexts impose.
- [ ] 6.11 Restyle `.skeleton-box`, `.skeleton-line` and its variants, `.resource-card-skeleton`.
- [ ] 6.12 Restyle `.empty-box`, `.empty-circle`, `.empty-circle.err`, `.empty-text`, `.ac-empty`.
- [ ] 6.13 Restyle `.resources-error` (both the Home and Browse variants) and the Browse in-page 404 block.
- [ ] 6.14 Restyle `.locked-state`, `.locked-icon`, `.locked-title`, `.locked-desc` for both Home and Browse,
      preserving all three responsive size collapses.
- [ ] 6.15 Restyle `.perf-toast` — repoint `z-index` to `var(--z-toast)` (= 99999) and preserve both `[dir="rtl"]`
      transform-flip rules.
- [ ] 6.16 Do not unify the three different dropdown hidden-state mechanisms.
- [ ] 6.17 Do not add a focus trap, an `Escape` handler, focus restoration, or any other a11y improvement.
- [ ] 6.18 Add `[data-perf]` overrides (I12) and `[dir="rtl"]` mirrors (I13) for every new rule.

**Validation:**

- Grep assertion — `.auth-overlay` still `position: fixed`, `inset: 0`, `z-index` resolving to 999999, and
  `pointer-events: none` when closed.
- Grep assertion — the `.auth-overlay` `opacity` transition is **250 ms** and the `.auth-modal` `transform`
  transition is **250 ms**.
      - **HARD GATE (I19):** both durations equal the JS `setTimeout` of 250 ms in `home.js`.
- DOM assertion (HARD GATE): the modal is a child of `document.body`, **not** of `#app`. Trigger it, then
  confirm `document.querySelector('#authOverlay').parentElement === document.body`.
- Behavioral (HARD GATE): calling `showLoginModal` twice produces exactly one overlay (the
  `#authOverlay` idempotency guard).
- Behavioral: the close button closes; clicking the backdrop closes; a successful submit closes. No pop-out
  from a duration mismatch.
- Behavioral: a router navigation while the modal is open does not destroy it.
- Behavioral: failed login shows the message in `#authError`; the rate-limit case still disables both inputs
  (string-sniffing of "Too many" is a pre-existing brittle behavior — do not change it).
- Behavioral: `.filter-dropdown-wrap.show` opens the menu; the `.filter-value` label updates; outside click
  closes all.
- Behavioral: `.perf-dropdown-wrap.show` opens the performance menu; outside click closes it.
- Behavioral: hovering `#langBtn` opens the language menu; the active language keeps `.active`.
- Behavioral: the autocomplete dropdown opens on input, closes on outside click, `.ac-list` scrolls internally
  at 280 px, and `.ac-item.active` follows ↑/↓.
- Behavioral: skeletons, empty states, `.resources-error`, and `.locked-state` all render and clear correctly.
- Behavioral: `.perf-toast` shows and dismisses, and its RTL transform flips.
- CSS assertion — no `display: none` or `visibility: hidden` was introduced on any dropdown menu or on
  `.ac-list`.
- Perf: forcing `low` and `potato` removes the overlay blur and every dropdown blur.
- Content: no D3-banned string present.

**Completion condition:** all overlays and states restyled in place, 250 ms durations preserved, modal body
attachment preserved, and every existing open/close mechanism intact.

**Applicable Agent Skills:** `frontend-ui-engineering`, `constraint-driven-development`.

### Phase 6 — Final Report Template

```
## Phase 6 — Overlays & States: COMPLETE / BLOCKED

### Files changed
- (list with line counts)

### Overlays restyled (in place — no relocation)
- (list selector → file it stayed in)

### HARD GATE results
- I19 overlay opacity transition = 250ms: PASS / FAIL
- I19 modal transform transition = 250ms: PASS / FAIL
- I19 overlay appended to document.body (not #app): PASS / FAIL
- I12 low + potato overrides for overlay blur: PASS / FAIL
- .show remains on the WRAPPER for filter/perf: PASS / FAIL
- .lang remains :hover-only: PASS / FAIL
- .ac-list keeps max-height 280px + overflow-y auto: PASS / FAIL

### Preserved mechanisms confirmed
- #authOverlay idempotency guard: YES / NO
- close button / backdrop click / submit close: YES / NO
- modal survives router navigation: YES / NO
- #authError shows failures; rate-limit disables inputs: YES / NO
- filter dropdown open/close/label/outside-click: YES / NO
- perf dropdown open/outside-click: YES / NO
- lang dropdown hover + .active: YES / NO
- ac dropdown open/close/internal scroll/arrow nav: YES / NO
- perf-toast show/dismiss + RTL flip: YES / NO
- skeletons / empty / error / locked states: YES / NO

### Behavior deltas observed
- (list, or "none")

### Pre-existing defects
- (list any that became MORE likely to trigger, or "none")

### Risks / notes
- (list, or "none")
```

---

## Phase 7 — Performance, RTL, Responsive Parity

**Objective:** Guarantee that every effect introduced in Phases 2–6 has a `low`/`potato` override, every new
direction-sensitive rule has an `[dir="rtl"]` mirror, and all six responsive breakpoints plus the
`hover: none` and `prefers-reduced-motion` paths behave correctly.

**Prerequisites:** Phases 1–6 approved and their reports accepted.

**In-scope files:**

- `assets/css/performance-modes.css`
- `assets/css/components.css`, `assets/css/home.css`, `assets/css/browse.css`, `assets/css/base.css`
  (parity additions only)

**Out-of-scope files:** `tokens.css`, `index.html`, `browse.html`, all of `assets/js/**`, all of `lib/**`,
`template/new-home.html`, `server.js`, `package.json`, `nginx.conf`.

**Tasks:**

- [ ] 7.1 Enumerate every selector introduced or modified in Phases 2–6 that uses `backdrop-filter`, `blur`,
  `animation`, `transition`, `filter`, or `box-shadow`.
- [ ] 7.2 For each, add or verify a `[data-perf="low"]` and `[data-perf="potato"]` override in
  `performance-modes.css`.
      - **HARD GATE (I12):** every enumerated selector appears under **both** tier blocks.
- [ ] 7.3 Confirm `performance-modes.css` already forces `scroll-behavior: auto !important` for the low/potato tiers
  and that this still holds after the restyle.
- [ ] 7.4 Confirm `prefers-reduced-motion: reduce` still maps to `data-perf="low"` via the inline head script, and
  add a `prefers-reduced-motion` block for any new animation that has no tier override.
- [ ] 7.5 Enumerate every new direction-sensitive layout rule from Phases 2–6 — anything using `row` direction,
  physical side properties (`left`/`right`, `margin-left`/`margin-right`, `border-left`/`border-right`,
  `padding-left`/`padding-right`, `text-align: left/right`), `translateX`, or `float`.
- [ ] 7.6 For each, add or verify an `[dir="rtl"]` mirror.
      - **HARD GATE (I13):** every enumerated rule has a mirror, or is authored with logical properties
        (`margin-inline`, `padding-inline`, `border-inline-start`, `text-align: start`) so none is required.
- [ ] 7.7 Verify the `html[dir="rtl"] .crumb-sep svg { transform: scaleX(-1) }` breadcrumb chevron flip still
  renders.
      - **HARD GATE:** RTL mirrors the breadcrumb chevron.
- [ ] 7.8 Verify all six breakpoints render correctly: `min-width: 1440px`, `max-width: 1024px`,
  `max-width: 900px`, `max-width: 768px`, `max-width: 640px`, `max-width: 480px` — in the dark theme, the light
  theme, LTR, and RTL.
- [ ] 7.9 Confirm the `≤900px` `.nav-tabs { display: none }` rule and the absence of any hamburger/off-canvas
  replacement.
- [ ] 7.10 Confirm the `≤640px` nav-height override, the Browse 3-track row collapse with children 3/4/5 hidden,
  the `.thead` hiding, and the `.section-controls .view-toggle` hiding.
- [ ] 7.11 Confirm the `@media (hover: none)` block forcing `.f-actions` visible.
      - **HARD GATE (I20):** touch devices see the Download control without a hover gesture, and the control
        stays in the tab order.
- [ ] 7.12 Confirm `prefers-reduced-motion` guards exist for every new animation.
- [ ] 7.13 Confirm no new `window.*` global was introduced and no new per-render `document`/`window` listener was
  added (I14, I15).
      - **HARD GATE:** `git diff` over `assets/js/**` shows no `window.<name> =` addition and no new
        `document.addEventListener` inside a render function.
- [ ] 7.14 Re-assert every locked invariant that a global audit can check mechanically: I1, I2, I4, I6, I7, I9,
  I16, I17, I18.
- [ ] 7.15 Grep the whole repo for every D3-banned string and confirm zero occurrences in shipped files.
      - **HARD GATE:** `SOC 2`, `ISO/IEC 27001`, `HIPAA`, `Tier-1 Infrastructure Carrier`,
        `Cryptographically Verified Release Mirrors`, `v4.8`, `8 Packages`.
- [ ] 7.16 Record whether any of the 11 pre-existing defects became **more likely to trigger** as a result of the
  redesign. Record as a risk; do not fix.

**Validation:**

- Perf parity: the Phase 7.1 enumeration appears under both `[data-perf="low"]` and `[data-perf="potato"]`.
- **HARD GATE:** forcing `data-perf="low"` removes every new blur, animation, and heavy shadow — verified by
  inspecting computed styles.
- **HARD GATE:** forcing `data-perf="potato"` likewise.
- **HARD GATE:** RTL mirrors the breadcrumb chevron — verified visually in Persian.
- **HARD GATE (I20):** under `hover: none` (emulated), `.f-actions` is visible and its control is Tab-reachable.
- Grep assertion — no `window.<name> =` added; no new per-render `document`/`window` listener.
- Grep assertion — no forbidden technology: `cdn.tailwindcss`, `<canvas`, `webgl`, `getContext`,
  `requestAnimationFrame`, `ResizeObserver` anywhere in `assets/**` or `index.html`.
- Grep assertion — `lib/**` byte-identical: `git diff --name-only lib/` is empty.
- Grep assertion — `browse.html` byte-identical; `template/new-home.html` byte-identical.
- Grep assertion — no D3-banned string in any shipped file.
- Grep assertion — `.page`, `#app`, and `html` still have no `overflow` declaration.
- Responsive matrix: 6 breakpoints × 2 themes × 2 directions, all rendering correctly with no horizontal
  overflow and no content clipping.
- Focus-visible: every interactive element shows a visible focus indicator; `.f-actions` reveals on
  `:focus-within`.
- Hero responsive breakpoints (≤1024 stacking, ≤640 search-keys hiding) are byte-identical.
- **HARD GATE (D8/I21):** `.hero-max` innerHTML and computed styles remain byte-identical after all phases.
- Keyboard: full keyboard pass on navbar dropdowns, the hero search, autocomplete, Browse filters, the view
  toggle, row targets, and the auth modal (opening and closing only — no new handlers).

**Completion condition:** every effect tier-gated, every direction-sensitive rule mirrored, all six
breakpoints verified, and all greppable invariants re-asserted.

**Applicable Agent Skills:** `performance-optimization`, `code-review-and-quality`.

### Phase 7 — Final Report Template

```
## Phase 7 — Performance, RTL, Responsive Parity: COMPLETE / BLOCKED

### Files changed
- (list with line counts)

### Effect inventory (selector → tier override)
| Selector | Effect | low override | potato override |
|---|---|---|---|
| (rows) |

### Direction-sensitive rule inventory
| Rule | Mirror or logical-property rewrite |
|---|---|
| (rows) |

### HARD GATE results
- I12 every effect gated in low AND potato: PASS / FAIL
- I13 every direction-sensitive rule mirrored: PASS / FAIL
- I13 RTL mirrors breadcrumb chevron: PASS / FAIL
- I20 hover:none shows .f-actions + keeps tab order: PASS / FAIL
- I14/I15 no new window global, no new per-render listener: PASS / FAIL
- D3 banned strings absent: PASS / FAIL

### Invariant re-audit
| Invariant | Method | Result |
|---|---|---|
| I1 | (grep) | |
| I2 | (grep) | |
| I4 | (DOM) | |
| I6 | (grep) | |
| I7 | (grep) | |
| I9 | (git diff) | |
| I16 | (grep) | |
| I17 | (git diff) | |
| I18 | (git diff) | |

### Responsive matrix (6 breakpoints × 2 themes × 2 directions)
- (results table or per-breakpoint notes)

### Behavior deltas observed
- (list, or "none")

### Pre-existing defects made MORE likely to trigger
- (list, or "none — none became more likely")

### Risks / notes
- (list, or "none")
```

---

## Phase 8 — i18n Keys & Final Verification

**Objective:** Add any genuinely new user-visible strings to **both** dictionaries, then run the complete
C1–C12 behavioral regression checklist and produce the final change report.

**Prerequisites:** Phases 1–7 approved and their reports accepted.

**In-scope files:**

- `assets/js/i18n.js` — **additive keys only**
- `assets/css/**`, `assets/js/**`, `index.html` — **verification only, no edits** unless a Phase 1–7 defect is
  found, which must be reported rather than silently patched

**Out-of-scope files:** `router.js`, `services/resource-service.js`, `file-actions.js`, `theme.js`,
`autocomplete.js` (logic), `browse.html`, all of `lib/**`, `template/new-home.html`, `server.js`,
`package.json`, `nginx.conf`, `Doxyfile`, `data/**`.

**Tasks:**

- [ ] 8.1 Determine whether any genuinely new user-visible label was introduced in Phases 4 or 5. The expected
  answer is **none**, because the redesign adds no new copy.
- [ ] 8.2 For any new static label, add a `data-i18n` (or `data-i18n-ph` / `data-i18n-html`) attribute and add the
  key to **both** `i18n.en` and `i18n.fa` at mirrored positions (I11).
- [ ] 8.3 Do not delete, rename, or reword any existing key in either dictionary (I10).
- [ ] 8.4 Confirm the sorted key sets of `i18n.en` and `i18n.fa` are identical.
- [ ] 8.5 Confirm `dir` and `lang` remain the only intentionally-differing keys.
- [ ] 8.6 Do **not** fix the two hard-coded English sort options in `home.js:126` and `home.js:130` (recorded
  pre-existing defect).
- [ ] 8.7 Run the full C1–C12 behavioral regression checklist.
- [ ] 8.8 Confirm the self-hosted Vazirmatn activates for `[lang="fa"]` via the existing `base.css:39` rule.
- [ ] 8.9 Confirm a language switch calls `Router.refresh()`, re-renders the current route, and rebuilds all
  dynamic text from the new dictionary.
- [ ] 8.10 Confirm both themes render correctly in both directions after the language switch.
- [ ] 8.11 Re-assert every hard gate one final time.
- [ ] 8.12 Produce the final change report and list every file changed across all eight phases.

**Validation — full C1–C12 regression checklist:**

| # | Contract | Check |
|---|---|---|
| C1 | Router link interception | Directories SPA-navigate via `pushState` with no reload; files bypass the router and download; external links, `_blank`, `#`, and `mailto:` all still skipped; unknown routes still redirect to `/404.html` |
| C2 | Row cell order | 6 children, correct order, for both file and directory rows; `nth-child(3\|4\|5)` rules still target the right cells; both grid templates still end in the 26 px track |
| C3 | Three independent targets | Icon and name resolve to identical hrefs; no nesting; activating one never triggers another; rows are not clickable; icon and name have distinguishable accessible names |
| C4 | Download marker | `data-file="true"` on every file icon link, name link, and action link; absent on directory targets; the extension regex is unchanged |
| C5 | URL construction | No literal `/api/download/` or `/browse/` assembly added anywhere; no new `ResourceService` method |
| C6 | `#app` mount | `#app` exists, is the router's only mount, keeps no `overflow`; `.nav` and `.footer` remain siblings |
| C7 | Sticky navbar | `.nav` sticky at `top: 12px`, `z-index` 50, visible throughout a long scroll; `.page`/`#app` have no `overflow`; `body { overflow-x: hidden }` intact |
| C8 | i18n application | Both `data-i18n*` and `getDict()` paths produce correct text; `dir`/`lang` set on `<html>`; RTL mirroring correct |
| C9 | Dropdown visibility | `.show` on the wrapper for filter and perf; `:hover` only for lang; `.ac-dropdown` `.show`; closed menus inert without `display: none` |
| C10 | Modal lifecycle | Single overlay under repeated calls; 250 ms close matches the CSS transition; survives route change; `window.triggerAuthModal` resolves; all three call sites work |
| C11 | Performance tiers | `data-perf` low/potato remove every heavy effect; `prefers-reduced-motion` maps to `low`; `cav_perf_tier` cache still round-trips |
| C12 | Listener lifetime | No new per-render `document`/`window` listener; no new `window.*` global; all three call sites of `HomePage.showLoginModal` still work |

Additional final checks:

- Grep assertion — sorted key sets of `i18n.en` and `i18n.fa` are identical.
- Behavioral (HARD GATE): language switch rebuilds all dynamic text — trigger a search, switch language,
  confirm the results panel, dropdown labels, badges, and breadcrumbs are all in Persian.
- Behavioral: browser back/forward still re-renders the correct route without a full reload.
- Behavioral: `localStorage` keys still round-trip — `ui_lang`, `cav_theme`, `cav_perf_tier`, `view_mode`,
  `cav_resources_cache`.
- Behavioral: the idle timer still logs out after 30 minutes of authenticated inactivity.
- Grep assertion — no D3-banned string anywhere in shipped files.
- Grep assertion — `lib/**`, `router.js`, `resource-service.js`, `file-actions.js`, `theme.js`,
  `autocomplete.js`, `browse.html`, and `template/new-home.html` are all byte-identical to their pre-change
  state, except `i18n.js` additive keys only.

**Completion condition:** both dictionaries verified parallel, the full C1–C12 checklist passing, every hard
gate re-asserted, and the final change report produced.

**Applicable Agent Skills:** `code-review-and-quality`, `constraint-driven-development`.

### Phase 8 — Final Report Template

```
## Phase 8 — i18n Keys & Final Verification: COMPLETE / BLOCKED

### Files changed (this phase)
- (list, or "none — no new keys required")

### New i18n keys
- (list key → en → fa, or "none")

### Dictionary integrity
- sorted key sets of i18n.en and i18n.fa identical: YES / NO
- only dir/lang differ intentionally: YES / NO
- existing keys unchanged: YES / NO

### C1–C12 regression checklist
| # | Contract | Result | Evidence |
|---|---|---|---|
| C1 | | PASS / FAIL | |
| C2 | | PASS / FAIL | |
| C3 | | PASS / FAIL | |
| C4 | | PASS / FAIL | |
| C5 | | PASS / FAIL | |
| C6 | | PASS / FAIL | |
| C7 | | PASS / FAIL | |
| C8 | | PASS / FAIL | |
| C9 | | PASS / FAIL | |
| C10 | | PASS / FAIL | |
| C11 | | PASS / FAIL | |
| C12 | | PASS / FAIL | |

### HARD GATE re-assertion
- (each gate + PASS / FAIL)

### Language switch
- rebuilds all dynamic text: YES / NO
- Vazirmatn active for lang="fa": YES / NO
- both themes correct after switch: YES / NO

### Persistence
- ui_lang / cav_theme / cav_perf_tier / view_mode / cav_resources_cache round-trip: YES / NO
- idle timer still logs out: YES / NO

### Full change footprint (all 8 phases)
- (complete file list with line counts)

### Behavior deltas vs. pre-change baseline
- (list, or "none — 100% behavior preserved")

### Pre-existing defects
- unchanged: (confirm all 11 still present and unmodified)
- made MORE likely to trigger: (list, or "none")

### Risks / notes
- (list, or "none")

### OpenSpec compliance
- openspec validate enterprise-ui-redesign --strict: PASS / FAIL + output
- every requirement satisfied: YES / NO
- every scenario verified: YES / NO
```