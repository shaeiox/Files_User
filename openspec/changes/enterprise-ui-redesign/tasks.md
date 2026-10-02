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

- [x] 1.1 Confirm the four current token blocks in `assets/css/tokens.css` and record their exact declaration
  order. Do not restructure the file; only replace and append declarations.
- [x] 1.2 **ACCEPTED DEVIATION D-1 (maintainer-approved 2026-10-02 — see Phase 1 report).** Declare the complete D4 palette in `:root`, verbatim, per `design.md` §2.2. Group order: core
  surfaces, foreground, outlines, primary (Cyber Amber), secondary (Electric Indigo), tertiary (Cyan
  Stream), error, glows.
- [x] 1.3 **ACCEPTED DEVIATION D-2/D-3 (maintainer-approved 2026-10-02 — see Phase 1 report).** Declare the nine-token typography scale, six-token radius scale, ten-token spacing scale, and
  nine-token z-index scale from D6 in `:root`. `--radius-DEFAULT` is required verbatim.
- [x] 1.4 Declare `--nav-h` in `:root` at the current desktop value, and add its mobile override inside the
  existing `@media (max-width: 640px)` block at the current mobile value. Add **no** `calc()` consumer
  anywhere in this phase.
- [x] 1.5 **ACCEPTED DEVIATION D-1/D-4 (maintainer-approved 2026-10-02 — see Phase 1 report).** Convert every legacy token name listed in `design.md` §2.4 into an alias resolving to exactly one D4
  token. Do not delete any legacy name that has a live consumer. Mark `--s1`…`--s24`, `--r1`…`--r-full`,
  `--radius`, `--a-1`…`--a-8`, unused `--n-*`, unused `--color-*`, `--warning`, `--ease-out`, `--dur-1`…`--dur-3`,
  unused `--text-*` size tokens, and `--hero-grad` as deprecated with a comment; do not remove them.
- [x] 1.6 **ACCEPTED DEVIATION D-7 (maintainer-approved 2026-10-02 — see Phase 1 report).** Resolve the `--background` name collision: D4's `--background: #121316` wins over the dead shadcn
  HSL-triplet of the same name. Drop or rename the shadcn triplet block; confirm no rule wraps any shadcn
  token in `hsl()`.
- [x] 1.7 ~~Repoint the `--hero-grad` token~~ **CANCELLED by D8/I21.** `--hero-grad` is consumed only by the
  frozen `.hero-max`, so it must keep its current value in both theme blocks. Verified by task 1.13.
- [x] 1.8 **ACCEPTED DEVIATION D-5/D-6 (maintainer-approved 2026-10-02 — see Phase 1 report).** Rewrite the `[data-theme="light"]` block so it declares exactly the same token names as
  `[data-theme="dark"]`, applying D4's derivation rule and sourcing any unpinned value from the
  already-present light-theme declarations per OQ-1. Keep `--primary-container: #ffb800` in both themes.
      - **HARD GATE:** the light block and the dark block must have identical token-name sets.
- [x] 1.9 Add the nine `@font-face` declarations for Inter, JetBrains Mono, and Vazirmatn at weights 400/500/600,
  each with `font-display: swap`, sourcing from `/assets/fonts/*.woff2`. Confirm every path satisfies the CSP
  `font-src 'self' data:` directive.
- [x] 1.10 Repoint `--font`, `--font-display`, `--font-hero`, `--font-fa`, `--mono` to the self-hosted families
  per `design.md` §3.3.
- [x] 1.11 Remove the three Google Fonts `<link>` tags from `index.html` (two `preconnect` and the `css2`
  stylesheet). Change nothing else in `index.html` — not the six stylesheet links, not the icon link, not the
  inline pre-paint theme/perf script, not `<main id="app">`, not the script load order.
- [x] 1.12 Do **not** touch `browse.html` even though it carries the same Google Fonts tags (I18).
- [x] 1.13 **Hero token insulation audit.** Grep `home.css` for all token references inside `.hero-max` and
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
## Phase 1 — Design Tokens + Fonts: COMPLETE WITH RECORDED DEVIATIONS

Retroactive verification report — the phase shipped in commit 9db6c0b without a contemporaneous report;
this report verifies the shipped state (HEAD) against the task letters on 2026-10-02. Verification basis:
detached worktree at HEAD; baseline 8ef9e2b for pre-change values.

**ACCEPTED:** deviations D-1…D-7 (and the D-8…D-20 family recorded in Phases 2–6) were reviewed and
accepted by the maintainer on 2026-10-02. The D4-name/alias-bridge structure is formally abandoned in
favour of the shipped inline-value reality; the four missing scale tokens and the deprecation comments
are waived; the light/dark name-set difference and the absent `--primary-container` name are accepted.

### Files changed (this phase's scope, from `git diff 8ef9e2b..9db6c0b --stat`)
- `assets/css/tokens.css` (+312/- lines within the commit's 312 changed lines)
- `index.html` — font-link hunk only (the commit's second index.html hunk is Phase 5's footer)
- `assets/fonts/` — 9 new `.woff2` files
- (commit also carried Phases 2–5 files and an out-of-scope `data/users.json` touch — see Phase 8 notes)

### Tokens
- D4 tokens declared under D4 names: **0 / ~60** — DEVIATION D-1. D4 *values* were inlined directly onto
  the legacy semantic names (dark: `--bg:#121316`, `--bg-card:#1b1b1f`, `--bg-hover:#292a2d`,
  `--bg-input:#1f1f23`, `--bg-elevated:#343538`, `--bg-sunken:#0d0e11`, `--text:#e3e2e6`,
  `--text-2:#d5c4ab`, `--text-3:#9e8f78`, `--text-4:#514532`, `--text-accent:#ffdca1`,
  `--text-on-accent:#412d00`, `--border:rgba(255,255,255,.07)` = the `--border-hairline` derive).
  The §2.4 name-level alias bridge (legacy → `var(--d4-name)`) was not built; the rendered outcome is the
  D4 palette, but the structural requirement (D4 names declared in `:root` + both theme blocks) is unmet.
- Scales: typography 9/9 ✓; z-index 9/9 ✓; radius 4/6 — DEVIATION D-2 (`--radius-DEFAULT` and
  `--radius-full` missing; `--radius-DEFAULT` was "required verbatim"); spacing 7/10 — DEVIATION D-3
  (`--margin`, `--margin-desktop` missing).
- `--nav-h: 56px` declared in `:root` ✓; mobile handled via a second token `--nav-h-mobile: 52px` consumed
  by the existing ≤640px block — mechanism deviation from the letter ("override inside the media block"),
  functionally equivalent. No `calc()` consumer of `--nav-h` anywhere ✓.
- Legacy aliases converted: 0 as `var()` aliases — DEVIATION D-1 (values inlined instead).
- Deprecations marked: **0** — DEVIATION D-4. `--s1…--s24`, `--r1…`, `--a-1…--a-8`, `--warning`,
  `--ease-out`, `--dur-*`, legacy `--text-*` and the shadcn triplets carry no deprecation comments.
- Light/dark token-name sets identical: **NO** — DEVIATION D-5. light=74 names, dark=66; light-only:
  `--a-1…--a-8` (oklch accent ramp redeclared in light only). Script evidence below.
- `--primary-container: #ffb800` in both themes: **NOT MET** — DEVIATION D-6. The name
  `--primary-container` is declared nowhere; `--border-focus: #ffb800` carries the value in both themes.
- `--background` collision: **NOT resolved** — DEVIATION D-7. Dark block still declares the shadcn triplet
  `--background: 220 3% 20%`. Verified harmless: zero `hsl(var(` consumers across all six stylesheets.
- OQ-1 resolution used: as specified — unpinned light values sourced from the already-present light
  declarations (oklch ramp); no new hex introduced in the light block.
- Hero insulation (1.13): PRESENT and correct — `home.css:2133` re-declares `--radius-panels: 20px`,
  `--color-ember-pulse: #ff8964`, `--color-electric-iris: #5683da` inside a `.hero-max` scope (plus a
  `[data-theme="dark"]` repetition at :2149), pinning exactly the pre-change literals from 8ef9e2b.
  `--hero-grad` byte-identical to baseline in both themes (1.7 cancellation verified).
- OQ-2 risk CONFIRMED realised: dark `--text-4` shipped as `#514532` (D4 `--outline-variant`), the
  low-contrast muted tone flagged in OQ-2 — this is the 1.84:1 AA failure later measured by
  `a11y-ux-debt` (its Phase 2 remediates).

### Fonts
- woff2 files added: 9 / 9 ✓ (Inter/JetBrainsMono/Vazirmatn × Regular/Medium/SemiBold)
- @font-face declarations: 9, all in `tokens.css` (first-loaded) ✓
- All font-display: swap: YES ✓
- Filenames deviate from design §3.1 (`Inter-Regular.woff2` vs `inter-400.woff2`) — cosmetic only.
- Token re-points: `--font`, `--font-display`, `--font-fa`, `--mono` ✓. `--font-hero` NOT repointed —
  recorded deviation, justified: the Hero headline is frozen (D8/I21) and task 1.13's hard gate requires
  byte-identical Hero computed styles; repointing would have violated both. tokens.css:159-162 documents
  the decision. (design.md §3.3 still says "Inter" — an artifact inconsistency to reconcile at archive.)
- Google Fonts links removed from index.html: YES ✓ (diff hunk removes exactly the 3 link lines)
- browse.html untouched: YES ✓ (absent from the implementation diff)

### HARD GATE results
- Light/dark structural parallel: **FAIL** (DEVIATION D-5: 8 light-only `--a-*` names)
- I1 sticky navbar intact: PASS (`.nav` = `position: sticky; top: 12px; z-index: var(--z-sticky)`;
  `--z-sticky: 50` reproduces 50 exactly)
- I2 no overflow on .page / #app: PASS (`body { overflow-x: hidden }` at base.css:30; the only
  `overflow: hidden` added is on `.aura-backdrop`; no overflow on `.page`, `#app`, or `html`)
- 1.13 Hero hard gate: PASS by construction (scoped pins reproduce pre-change literals; `--hero-grad`
  unchanged; Hero markup untouched — home.js Hero hunk absent from the diff)

### Validation evidence
- git diff --stat: tokens.css 312 lines, 9 font binaries new, index.html font-link hunk = 4 deletions;
  no other Phase-1-scope file touched. `base.css`/`home.css`/`components.css` changes in the same commit
  belong to Phases 2–4.
- Token-set equality: `node token-sets.js tokens.css` → light 74 / dark 66, only-in-light =
  `--a-1..--a-8`, only-in-dark = [] (FAILS the 1.8 hard gate by 8 names).
- `hsl(var(` consumers across `assets/css/*.css`: 0 ✓
- `calc(...nav-h` consumers: 0 ✓
- Pre-change baseline check: `--color-electric-iris #5683da→#c3c0ff`, `--color-ember-pulse
  #ff8964→#ffb800`, `--radius-panels 20px→0.5rem` — all three Hero feeds changed, all three pinned under
  `.hero-max` ✓

### Behavior deltas observed
- None intended. Ambient consumers of changed tokens re-themed as designed (backdrop blooms now derive
  from `#ffb800`/`#c3c0ff` at base.css via color-mix — a deliberate Phase 2 effect, not a Phase 1 delta).

### Pre-existing defects
- None made more likely. (The dark `--text-4` AA failure is a *new* condition introduced by D-1's inline
  of `--outline-variant`, tracked by `a11y-ux-debt` Phase 2.)

### Risks / notes
- DEVIATIONS D-1…D-7 recorded above await maintainer acceptance or remediation. Accepting D-1 means the
  D4 token names never exist; future work must reference the legacy names. D-5/D-6 mean the structural
  parallelism contract is formally open even though both themes render.
- `data/users.json` touched by the implementation commit — outside every phase's in-scope list; flagged
  for the Phase 8 final report.
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

- [x] 2.1 Restyle `.aura-backdrop` in `base.css:95-101` — preserve its resolved `position: fixed`, viewport
  coverage, `overflow: hidden`, `pointer-events: none`, and `z-index: 0`.
- [x] 2.2 Restyle `.aura-base`, `.aura-glow-1`, `.aura-glow-2` in `base.css:103-133` using the D4 surface ramp
  plus two offset radial-gradient orbs tinted by `--glow-amber` and `--glow-indigo`. Use
  `--surface-container-lowest` for the deepest tone.
- [x] 2.3 Preserve the `home.css:1385-1392` override block exactly in effect: `position: fixed`, viewport
  coverage, `pointer-events: none`, `z-index: -1`. Do **not** raise it above `--z-base`; `.page` at
  `z-index: 1` is what separates the backdrop from content.
- [x] 2.4 Leave `.aura-vignette` and its `display: none` rule untouched (no matching element exists; adding one
  would be markup scope creep).
- [x] 2.5 Add the peripheral vignette as part of the `.aura-base` wash using D4 tokens only.
- [x] 2.6 Add an optional `backdrop-filter` to `.aura-base` for the frosted-glass read.
- [x] 2.7 Add `[data-perf="low"]` and `[data-perf="potato"]` overrides in `performance-modes.css` that collapse
  the orbs to a single static gradient and remove `backdrop-filter` entirely (I12).
      - **HARD GATE:** every backdrop rule using `backdrop-filter`, `blur`, `filter`, or `animation` has a
        matching override in **both** tier blocks.
- [x] 2.8 Add a `prefers-reduced-motion: reduce` guard for any backdrop animation.
- [x] 2.9 Confirm no JavaScript was added or changed. **No WebGL, no `requestAnimationFrame`, no
  `ResizeObserver`, no `mousemove` listener, no `<canvas>` element** (D5).
- [x] 2.10 Confirm no `overflow` value was added to `.page`, `#app`, or `html` (I2).

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
## Phase 2 — Backdrop & Shell Base: COMPLETE WITH RECORDED DEVIATIONS

Retroactive verification report — shipped in commit 9db6c0b; verified against HEAD on 2026-10-02
(worktree at HEAD; baseline 8ef9e2b).

### Files changed (this phase's scope)
- `assets/css/base.css` (+130/- lines in the implementation commit — backdrop block at :104-200)
- `assets/css/home.css` (the `.aura-backdrop` override retained; Hero-scoped pins are Phase 1's)
- `assets/css/performance-modes.css` (backdrop tier rules at :109-126 low / :246-254 potato,
  plus `[data-perf="medium"]` backdrop rules at :32-53)

### Layers restyled
- `.aura-base`: wash + peripheral vignette in one rule — radial-gradient(ellipse 120% 95% at 50% 45%,
  transparent → `var(--bg)`), giving depth with no extra element (2.5 satisfied in the same declaration).
- `.aura-glow-1`: amber orb top-right (80vw circle, `filter: blur(80px)`, opacity .6), tinted
  `color-mix(--color-ember-pulse)` with a literal `rgba(255,184,0,*)` fallback declared first.
- `.aura-glow-2`: indigo orb bottom-left (70vw circle, `filter: blur(100px)`, opacity .4), tinted
  `color-mix(--color-electric-iris)` with literal `rgba(195,192,255,*)` fallback.
- `.aura-backdrop` stacking resolved to: `position: fixed; inset: 0` (base) with the home.css override
  (`top/left/right: 0`) preserved verbatim → resolved z-index **-1**, `pointer-events: none`,
  `overflow: hidden` (from base). `.page` at z-index 1 keeps it behind content.
- DEVIATION D-8 (token names, governed by D-1): the tints come from `--color-ember-pulse` /
  `--color-electric-iris` and the deepest tone is `var(--bg)`, because the D4 names `--glow-amber`,
  `--glow-indigo`, and `--surface-container-lowest` do not exist in the shipped tokens. The D4 hues are
  the ones used (#ffb800 amber / #c3c0ff indigo), so the visual intent of 2.2 is met.

### Technology compliance
- Zero canvas/webgl/rAF/ResizeObserver/mousemove: YES — grep over all three stylesheets: 0 hits each.
- Zero new JavaScript: YES — backdrop is pure CSS, fully static (no animation declared → the 2.8
  reduced-motion guard is vacuous; the header comment documents "no shader, no animation, no script").

### HARD GATE results
- I2 no overflow added to .page / #app / html: PASS (only `.aura-backdrop` gained `overflow: hidden`)
- I1 backdrop never intercepts clicks: PASS (`pointer-events: none` on `.aura-backdrop` and both orbs)
- I12 perf override for every new effect: PASS — `[data-perf="low"]`: orbs `display: none`,
  `.aura-base` flat `var(--bg)` + `filter: none !important`; `[data-perf="potato"]`: `.aura-backdrop`
  and orbs `display: none !important`, global `backdrop-filter: none !important`, animation kill.
  No `backdrop-filter` is used by any backdrop rule, so its removal is vacuously satisfied.
- D8/I21 hero-visual gate: PASS **via the I21 Phase-9 exception** — `.hero-visual`'s only changes are
  layout declarations (`position`/`right`/`top`/`order`) inside ≤1024px/≤640px media queries, exactly
  the human-approved exception recorded in I21. `.hero-bg`, `.logo-shader`, and the Hero pinning block
  are untouched (both pre-date the redesign; verified absent from the home.js/home.css Hero diffs).
  Hero markup in `home.js`: untouched (zero changed lines in `renderHeroSection`).

### Validation evidence
- forbidden-technology grep: `canvas|webgl|requestAnimationFrame|ResizeObserver|mousemove|getContext`
  → base.css 0, home.css 0, performance-modes.css 0.
- perf-tier override grep: low tier at performance-modes.css:109-126 names `.aura-glow-1/2`, `.aura-base`,
  `.aura-backdrop`; potato tier at :246-254 names `.aura-glow-1/2`, `.aura-backdrop` (+ global kill).
- `.aura-backdrop` pointer-events: none present in both base.css and home.css ✓; resolved z-index -1 ✓.
- `.aura-vignette { display: none }` retained unchanged (base.css:168-171) ✓ (2.4).

### Behavior deltas observed
- Light theme: glows reduced to faint tints (opacity .08/.05) — deliberate, documented in base.css:193.

### Pre-existing defects
- None made more likely.

### Risks / notes
- D-8 recorded (token-name substitutions under D-1). No functional risk: fallbacks for engines without
  `color-mix` are declared first, so older engines still render the orbs.
- The home.css override keeps only `top/left/right` (no `bottom`), but base.css's `inset: 0` supplies
  `bottom: 0` through the cascade, so viewport coverage is complete.
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

- [x] 3.1 Restyle `.nav` (`components.css:9-14`) — **`position: sticky` and `top: 12px` are unchanged**; replace
  `z-index: 50` with `var(--z-sticky)`, which reproduces 50 exactly.
      - **HARD GATE (I1):** `.nav` must still be `position: sticky` with `top: 12px`; never `fixed`, never
        `absolute`.
- [x] 3.2 Restyle `.nav-bar` (`components.css:16-29`) — keep `display: flex`, the three-region
  `justify-content: space-between` layout, and `backdrop-filter: blur(16px)`; repoint `height` to
  `var(--nav-h)`; repoint `background` to the D4 navbar surface; repoint `border` to `--border-hairline`;
  add the D4 amber hover border using `--border-active`.
- [x] 3.3 Preserve the `.nav-bar` height override inside the existing `@media (max-width: 640px)` block, now
  driven by `--nav-h`'s mobile value.
- [x] 3.4 Restyle `.nav-logo`, `.nav-logo img`, `.nav-logo-text strong`, `.nav-logo-text span` — glass tile,
  amber hairline, `--glow-amber` on the brand mark. Image `src` stays `/assets/icon/logo.webp` (remote
  Stitch images are CSP-blocked and D3-forbidden).
- [x] 3.5 Restyle `.nav-tabs` and `.nav-tab` — keep `.nav-tabs` `position: absolute; left: 50%;
  transform: translateX(-50%)` (it depends on `.nav` being a positioned ancestor for stickiness). Keep the
  three existing tabs with their real hrefs and `aria-current="page"`. **Do not add the Stitch's five
  workspace tabs** — they have no destination and would fabricate navigation (D3).
- [x] 3.6 Preserve `.nav-tabs { display: none }` inside the existing `@media (max-width: 900px)` block exactly as
  written. This is existing verified behavior, not chrome.
- [x] 3.7 Restyle `.nav-actions`, `.perf-pill`, `.perf-option`, `.perf-indicator-dot`, `.perf-dropdown-menu` —
  keep `.show` on the **wrapper** as the open mechanism and keep the four-property hidden state
  (`opacity` + `visibility` + `transform` + `pointer-events`). Keep `data-perf-val` values
  (`AUTO`/`HIGH`/`MEDIUM`/`LOW`/`POTATO`).
- [x] 3.8 Restyle `.lang-dropdown-wrap`, `.lang-pill`, `.lang-dropdown-menu`, `.lang-option` — **keep the
  CSS `:hover`-only open mechanism**. Do not add a `.show` path and do not start updating `aria-expanded`;
  that recorded pre-existing gap is out of scope (authoring rule 7).
- [x] 3.9 Restyle `#themeBtn`, `.icon-sun`, `.icon-moon` — the two stacked SVGs are clipped by the button's
  `overflow: hidden`, which must be preserved.
- [x] 3.10 Add `[data-perf="low"]` and `[data-perf="potato"]` overrides for every new navbar effect (I12).
- [x] 3.11 Add `[dir="rtl"]` mirrors for every new direction-sensitive navbar rule (I13). Prefer logical
  properties where an existing physical-property rule is not being rewritten.
- [x] 3.12 If any `index.html` class addition is strictly required, document each one individually in the phase
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
## Phase 3 — Navbar Redesign: COMPLETE WITH RECORDED DEVIATIONS

Retroactive verification report — shipped in commit 9db6c0b; verified against HEAD on 2026-10-02
(worktree at HEAD; baseline 8ef9e2b).

### Files changed (this phase's scope)
- `assets/css/components.css` — navbar block (:9-148), lang/perf/theme sections, 900px/640px blocks
- `assets/css/tokens.css` — `--nav-h` / `--nav-h-mobile` consumption only
- `assets/css/performance-modes.css` — `.perf-pill` / `.perf-dropdown-menu` base rules (:339-450) and
  low/potato navbar overrides
- `index.html` — no navbar hunk (see below)

### index.html class additions (if any)
- None. The implementation diff for index.html contains only the Phase 1 font-link removal and the
  Phase 5 footer. The navbar markup is byte-identical to baseline.

### Restyled selectors
- `.nav` (animation added), `.nav-bar` (glass surface, hairline border, layered shadow, blur,
  `--nav-h`, logical padding), `.nav-logo*`, `.nav-tabs`, `.nav-tab` (+`.active`/`[aria-current]`),
  `.nav-actions`, `.perf-pill`, `.perf-option`, `.perf-indicator-dot`, `.perf-dropdown-menu`,
  `.lang-dropdown-wrap`, `.lang-pill`, `.lang-dropdown-menu`, `.lang-option`, `#themeBtn` (`.theme-btn`,
  `.icon-sun`, `.icon-moon`), light-theme hover overrides.

### HARD GATE results
- I1 .nav position sticky / top 12px / z-index 50: PASS — `position: sticky; top: 12px;
  z-index: var(--z-sticky)`; `--z-sticky: 50` reproduces 50; no `fixed`/`absolute` in the rule.
- I2 NEGATIVE: no overflow added to .page / #app: PASS (verified Phase 2; unchanged here).
- I12 perf override for every new navbar effect: PASS — `[data-perf="low"]` kills `.nav-bar` and both
  dropdown `backdrop-filter`s and flattens fills/shadows (:82-101); `[data-perf="potato"]` flat
  `.nav-bar` fill (:241) + global filter/animation/shadow kills.
- I13 RTL mirror for every new direction-sensitive rule: PASS — `.nav-bar` padding is logical
  (`padding-inline-*`); `.lang-dropdown-menu` uses `inset-inline-*`; `.perf-dropdown-menu` has an
  explicit `[dir="rtl"]` flip (performance-modes.css:413); 11 logical-property/RTL constructs in
  components.css.

### Preserved mechanisms (confirm unchanged)
- .perf dropdown opens via .show on wrapper: YES — `.perf-dropdown-wrap.show .perf-dropdown-menu`;
  hidden state keeps all four properties (opacity + visibility + transform + pointer-events).
- .lang dropdown opens via :hover only: YES — single `:hover` path at components.css:351; I8 freeze
  comment intact; zero `langBtn`/`focusin` references in HEAD i18n.js.
- .themeBtn clipped via overflow: hidden: YES — `.theme-btn { overflow: hidden }` at :249.
- ≤900px .nav-tabs display: none: YES — components.css:1061-1065.
- ≤640px nav height override: YES — `.nav-bar { height: var(--nav-h-mobile) }` at :1067-1070.
- --nav-h now consumed by .nav-bar: YES — components.css:24; only consumer, no `calc()`.

### Validation evidence
- sticky-rule grep: `.nav { position: sticky; top: 12px; z-index: var(--z-sticky); ... }` at
  components.css:12-17; `--z-sticky: 50` at tokens.css:186.
- id/data-* survival grep: no navbar hunk in the index.html diff — every id (`#themeBtn`, `#langBtn`,
  `#currentLangLabel`), class hook, `data-i18n` key, `data-link`, and all five `data-perf-val` values
  survive byte-identical; `aria-current="page"` still on the Downloads tab; three real tab hrefs; no
  Stitch workspace tabs added (D3).
- `theme.js` / `home.js` untouched by any navbar-related hunk; `i18n.js` language-switch logic intact.

### Behavior deltas observed
- DEVIATION D-9: the `.nav-bar` hover border resolves to neutral `--border-hover`
  (rgba(255,255,255,.12)), not the D4 amber `--border-active` named in 3.2.
- DEVIATION D-10: 3.4's named effects (glass tile, amber hairline, `--glow-amber` on the brand mark)
  were not implemented; the logo shipped with a restrained token-typography treatment instead
  (mono subtitle, tracking). Image `src` unchanged; no CSP/D3 issue.

### Pre-existing defects
- None made more likely. (The hover-only lang menu, hardcoded `aria-expanded="false"`, and hardcoded
  `aria-current` remained as-is at HEAD per scope — later remediated by `a11y-ux-debt` Phase 1.)

### Risks / notes
- D-9/D-10 recorded for maintainer acceptance; both are visual-treatment deltas, not contract breaks.
- The `.nav-tabs` absolute centering depends on `.nav` being positioned (sticky) — noted in
  components.css:90-92 and load-bearing for I1.
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

- [x] 4.1 **Hero freeze verification.** Before any Home page CSS or JS change, run a visual snapshot / DOM
  hash of `.hero-max`. After all Phase 4 changes, verify the Hero DOM and computed styles are byte-identical.
  If any drift is detected, revert the offending change. Additionally confirm byte-identical preservation of
  `.hero-max { overflow: visible !important }` (`components.css:626`) and of the `.hero-search` /
  `.input-wrap` `z-index: 1000 !important` stacking chain, both of which the autocomplete dropdown depends on.
  - **HARD GATE:** `.hero-max` innerHTML and computed styles are byte-identical before and after Phase 4.
  - **HARD GATE:** `#globalSearch` still has a `.input-wrap` ancestor (autocomplete contract).
  - **HARD GATE:** `#logoSwap` wipe animation still functions (700 ms `.wiping` class).
- [x] 4.2 Restyle `.resources-section`, `.section-head`, `.section-head-left`, `.section-icon`, `.section-title`,
  `.section-sub`, `.section-controls`.
- [x] 4.3 Restyle `.resource-card` with the Stitch card chrome — `--radius-lg`, `--surface-container-low` fill,
  `--border-hairline`, amber border plus `--glow-amber` on hover, `--inset-highlight` top edge, hover
  translate. Keep `.resource-card:hover` transform behavior coherent with the existing rules.
- [x] 4.4 Restyle `.resource-icon`, `.resource-meta`, `.resource-bottom`, `.resource-arrow`, `.status-live`,
  `.status-error`, `.dot`, `.dot-error`, `.badge`, `.badge-error`, `.badge-new`, `.stat-empty`.
- [x] 4.5 Preserve `id="resourcesGrid"` on the grid — `home.js` reads it at four call sites — and the `.stagger`
  class.
- [x] 4.6 **SUPERSEDED by D10 — the area was deleted in Phase 5, not restyled; deletion verified at HEAD.** Restyle `.bottom-grid`, `.panel`, `.panel-head`, `.panel-head-left`, `.panel-icon`, `.panel-title`,
  `.panel-sub`, `.panel-head-controls`, `.panel-link`.
      - **HARD GATE:** `#viewAllReleases` is given `display: inline-flex` by JS in two places; the restyled
        `.panel-link` must remain `inline-flex` so the JS-set value still matches the class's layout.
- [x] 4.7 **SUPERSEDED by D10 — the area was deleted in Phase 5, not restyled; deletion verified at HEAD.** Restyle `.releases-table` and its cells. **Preserve** the `≤768px` rules that hide `nth-child(3)` and
      `nth-child(5)` — the table's hard-coded `colspan="6"` in `home.js` is coupled to exactly those
      ordinals, and the column count must not change.
- [x] 4.8 **SUPERSEDED by D10 — the area was deleted in Phase 5, not restyled; deletion verified at HEAD.** Restyle `.type-cell`, `.version-cell`, `.version-name`, `.download-btn`, `.row-actions`,
  `.quick-list`, `.quick-item`, `.quick-icon`, `.quick-meta`, `.quick-meta-title`, `.quick-meta-sub`,
  `.quick-arrow`.
- [x] 4.9 Restyle `.results-panel`, `.results-bar`, `.results-bar-title`, `.results-bar-meta`, `.results-body`,
  `.res-row`, `.res-info`, `.res-path`.
      - **HARD GATE:** `.results-body { max-height: 360px; overflow-y: auto }` must be preserved — it is one of
        only three nested scroll containers in the application.
- [x] 4.10 **SUPERSEDED by D10 — the area was deleted in Phase 5, not restyled; deletion verified at HEAD.** Restyle `.status-bar`, `.status-item`, `.status-item-icon`, `.status-item-text`, `.status-item-label`,
  `.status-item-sub`, `.status-dot`. Preserve the `≤900px` 2×2 and `≤480px` 1-column collapses and their
  border rules.
- [x] 4.11 **SUPERSEDED by D10 — the area was deleted in Phase 5, not restyled; deletion verified at HEAD.** Preserve `id="lastSyncTime"` — `home.js` writes it.
- [x] 4.12 If any presentational markup edit is made in `home.js`, restrict it to the whitelist above and
      document every edit in the phase report.
- [x] 4.13 Preserve `window.triggerAuthModal = showLoginModal` (`home.js:1113`) exactly. **No new `window.*`
      global** (I14).
- [x] 4.14 Do not widen the XSS surface. `resourceCard()` and `addResult()` interpolate server strings
  unescaped today; new markup must not add further unescaped interpolation, and the existing code must not
  be modified to remove the escaping it does have.
- [x] 4.15 Do not fix the two hard-coded English sort options (`home.js:126`, `home.js:130`).
- [x] 4.16 Add `[data-perf="low"]` / `[data-perf="potato"]` overrides for every new effect (I12) and `[dir="rtl"]`
      mirrors for every new direction-sensitive rule (I13).
- [x] 4.17 Assert **no** D3-banned string appears: `SOC 2`, `ISO/IEC 27001`, `HIPAA`,
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
## Phase 4 — Home Page Redesign: COMPLETE WITH RECORDED DEVIATIONS

Retroactive verification report — shipped in commit 9db6c0b; verified against HEAD on 2026-10-02
(worktree at HEAD; baseline 8ef9e2b). Note: D10 (Home Pruning) superseded the bottom-grid, releases,
quick-access, and status-bar scope; those areas were deleted rather than restyled — tasks 4.6, 4.7,
4.8, 4.10, 4.11 are marked SUPERSEDED, and the deletion itself is verified under Phase 5.

### Files changed (this phase's scope)
- `assets/css/home.css` (+870/- lines in the implementation commit — resources, results, cards)
- `assets/js/home.js` (+369/- — deletions are D10 pruning; surviving renderers re-marked)
- `assets/css/performance-modes.css` (card/panel tier overrides)

### home.js markup edits
- Deletions only (13 diff lines touching `id=`/`data-*`), every one inside D10-pruned markup:
  `#releaseAuthAction`, `#osTabs` (+`data-os` buttons and handler), `#viewAllReleases`,
  `#releasesContainer`, `#quickAccessList`, `#lastSyncTime`, `#releaseLogoutBtn`, `#releasesBody`,
  and their `.download-btn`/`.quick-item` row templates. All covered by the I6/I7 D10 exceptions.
- No id added, renamed, or re-valued; no `data-*` or `data-i18n*` added or altered in surviving code.

### HARD GATE results
- .panel-link remains inline-flex: SUPERSEDED — `.panel-link` was deleted with the releases panel (D10).
- .results-body keeps max-height 360px + overflow-y auto: PASS — home.css (`.results-body` block intact).
- #globalSearch still inside .input-wrap: PASS — Hero markup untouched (zero changed lines in
  `renderHeroSection`); `.input-wrap` ancestor chain and the `.hero-search`/`.input-wrap`
  `z-index: 1000 !important` chain preserved verbatim (components.css:858-861); `.hero-max
  { overflow: visible !important }` preserved (components.css:849-851).
- .wiping contract on #logoSwap intact: PASS — `WIPE_MS = 700` and the `.wiping` add/remove live in the
  I10-frozen `theme.js` (unchanged in the diff); `.logo-swap.wiping .logo-layer` rule present
  (home.css:469).
- I12 / I13 parity: PASS — cards/panels in low+potato flattened-shadow lists; 36 logical-property /
  RTL constructs in home.css; `.resource-card::after` uses `inset-inline-end`.

### Id / data-* delta
- ids changed: none (only D10 deletions, excepted by I6).
- data-* changed: none (only the D10 `data-os` deletion, excepted by I7).
- data-i18n* changed: none.

### Preserved behavior confirmed
- autocomplete (debounce / arrows / enter / escape): YES — `autocomplete.js` is I10 and untouched by
  the diff; the `.input-wrap`/`.ac-dropdown` contract is intact.
- ⌘K focus: YES — key handler untouched in the diff.
- full search + stop + scrollIntoView: YES — `bindSearchEvents`/`scanAll` paths unchanged (only context
  lines in the diff).
- auth modal from all three call sites: YES — `showLoginModal` and its call sites survive;
  `window.triggerAuthModal = showLoginModal` at home.js:746, consumed at :423 (Browse locked path).
- window.triggerAuthModal resolves: YES; no new `window.*` global added (I14).
- releases table 6 columns + ≤768 collapse: SUPERSEDED — table deleted (D10).
- category filter rebuild + data-val: YES — `populateCategoryFilter` survives; `data-val` options intact.
- refresh button + .spinning: YES — `#refreshResourcesBtn` present (home.js:132 region).
- grid/list toggle + gridTemplateColumns: YES — `#viewGridBtn`/`#viewListBtn` survive.
- #lastSyncTime updates: SUPERSEDED — deleted with the status bar (D10).

### Content discipline
- D3-banned strings present: none — grep over all shipped css/js/html: 0 hits for all seven banned
  strings.
- Card data source: ResourceService.getResources() — unchanged (service file I10, absent from diff).

### Behavior deltas observed
- DEVIATION D-11: the base `.resource-card` block declares a non-D4 coral corner-bleed
  (`rgba(255,137,100,.10)`) and an iris hover border (`rgba(86,131,218,.5)`); a later block
  (home.css:1846-1875, Phase 7) retints both to amber (`--color-ember-pulse` color-mix,
  `rgba(255,184,0,.08)`) so the computed state is amber — the intermediate literals are dead but
  non-D4. The "amber border" letter lands as neutral `--border-hover` + amber glow (D-9 family).
- `--inset-highlight` is not consumed by `.resource-card` (1 consumer elsewhere — the modal).

### Pre-existing defects
- The two hard-coded English sort options survive untouched at home.js:127-128, as instructed (4.15).
- The duplicated `escapeHtml` copy was removed — but only as part of deleting the dead bottom-grid
  code region; the surviving single `escapeHtml` (:358) still serves the surviving call sites
  (:659/:666), so no live escaping was lost (4.14 holds).

### Risks / notes
- `.badge-new` had no rule at baseline and none now — the selector was listed defensively in 4.4.
- `.resources-grid` keeps `.stagger` and `id="resourcesGrid"`; read at home.js:235/324/562.
```

---

## Appendix A — Cancelled: Browse Page Redesign (D9/I22)

**Objective:** CANCELLED. The Browse page is frozen per D9/I22. No work is to be performed; the
purpose of this section is to record the cancellation and to state the freeze verification that
replaces the original plan.

**Status:** CANCELLED. This section is not a phase and occupies no phase number.

**In-scope files:**

- **None.** No file may be edited. The only permitted action is read-only verification.

**Frozen files (must remain byte-identical, D9/I22):**

- `assets/css/browse.css`
- `assets/js/browse.js`
- `assets/js/file-actions.js`

**Previously planned (now forbidden):** `assets/css/performance-modes.css` Browse-related overrides.

**Allowed edits:** none. **Forbidden edits:** every file. The original allowed/forbidden markup-edit
clauses for `browse.js` are withdrawn — `browse.js` is frozen outright, so class names, wrapper elements,
inline styles, child count, child order, ids, `data-*` attributes, the shared `linkAttr` computation, and URL
construction are all frozen.

**Tasks:**

- [x] A.C1 ~~Restyle `.browse-layout`, `.browse-head`, `.browse-title-row`, `.browse-title-left`,~~ — CANCELLED by D9/I22
  `.browse-stats`, `.stat-item`, `.stat-val`, `.stat-dot`.
- [x] A.C2 ~~Restyle `.crumbs`, `.crumb`, `.crumb-active`, `.crumb-sep`.~~ — CANCELLED by D9/I22
      - **HARD GATE (I13):** preserve the `html[dir="rtl"] .crumb-sep svg { transform: scaleX(-1) }` mirror —
        the separator chevron direction is flipped in CSS and is the visible RTL indicator.
- [x] A.C3 ~~Restyle `.browse-controls`, `.browse-search`, `.filter-dropdown-wrap`, `.filter-pill`, `.filter-value`,~~ — CANCELLED by D9/I22
  `.filter-option`, `.view-toggle`, `.vt-btn`.
- [x] A.C4 ~~Preserve the `≤900px` rule that makes `.browse-search` full-width with `order: 1` and the~~ — CANCELLED by D9/I22
  `:focus-within` grow — behavior, not chrome.
- [x] A.C5 ~~Restyle `.file-tbl` — panel fill, `--radius-lg`, `--border-hairline`.~~ — CANCELLED by D9/I22
      - **HARD GATE (I2-adjacent):** `.file-tbl`'s `overflow: hidden` and `overflow-x: auto` must both
        survive. It is one of only three nested scroll containers and provides horizontal overflow protection.
- [x] A.C6 ~~Restyle `.file-tbl .trow` chrome — hover wash, border, transition.~~ — CANCELLED by D9/I22
      - **HARD GATE (I3):** do **not** change the desktop `grid-template-columns` track count or values,
        `gap`, `align-items`, `height`, or `padding` semantics in a way that breaks column alignment.
- [x] A.C7 ~~Restyle `.thead`, and preserve the `≤640px` rule that sets `.thead { display: none }`.~~ — CANCELLED by D9/I22
- [x] A.C8 ~~Restyle `.f-icon`, `.f-icon-dir`, `.f-icon-file`, `.f-icon-link`, and both `[data-theme="dark"]`~~ — CANCELLED by D9/I22
  variants. Keep the cell at its existing size so hover/focus emphasis causes no layout shift.
      - **HARD GATE (I3):** do **not** change the `.f-icon` box size, which would desynchronise it from the
        pinned 26 px action track.
- [x] A.C9 ~~Restyle `.f-name`, `.f-link` (list view ellipsis), and the `.grid-mode` 2-line `-webkit-line-clamp`~~ — CANCELLED by D9/I22
  variant.
- [x] A.C10 ~~Restyle `.badge`, `.badge-dir`, `.badge-file`, `.f-sub`.~~ — CANCELLED by D9/I22
- [x] A.C11 ~~Restyle `.f-actions` and `.f-action`.~~ — CANCELLED by D9/I22
      - **HARD GATE (I20):** the `.f-actions` hidden state continues to use `opacity` + `pointer-events`.
        `display: none` and `visibility: hidden` are forbidden — they would remove the control from the tab
        order and the accessibility tree, violating the archived `file-actions` spec.
      - **HARD GATE (I3):** `.f-action` stays `26px × 26px`. If it changes, `browse.css:177`,
        `browse.css:492`, and `.f-action` must all change together in the same task.
- [x] A.C12 ~~Preserve `:hover` and `:focus-within` reveal, and preserve the `@media (hover: none)` block that forces~~ — CANCELLED by D9/I22
  `opacity: 1; pointer-events: auto` for touch devices.
- [x] A.C13 ~~Restyle `.empty-box`, `.empty-circle`, `.empty-circle.err`, `.empty-text`.~~ — CANCELLED by D9/I22
- [x] A.C14 ~~Restyle `.locked-state`, `.locked-icon`, `.locked-title`, `.locked-desc` and its button, including the~~ — CANCELLED by D9/I22
  `≤1024px`, `≤768px`, and `≤480px` size collapses.
      - **HARD GATE:** `#browseAuthBtn` must keep its three-step handler chain
        (`HomePage.showLoginModal` → `window.triggerAuthModal` → `Router.navigate("/")`).
- [x] A.C15 ~~Restyle `.resources-error` and the in-page 404 block, preserving the dashed border treatment and the~~ — CANCELLED by D9/I22
  escaped `<code>` path display.
      - **HARD GATE:** the 404 path remains **in-page with no redirect**, and `#browseControls` is still hidden
        on error.
- [x] A.C16 ~~Restyle `.skeleton-box`, `.skeleton-line` (including the `.skeleton-line-title`, `-desc`, `-desc-sm`,~~ — CANCELLED by D9/I22
  `-meta` variants used by Home).
- [x] A.C17 ~~If any row markup edit is made in `browse.js`, restrict it to the whitelist and document each edit.~~ — CANCELLED by D9/I22
- [x] A.C18 ~~Do not add a new view mode, pagination, selection, or lazy loading.~~ — CANCELLED by D9/I22
- [x] A.C19 ~~Add `[data-perf="low"]` / `[data-perf="potato"]` overrides (I12) and `[dir="rtl"]` mirrors (I13).~~ — CANCELLED by D9/I22
- [x] A.C20 ~~Assert **no** D3-banned string appears.~~ — CANCELLED by D9/I22

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

**Completion condition:** Phase cancelled. No work performed. `browse.css`, `browse.js`, and
`file-actions.js` verified byte-identical to pre-redesign state.

**Applicable Agent Skills:** `frontend-ui-engineering`, `incremental-implementation`.

### Appendix A — Browse Page Redesign — Final Report Template (CANCELLED)

```
## Appendix A — Cancelled: Browse Page Redesign: COMPLETE / BLOCKED

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

## Phase 5 — Home Pruning & Enterprise Footer

**Objective:** Delete the bottom grid (Latest Releases, Quick Access), the releases auth UI, and the status bar
from `home.js` and `home.css`; replace the hidden placeholder footer with a real, fully bilingual,
four-column CloudAvid Enterprise Footer.

**Prerequisites:** Phases 1–4 approved and their reports accepted.

**In-scope files:**

- `assets/js/home.js` — remove the bottom-section and status-bar render functions and their logic
- `assets/css/home.css` — remove the corresponding rules
- `index.html` — replace `<footer class="footer" style="display:none">` (at `index.html:243`) with the real
  footer markup
- `assets/css/components.css` — footer styling (footer lives in the shell, so its CSS goes here, not in
  `home.css`)

**Out-of-scope files:** `assets/js/i18n.js` (footer keys land in Phase 8), `assets/css/tokens.css`,
`assets/css/base.css`, `assets/js/browse.js`, `assets/css/browse.css`, `assets/js/file-actions.js`,
`.hero-max` and all Hero descendants, `browse.html`, `router.js`, `services/resource-service.js`,
`theme.js`, `autocomplete.js`, all of `lib/**`, `template/new-home.html`, `server.js`, `package.json`,
`nginx.conf`.

**Deletion list (D10):** `.bottom-grid`, `.panel`, `.releases-table`, `.res-row`, `#osTabs`,
`#releasesContainer`, `#releasesBody`, `#quickAccessList`, `.quick-item`, `#releaseAuthAction`,
`#viewAllReleases`, `#releaseLogoutBtn`, `.status-bar`, `.status-item`, `.status-dot`, `#lastSyncTime`, and
the `updateLastSyncTime()` function.

**MUST survive (D10):** `HomePage.showLoginModal`, the `window.triggerAuthModal = showLoginModal` binding,
and all auth API logic. `showLoginModal` is a core logic contract and is the mechanism the frozen Browse page
uses to open the auth modal.

**Tasks:**

- [x] 5.1 Rip the bottom grid and the status bar out of `assets/js/home.js`. Remove `renderBottomSection`,
      `loadReleasesTable`, the OS-tab wiring (`activeOsTab`, `data-os` handlers), the quick-access renderer,
      `renderStatusBar`, and `updateLastSyncTime()` together with every call site of each.
      - Remove the deleted ids from any surviving markup string: `#releasesContainer`, `#releasesBody`,
        `#releaseAuthAction`, `#viewAllReleases`, `#releaseLogoutBtn`, `#quickAccessList`, `#lastSyncTime`,
        `#osTabs`.
      - Remove the inline `onclick="showLoginModal(...)"` at `home.js:564` that lived inside the Releases
        locked-state markup. This removes a *trigger*, not the function.
      - **HARD GATE:** `showLoginModal` itself, its `HomePage.showLoginModal` export, and
        `window.triggerAuthModal = showLoginModal` are untouched.
      - Confirm no other `home.js` function referenced a removed local (e.g. a shared helper) — a dangling
        reference is a ReferenceError at render time.
- [x] 5.2 Rip the corresponding CSS out of `assets/css/home.css`: every rule whose selector is
      `.bottom-grid`, `.panel*`, `.releases-table`, `.res-row`, `.os-tabs`, `.panel-link`, `.quick-list`,
      `.quick-item`, `.status-bar`, `.status-item`, `.status-dot`, or the `#lastSyncTime` rules.
      - Leave shared primitives that other surviving components use. `.panel-head`/`.panel-icon`/`.panel-title`
        styling that the auth modal or error states rely on stays; only the bottom-grid-owned rules go.
      - Grep `home.css` after the edit and assert zero remaining matches for the deletion list.
- [x] 5.3 Build the Enterprise Footer DOM in `index.html` at `<footer class="footer">`. Remove the inline
      `style="display:none"`. Emit `.footer-grid` with four `.footer-col` children and a `.footer-bottom`
      copyright bar.
      - **Column 1 — Brand/About:** CloudAvid logo plus the about paragraph (cloud computing with over 15 years
        of experience, providing secure and scalable services in virtualization, cloud infrastructure, and
        enterprise support).
      - **Column 2 — Useful Links:** Main Page (`/`), Contact Us (`#`), About Us (`#`), Blog (`#`),
        Documentation (`https://docs.cloudavid.com`), Rakaard (`https://rakaard.ir`),
        CloudAvid (`https://cloudavid.com`).
      - **Column 3 — Contact:** phone `035-3106`, phone `021-66198680`, email `info@cloudavid.com`, address
        (Yazd, Safaieh).
      - **Column 4 — Socials/Trust:** SVG placeholder icons for Telegram, LinkedIn, X, and Github, plus
        trust-badge placeholders. Placeholders are inert and clearly labelled; they must not present as
        real partner or certification claims.
      - **Copyright:** "All rights reserved for CloudAvid."
      - **Every user-visible string carries `data-i18n`** (or `data-i18n-html` for the about paragraph). No
        hardcoded English ships. Brand names, phone numbers, email addresses, and URLs are proper nouns and
        are not translated, but their labels ("Phone", "Email", "Address", "Useful Links") are.
      - The footer stays a **sibling of `.nav`**, never inside `#app` (I5).
- [x] 5.4 Style the footer in `assets/css/components.css` (not `home.css` — it is shell chrome shared by
      every route).
      - Background `var(--bg-card)` or `transparent` over the base shell; 1px `var(--border-hairline)` top
        border; muted body text `var(--text-3)`, links `var(--text-2)`, headings `var(--text)`.
      - Link hover uses `var(--accent-primary)` with the `--glow-amber` treatment that matches the resource
        cards; keyboard focus uses a visible `var(--border-focus)` ring.
      - `--radius-lg` container, spacing from the `--space-*` scale.
      - Responsive grid: 4 columns above 1024px, 2 columns at `≤1024px`, 1 column at `≤640px`.
      - **HARD GATE (I12):** the hover glow is tier-gated under `[data-perf="low"]` and
        `[data-perf="potato"]`.
      - **HARD GATE (I2):** the footer introduces no horizontal overflow at any width; `.page` and `#app`
        gain no `overflow` value.
- [x] 5.5 **HARD GATE (D8/I21) — Hero still frozen.** `.hero-max` and all descendants remain byte-identical:
      no CSS, markup, token, or behavioral change. Re-assert the Hero hash and re-run the D8 assertions.
      - Pruning must not shift, remove, or reflow the Hero. `#globalSearch`, `#searchBtn`, `#stopBtn`,
        `#logoSwap` are untouched.
- [x] 5.6 **HARD GATE (D9/I22) — Browse still frozen.** `assets/css/browse.css`, `assets/js/browse.js`, and
      `assets/js/file-actions.js` remain byte-identical to their pre-redesign state.
      - The footer must not edit `browse.css` to compensate for any shell spacing change.
      - Assert `git diff --name-only -- assets/css/browse.css assets/js/browse.js assets/js/file-actions.js`
        is empty.
- [x] 5.7 **HARD GATE (D10) — `showLoginModal` survives.** Assert `HomePage.showLoginModal` is still defined
      and exported, `window.triggerAuthModal` is still bound to it, and the Browse locked state still opens
      the modal through the fallback chain (`HomePage.showLoginModal` → `window.triggerAuthModal` →
      `Router.navigate("/")`).
      - Only the Releases-panel trigger was removed; the function and its two remaining call sites are intact.
- [x] 5.8 Assert no dangling references remain: grep `home.js` and `home.css` for every id and class in the
      deletion list and confirm zero matches outside comments.
      - Confirm no surviving `home.js` function reads a removed element (e.g. `$("#lastSyncTime")`,
        `$("#osTabs")`, `$("#quickAccessList")`) — that would be a null dereference on every Home render.

**Validation:**

- **HARD GATE (D8/I21):** `.hero-max` innerHTML and computed styles byte-identical before and after Phase 5.
- **HARD GATE (D9/I22):** `browse.css`, `browse.js`, `file-actions.js` byte-identical.
- **HARD GATE (D10):** `showLoginModal` defined, exported, and bound to `window.triggerAuthModal`.
- Grep assertion — zero occurrences of the deletion list in `home.js` and `home.css`.
- Grep assertion — every footer string carries a `data-i18n`; no hardcoded English in the footer markup.
- Visual: footer renders in the shell on both Home and Browse, appears after the routed content, and does not
  appear inside `#app`.
- Responsive: 4 / 2 / 1 column grid at the three breakpoints, no horizontal overflow at any width.
- Manual: Home renders with no console errors after the deletions; the search flow still works end to end.

**Completion condition:** the bottom grid, releases auth UI, and status bar are gone from both DOM and JS; the
Enterprise Footer ships in `index.html` with full `data-i18n` coverage and Obsidian Kinetic styling; Hero and
Browse remain frozen; `showLoginModal` is intact.

**Applicable Agent Skills:** `frontend-ui-engineering`, `code-simplification`, `code-review-and-quality`.

### Phase 5 — Home Pruning & Enterprise Footer — Final Report Template

```
## Phase 5 — Home Pruning & Enterprise Footer: COMPLETE WITH RECORDED DEVIATIONS

Retroactive verification report — shipped in commit 9db6c0b; verified against HEAD on 2026-10-02
(worktree at HEAD; baseline 8ef9e2b).

### Files changed
- `assets/js/home.js` (~369 lines removed: bottom-section + status-bar renderers and logic)
- `assets/css/home.css` (bottom-grid/status-bar rule groups removed; removal comment at :1746-1747)
- `index.html` (footer hunk: placeholder `<footer style="display:none">` → real Enterprise Footer)
- `assets/css/components.css` (footer chrome at :545-760 region)

### Deletions
- home.js: `renderBottomSection`, `loadReleasesTable`, OS-tab wiring (`activeOsTab`, `data-os`
  handlers), quick-access renderer, `renderStatusBar`, `updateLastSyncTime()` — all 0 hits at HEAD;
  the Releases locked-state inline `onclick="showLoginModal(...)"` also removed (0 `onclick` hits).
- home.css: every `.bottom-grid`/`.panel*`/`.releases-table`/`.os-tabs`/`.panel-link`/`.quick-*`/
  `.status-*` rule — 0 hits outside the documenting comment.

### Preserved (HARD GATE evidence)
- showLoginModal: defined and exported; `window.triggerAuthModal = showLoginModal` at home.js:746;
  surviving call site at :423 (Browse locked-state fallback chain); the function is untouched.
- .hero-max hash before/after: identical — zero changed lines in `renderHeroSection` (see Phases 1–2);
  `#globalSearch`, `#searchBtn`, `#stopBtn`, `#logoSwap` untouched.
- browse.css, browse.js, file-actions.js diff: **empty** — all three absent from the implementation
  commit (`git diff 8ef9e2b..9db6c0b --stat`), byte-identical to pre-redesign.

### Footer markup added
- index.html line range: the footer hunk (`<footer class="footer">` … `.footer-bottom` copyright bar),
  sibling of `.nav`, outside `#app` (I5); inline `style="display:none"` removed.
- data-i18n keys referenced: `footer.about`, `footer.linksTitle`, `footer.linkHome`,
  `footer.linkBrowse`, `footer.linkDocs`, `footer.linkMainSite`, `footer.linkRakaard`,
  `footer.contactTitle`, `footer.phoneYazd`, `footer.phoneTehran`, `footer.emailLabel`,
  `footer.address`, `footer.socialTitle`, `footer.socialTelegramPh`, `footer.socialLinkedInPh`,
  `footer.socialGithubPh`, `footer.copyright`. (Phase 8 verifies both dictionaries define them.)
- hardcoded strings found: none — every label carries `data-i18n`; phone numbers, email, and URLs are
  untranslated proper nouns per the letter. (The social `aria-label`s are hardcoded English with the
  dead `data-i18n-ph` hook — recorded pre-existing defect, remediated by `a11y-ux-debt` Phase 5.)

### Footer styling
- components.css line range: :545-760 (`.footer` … `.copyright-text`) plus responsive overrides.
- responsive breakpoints implemented: 4-column `2fr 1fr 1.5fr 1fr` base → 2-column (≤1024px) →
  1-column (≤640px); `.footer-col { min-width: 0 }` and wrapping contact rows keep it overflow-free.
- Tokens: `--bg-card` surface, `border-top: 1px solid var(--border)` (hairline value), `--text-3`
  body, `--text` headings, `--text-accent` hover, `--border-focus` focus-visible ring, `--space-*`/
  `--gutter-desktop` spacing, radius `--radius-panels` (= 0.5rem, the `--radius-lg` value).

### Grep assertions
- deletion list in home.js: 0 (10/10 ids, 5/5 functions, 0 `onclick`).
- deletion list in home.css: 0 rules (2 comment mentions at :1746-1747).
- `.res-row`: **6 hits remain** — DEVIATION D-12. The results panel (restyled in 4.9) consumes
  `.res-row`/`.res-info`/`.res-path`; D10's deletion-list entry for `.res-row` conflicts with 4.9.
  The implementer kept the results-panel rules; the "zero matches" letter fails for this one class,
  the intent (bottom-grid `.res-row` usage) is gone from the JS.

### Deviations in the footer content (for maintainer acceptance)
- D-13: Links column ships 5 links (Home, Browse Portal, Documentation, CloudAvid Main Site,
  Rakaard). The letter's placeholder links Contact Us (`#`), About Us (`#`), Blog (`#`) were not
  shipped; Browse Portal (`/browse`) was added.
- D-14: Socials ship Telegram, LinkedIn, GitHub — the X placeholder and the trust-badge placeholders
  were not shipped.
- D-15: the about paragraph uses `data-i18n` rather than the letter's `data-i18n-html` (the hook
  exists at i18n.js:341; the paragraph is plain text, so the simpler hook resolves it).
- D-16: copyright reads "All rights reserved for CloudAvid Technology Co." (letter: "…for CloudAvid.").
- D-17: no hover *glow* on footer links (color-only `--text-accent` hover), so the I12 tier-gate is
  vacuous; performance-modes.css documents the footer as already-flat (:694-699) and potato flattens
  it further (:763-770). `--accent-primary`/`--glow-amber` do not exist under D-1.

### Risks / notes
- `.contact-label` consumes `--text-4` — one of the AA-failing call sites confirmed by `a11y-ux-debt`
  (its Phase 2 remediates through the token).
- Social anchor `aria-label`s do not localise at HEAD (dead `data-i18n-ph` on non-input elements) —
  pre-existing defect recorded here and in `a11y-ux-debt` Phase 5.
```

---

## Phase 6 — Overlays & States

**Objective:** Restyle the auth modal and all four dropdowns in place, plus the skeleton, empty, error, and
locked states.

**Prerequisites:** Phases 1–5 approved and their reports accepted.

**In-scope files:**

- `assets/css/home.css` (auth modal lives here at `home.css:1462-1630`)
- `assets/css/components.css` (`.ac-dropdown` and any shared overlay primitive)
- `assets/css/performance-modes.css`

**Frozen files (D9/I22 — read-only, never edit):** `assets/css/browse.css`, `assets/js/browse.js`,
`assets/js/file-actions.js`. Overlay work covers Home and shell contexts only; Browse-scoped states are
already styled and stay exactly as they are.

**Out-of-scope files:** `base.css`, `tokens.css`, `assets/js/home.js`, `assets/js/browse.js`,
`assets/js/router.js`, `assets/js/i18n.js`, `assets/js/autocomplete.js`, `assets/js/theme.js`,
`browse.html`, all of `lib/**`, `template/new-home.html`.

**Note:** detect where each overlay rule currently lives and restyle it **in place**. Do not relocate a rule
between stylesheets — the cascade order relative to `.panel`, `.results-panel`, and the navbar depends on it.

**Tasks:**

- [x] 6.1 Restyle `.auth-overlay` — `position: fixed`, `inset: 0`, and `pointer-events: none` in the closed state
  all unchanged; repoint `z-index` to `var(--z-modal)` (= 999999).
      - **HARD GATE (I19):** the `opacity` transition duration remains exactly **250 ms**, because
        `home.js:1076` removes the node after a 250 ms timeout.
- [x] 6.2 Restyle `.auth-modal` — `--surface-container-high` fill, `--radius-xl`, `--shadow-modal` (D4's
      elevation, replacing `--shadow-xl`), an `.auth-modal::before` amber/indigo aurora.
      - **HARD GATE (I19):** the `transform` transition remains exactly **250 ms**.
- [x] 6.3 Restyle `.btn-close-modal` — preserve its absolute positioning at `z-index: 10` and its
      RTL-inverted side (`left: 16px; right: auto` when `d.dir === "rtl"`).
- [x] 6.4 Restyle `.auth-header`, `.auth-form`, `.auth-input-group`, its `input` focus ring (radius from
      `--radius-inputs`), `.auth-error`, `.btn-login`.
      - **HARD GATE:** the modal's ids `#authOverlay`, `#closeAuthBtn`, `#authForm`, `#authUsername`,
        `#authPassword`, `#authError`, `#authSubmitBtn` are all created by `home.js` and are not touched by
        CSS — confirm the CSS restyle keeps them addressable and does not add a wrapper that breaks the
        `autocomplete` attributes.
- [x] 6.5 Add `[data-perf="low"]` / `[data-perf="potato"]` overrides removing the overlay's `backdrop-filter:
      blur(12px)` (currently ungated) (I12).
      - **HARD GATE:** both tier blocks present for the overlay blur.
- [x] 6.6 Restyle `.filter-dropdown-wrap`, `.filter-pill`, `.filter-value`, `.filter-option`, `.filter-dropdown-menu`,
  preserving the `.show`-on-**wrapper** open mechanism and the three-property closed state.
      - **HARD GATE:** `.show` must remain on the wrapper, not moved to the menu.
- [x] 6.7 Restyle `.perf-dropdown-menu`, preserving its four-property closed state including `pointer-events`.
- [x] 6.8 Restyle `.lang-dropdown-menu` and `.lang-option`, **keeping the CSS `:hover`-only open mechanism**. Do not
  add a `.show` path and do not start updating `#langBtn`'s `aria-expanded` (recorded pre-existing gap,
      out of scope).
- [x] 6.9 Restyle `.ac-dropdown`, `.ac-list`, `.ac-item`, `.ac-item-left`, `.ac-icon`, `.ac-icon-dir`,
  `.ac-icon-file`, `.ac-info`, `.ac-name`, `.ac-path`, `.ac-highlight`, `.ac-footer`.
      - **EXCEPTION (D8/I21):** the `.ac-dropdown` as it renders **inside `.hero-max`** is FROZEN. The
        dropdown is created by `Autocomplete.bind()` into `#globalSearch`'s `.input-wrap`, which lives in the
        Hero, so any restyle must be constrained so the rendered-in-Hero appearance is unchanged. If a single
        rule cannot serve both contexts, the Hero-scoped case takes precedence and the change is dropped.
      - **HARD GATE:** `.ac-list { max-height: 280px; overflow-y: auto }` must be preserved, as must
        `.ac-dropdown`'s `.show` mechanism and `pointer-events: none` closed state. `.ac-dropdown` also
        depends on `.hero-max { overflow: visible !important }` and the `z-index: 1000 !important` chain —
        both untouched.
- [x] 6.10 Restyle the `.ac-dropdown` z-index reference to `var(--z-autocomplete)` where the existing chain allows,
      without changing the **effective** ceiling of 1000 that the ancestor stacking contexts impose.
- [x] 6.11 Restyle `.skeleton-box`, `.skeleton-line` and its variants, `.resource-card-skeleton`.
- [x] 6.12 Restyle `.empty-box`, `.empty-circle`, `.empty-circle.err`, `.empty-text`, `.ac-empty`.
- [x] 6.13 Restyle `.resources-error` (both the Home and Browse variants) and the Browse in-page 404 block.
- [x] 6.14 Restyle `.locked-state`, `.locked-icon`, `.locked-title`, `.locked-desc` for both Home and Browse,
      preserving all three responsive size collapses.
- [x] 6.15 Restyle `.perf-toast` — repoint `z-index` to `var(--z-toast)` (= 99999) and preserve both `[dir="rtl"]`
      transform-flip rules.
- [x] 6.16 Do not unify the three different dropdown hidden-state mechanisms.
- [x] 6.17 Do not add a focus trap, an `Escape` handler, focus restoration, or any other a11y improvement.
- [x] 6.18 Add `[data-perf]` overrides (I12) and `[dir="rtl"]` mirrors (I13) for every new rule.

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

### Phase 6 — Overlays & States — Final Report Template

```
## Phase 6 — Overlays & States: COMPLETE WITH RECORDED DEVIATIONS

Retroactive verification report — shipped in commit 9db6c0b; verified against HEAD on 2026-10-02
(worktree at HEAD; baseline 8ef9e2b).

### Files changed
- `assets/css/home.css` — `.auth-overlay`/`.auth-modal`/`.btn-close-modal`/`.auth-*` (:1200-1380),
  `.filter-dropdown-*` (:617-700), skeleton/locked/error/ac-empty rules
- `assets/css/components.css` — `.ac-dropdown`/`.ac-list`/`.ac-item` family (:863-1010)
- `assets/css/performance-modes.css` — overlay tier gates (:697-760), `.perf-dropdown-menu`,
  `.perf-toast` (:503-547)
- (No rule was relocated between stylesheets — selectors remain in their baseline files.)

### Overlays restyled (in place — no relocation)
- `.auth-overlay`, `.auth-modal`, `.auth-modal::before`, `.auth-header`, `.auth-form`,
  `.auth-input-group`, `.auth-error`, `.btn-login`, `.btn-close-modal` → home.css
- `.filter-dropdown-*` → home.css; `.perf-dropdown-menu`, `.perf-toast` → performance-modes.css;
  `.lang-dropdown-menu`/`.lang-option` → components.css; `.ac-*` → components.css;
  `.skeleton-*`/`.resource-card-skeleton`/`.ac-empty`/`.resources-error`/`.locked-*` → home.css

### HARD GATE results
- I19 overlay opacity transition = 250ms: PASS — `transition: opacity 250ms ease` (home.css:1213);
  JS removes the node after exactly 250ms (home.js:712).
- I19 modal transform transition = 250ms: PASS — `transition: transform 250ms ease` (home.css:1235).
- I19 overlay appended to document.body (not #app): PASS — `document.body.appendChild(overlay)`
  (home.js:707); idempotency guard `if (document.getElementById('authOverlay')) return;` (:675).
- I12 low + potato overrides for overlay blur: PASS — `[data-perf="low"] .auth-overlay` (:719, light
  variant :725), `[data-perf="potato"] .auth-overlay` (:743/:749/:755); the previously-ungated
  `blur(12px)` is documented at :697.
- .show remains on the WRAPPER for filter/perf: PASS — `.filter-dropdown-wrap.show
  .filter-dropdown-menu` (:682), `.perf-dropdown-wrap.show .perf-dropdown-menu` (perf-modes:419);
  three-property (filter) and four-property (perf, incl. `pointer-events`) closed states preserved.
- .lang remains :hover-only: PASS — components.css:351; I8 freeze comment intact.
- .ac-list keeps max-height 280px + overflow-y auto: PASS (components.css:899-901); `.ac-dropdown`
  `.show` mechanism and `pointer-events: none` closed state intact; `.hero-max
  { overflow: visible !important }` and the `z-index: 1000 !important` chain untouched.

### Preserved mechanisms confirmed
- #authOverlay idempotency guard: YES (home.js:675).
- close button / backdrop click / submit close: YES — `#closeAuthBtn` listener at home.js:714;
  backdrop/submit paths in the surviving modal code.
- modal survives router navigation: YES — overlay is body-appended, router only re-renders `#app`.
- #authError shows failures; rate-limit disables inputs: YES — error path survives; the
  string-sniffing pre-existing brittleness untouched.
- filter dropdown open/close/label/outside-click: YES — mechanism + `.filter-value` labels intact.
- perf dropdown open/outside-click: YES (see Phase 3).
- lang dropdown hover + .active: YES (see Phase 3).
- ac dropdown open/close/internal scroll/arrow nav: YES — `autocomplete.js` untouched (I10).
- perf-toast show/dismiss + RTL flip: YES — both `[dir="rtl"]` transform-flip rules (:539/:545).
- skeletons / empty / error / locked states: YES — `.skeleton-box/-line` (4/8 rules),
  `.resource-card-skeleton` (3), `.ac-empty` (1), `.resources-error` (2), `.locked-state` family
  (11 rules incl. responsive collapses).

### Behavior deltas observed
- DEVIATION D-18: 6.10's repoint did not happen — `.ac-dropdown` keeps the pre-existing literal
  `z-index: 99999 !important` (byte-identical to baseline :649). The effective ceiling is unchanged;
  `var(--z-autocomplete)` is unconsumed.
- DEVIATION D-19: z-index tokens were not consumed where letters asked: `.auth-overlay` ships literal
  `999999` (= `--z-modal`'s value) and `.perf-toast` literal `99999` (= `--z-toast`'s). Values are
  correct; the scale is bypassed.
- DEVIATION D-20 (6.12): `.empty-box`/`.empty-circle`/`.empty-text` exist **only** in the frozen
  `browse.css` (5 hits) — they had zero rules in baseline home.css, so the Home-context restyle had
  nothing to restyle; the frozen Browse rules were correctly left byte-identical (I22). Only
  `.ac-empty` was restyled in Home context.
- `.auth-modal` uses `--radius-panels` (0.5rem) rather than the letter's `--radius-xl` (0.75rem), and
  `var(--shadow-xl)` whose dark value IS D4's `--shadow-modal` verbatim; the `::before` aurora ships
  indigo-only (non-D4 literal `rgba(86,131,218,.15)` — D-11 family).

### Pre-existing defects
- None made more likely. `.empty-*` hooks survive in browse.css (I8); the ac-dropdown z-index literal
  is pre-existing.

### Risks / notes
- D-18/D-19 are token-consumption gaps consistent with D-1 (names missing) — values everywhere match
  the intended scale entries.
- 6.17 confirmed: zero `Escape`/focus-trap/focus-additions in the home.js diff.
```

---

## Phase 7 — Performance, RTL, Responsive Parity

**Objective:** Guarantee that every effect introduced in Phases 2–6 has a `low`/`potato` override, every new
direction-sensitive rule has an `[dir="rtl"]` mirror, and all six responsive breakpoints plus the
`hover: none` and `prefers-reduced-motion` paths behave correctly — while proving the Browse freeze (D9/I22)
has held.

**Prerequisites:** Phases 1–6 approved and their reports accepted.

**In-scope files:**

- `assets/css/performance-modes.css`
- `assets/css/components.css`, `assets/css/home.css`, `assets/css/base.css`
  (parity additions only)

**Out-of-scope files:** `tokens.css`, `index.html`, `browse.html`, all of `assets/js/**`, all of `lib/**`,
`template/new-home.html`, `server.js`, `package.json`, `nginx.conf`.

**Frozen files (D9/I22 — read-only verification only, never edit):** `assets/css/browse.css`,
`assets/js/browse.js`, `assets/js/file-actions.js`.

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
- [ ] 7.17 **HARD GATE (D9/I22) — Browse freeze integrity.** Verify `assets/css/browse.css`,
  `assets/js/browse.js`, and `assets/js/file-actions.js` are byte-identical to their pre-redesign state.
      - Assertion: `git diff --name-only -- assets/css/browse.css assets/js/browse.js assets/js/file-actions.js`
        is empty (or those paths are absent from every commit since the change began).
      - Assertion: file hashes for the three files match the pre-redesign baseline recorded at the start of
        this change.

        Browse page.
      - Confirm no `browse.css` rule was added to compensate for Phase 1 token drift (D9 §Accepted Token Drift).
      - Confirm the `.ac-empty` override added to `home.css` in Phase 4 is a documented one-way dependency and
        was not "fixed" by editing `browse.css`.

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
- **HARD GATE (D9/I22):** `browse.css`, `browse.js`, and `file-actions.js` are byte-identical to their
  pre-redesign state. Any drift fails the whole phase.
- Keyboard: full keyboard pass on navbar dropdowns, the hero search, autocomplete, Browse filters, the view
  toggle, row targets, and the auth modal (opening and closing only — no new handlers).

**Completion condition:** every effect tier-gated, every direction-sensitive rule mirrored, all six
breakpoints verified, all greppable invariants re-asserted, and the Browse freeze (D9/I22) proven intact.

**Applicable Agent Skills:** `performance-optimization`, `code-review-and-quality`.

### Phase 7 — Performance, RTL, Responsive Parity — Final Report Template

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

**Prerequisites:** Phases 1–6 approved and their reports accepted.

**In-scope files:**

- `assets/js/i18n.js` — **additive keys only**
- `assets/css/**`, `assets/js/**`, `index.html` — **verification only, no edits** unless a Phase 1–6 defect is
  found, which must be reported rather than silently patched

**Out-of-scope files:** `router.js`, `services/resource-service.js`, `file-actions.js`, `theme.js`,
`autocomplete.js` (logic), `browse.html`, all of `lib/**`, `template/new-home.html`, `server.js`,
`package.json`, `nginx.conf`, `Doxyfile`, `data/**`.

**Tasks:**

- [x] 8.1 Determine whether any genuinely new user-visible label was introduced in Phases 4, 5, or 6. Outside
  the Enterprise Footer the expected answer is **none**, because the redesign adds no new copy elsewhere.
- [x] 8.2 **Enterprise Footer keys (D10).** Add the footer's dictionary keys to **both** `i18n.en` and
  `i18n.fa`, at mirrored positions (I11). The footer markup shipped in Phase 5 references them; this task
  makes them resolve.
      - Brand / About: the about paragraph (use `data-i18n-html` in the markup, so the key holds the
        sentence about 15 years of experience in virtualization, cloud infrastructure, and enterprise
        support).
      - Links column: the column heading plus one key per link label — main page, contact us, about us, blog,
        documentation, Rakaard, CloudAvid.
      - Contact column: the column heading plus the labels for phone, email, and address. The phone numbers,
        email address, and URLs themselves are **not** translated — they are proper nouns and contact data.
      - Socials / Trust: accessible names for the Telegram, LinkedIn, X, and Github placeholders, and for
        each trust-badge placeholder.
      - Copyright: "All rights reserved for CloudAvid."
      - Assert every `data-i18n` / `data-i18n-html` attribute present in the footer markup has a matching key
        in `i18n.en`, and that `i18n.fa` has the same key set. No footer string may remain hardcoded.
      - Phase 5 shipped the English source text so the footer renders before this phase; this phase is what
        makes the Persian (`fa`) rendering real.
- [x] 8.3 For any new static label, add a `data-i18n` (or `data-i18n-ph` / `data-i18n-html`) attribute and add the
  key to **both** `i18n.en` and `i18n.fa` at mirrored positions (I11).
- [x] 8.4 Do not delete, rename, or reword any existing key in either dictionary (I10).
- [x] 8.5 Confirm the sorted key sets of `i18n.en` and `i18n.fa` are identical.
- [x] 8.6 Confirm `dir` and `lang` remain the only intentionally-differing keys.
- [x] 8.7 Do **not** fix the two hard-coded English sort options in `home.js:126` and `home.js:130` (recorded
  pre-existing defect).
- [x] 8.8 Run the full C1–C12 behavioral regression checklist.
- [x] 8.9 Confirm the self-hosted Vazirmatn activates for `[lang="fa"]` via the existing `base.css:39` rule.
- [x] 8.10 Confirm a language switch calls `Router.refresh()`, re-renders the current route, and rebuilds all
  dynamic text from the new dictionary.
- [x] 8.11 Confirm both themes render correctly in both directions after the language switch.
- [x] 8.12 Re-assert every hard gate one final time.
- [x] 8.13 Produce the final change report and list every file changed across all eight phases.

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

### Phase 8 — i18n Keys & Final Verification — Final Report Template

```
## Phase 8 — i18n Keys & Final Verification: COMPLETE

Retroactive verification report — the phase's dictionary work shipped in commit 9db6c0b; verified
against HEAD on 2026-10-02 (worktree at HEAD; baseline 8ef9e2b). No code edits were required this
session: 8.1's answer is "no new labels outside the footer", and the footer keys already ship.

### Files changed (this phase)
- None this session. The 17 `footer.*` keys shipped inside the implementation commit's `i18n.js`
  (+43 lines, additive only).

### New i18n keys
- 17 keys, added at mirrored (end-of-dictionary) positions in both `i18n.en` and `i18n.fa` (I11):
  `footer.about`, `footer.linksTitle`, `footer.linkHome`, `footer.linkBrowse`, `footer.linkDocs`,
  `footer.linkMainSite`, `footer.linkRakaard`, `footer.contactTitle`, `footer.phoneYazd`,
  `footer.phoneTehran`, `footer.emailLabel`, `footer.address`, `footer.socialTitle`,
  `footer.socialTelegramPh`, `footer.socialLinkedInPh`, `footer.socialGithubPh`, `footer.copyright`.
- Every `data-i18n*` attribute in the footer markup resolves: 17 keys used, 17 defined in each
  dictionary — 0 missing on either side (script-verified).

### Dictionary integrity
- sorted key sets of i18n.en and i18n.fa identical: YES (modulo the pre-existing self-name keys:
  `en` exists only in en, `fa` only in fa — identical asymmetry at baseline 110/110, so intentional;
  both dictionaries hold 127 keys at HEAD, no duplicates).
- only dir/lang differ intentionally: YES — `en.dir=ltr/lang=en`, `fa.dir=rtl/lang=fa`; the footer
  additions are perfectly mirrored, introducing zero new asymmetry.
- existing keys unchanged: YES — the diff is pure addition (two `errorServerSub` trailing commas) plus
  an EOF-newline fix; no deletion, rename, or rewording (I10).

### C1–C12 regression checklist
| # | Contract | Result | Evidence |
|---|---|---|---|
| C1 | Router link interception | PASS | `router.js` absent from the implementation diff — byte-identical (I10) |
| C2 | Row cell order | PASS | `browse.js`/`browse.css` byte-identical (I22) |
| C3 | Three independent targets | PASS | `browse.js`/`file-actions.js` byte-identical |
| C4 | Download marker | PASS | `browse.js`/`file-actions.js` byte-identical; extension regex untouched |
| C5 | URL construction | PASS | `resource-service.js` absent from diff; no literal `/api/download/` assembly added |
| C6 | `#app` mount | PASS | `<main id="app">` intact (diff context); `.nav`/`.footer` remain siblings (footer added beside, not inside) |
| C7 | Sticky navbar | PASS | `.nav` sticky/12px/`var(--z-sticky)`=50; no overflow on `.page`/`#app`; `body { overflow-x: hidden }` at base.css:30 |
| C8 | i18n application | PASS | `data-i18n*` applicators untouched; `documentElement.lang/dir` written (i18n.js:325-326); `Router.refresh()` on switch (:379); re-apply after every route render (router.js) |
| C9 | Dropdown visibility | PASS | `.show` on wrapper for filter/perf; `:hover`-only for lang; `.ac-dropdown .show`; all closed states inert without `display:none` |
| C10 | Modal lifecycle | PASS | idempotency guard (home.js:675); body append (:707); 250ms timeout (:712) = both CSS durations; `window.triggerAuthModal` bound (:746); router re-renders `#app` only |
| C11 | Performance tiers | PASS | low/potato remove blur/glow/shadow/animation (perf-modes); pre-paint tier selection incl. `prefers-reduced-motion` in the untouched inline script (index.html:37-44); `cav_perf_tier` round-trips in the untouched performance-monitor.js |
| C12 | Listener lifetime | PASS | 0 new `document`/`window` listener additions in the diff; 0 new `window.*` globals; `showLoginModal` call sites intact |

### HARD GATE re-assertion
- I1 sticky navbar: PASS · I2 no overflow: PASS · I5 shell structure: PASS · I8 hook classes: PASS
- I9 lib untouched: PASS (no `lib/**` in diff) · I10 protected JS untouched: PASS · I14 no new
  window globals: PASS · I15 no per-render listeners: PASS · I16 zero-build/no new deps: PASS
  (`package.json` absent from diff) · I17 template untouched: PASS · I18 browse.html untouched: PASS
- I19 modal 250ms: PASS (both durations + JS timeout) · I20 `.f-actions` hidden state: PASS (frozen,
  byte-identical)
- I21 Hero freeze: PASS (markup untouched; scoped token pins; Phase-9 exception honored for the
  ≤1024px layout-only rules) · I22 Browse freeze: PASS (three files byte-identical)
- I6/I7: PASS with the D10 exception — only the eight pruned ids and `data-os` were deleted.
- I11 new strings bilingual: PASS (17/17) · I12 tier gating: PASS · I13 RTL mirroring: PASS
  (36 home.css + 11 components.css constructs + flips)

### Language switch
- rebuilds all dynamic text: YES — `Router.refresh()` re-renders the route and `applyLang(getLang())`
  runs post-render; dynamic panels rebuild from the new dictionary.
- Vazirmatn active for lang="fa": YES — `base.css:36-42` `[lang="fa"]` rule → `var(--font-fa)`
  (Vazirmatn-first since Phase 1); self-hosted binaries present.
- both themes correct after switch: YES by construction (theme and direction are independent
  attributes; all new chrome is token-driven with light-theme adaptations) — **visual/browser
  confirmation remains the one manual step this report cannot perform.**

### Persistence
- ui_lang / cav_theme / cav_perf_tier / view_mode / cav_resources_cache round-trip: YES — all five
  mechanisms live in untouched files (i18n.js logic, theme.js, performance-monitor.js, browse.js,
  resource-service.js) or the untouched inline pre-paint script.
- idle timer still logs out: YES — `lib/idle-timer.js` untouched (no `lib/**` in diff).

### Full change footprint (all 8 phases)
- `assets/css/tokens.css` (±312) · `assets/css/base.css` (±130) · `assets/css/components.css` (±478)
- `assets/css/home.css` (±870) · `assets/css/performance-modes.css` (±266)
- `index.html` (±78: font-link removal + Enterprise Footer)
- `assets/js/home.js` (-369 net: D10 pruning) · `assets/js/i18n.js` (+43: footer keys, additive)
- `assets/fonts/` — 9 new `.woff2` binaries
- **Anomaly:** `data/users.json` (1 line — `lastLogin` timestamp bump, a runtime artifact accidentally
  committed; outside every phase's scope. No code content. Recommend reverting on next housekeeping
  commit.)

### Behavior deltas vs. pre-change baseline
- 20 recorded deviations (D-1…D-20 across the phase reports), all maintainer-accepted 2026-10-02:
  structural (D4 names/alias bridge never declared; 4 scale tokens missing; name-set asymmetry;
  deprecation comments waived), visual-treatment (neutral hover borders; indigo-only aurora; footer
  link set = 5 links; no X/trust-badge placeholders; no footer hover glow), and token-consumption
  (z-index literals instead of scale tokens; `.ac-dropdown` repoint dropped).
- No behavioral contract changed: every mechanism, id, data attribute, duration, and mount verified.

### Pre-existing defects
- unchanged: per-render listener accumulation, `_homeKeyHandler` ordering, dead `data-url` path,
  label-vs-state desync, IdleTimer last-caller-wins, unescaped `resourceCard()`/`addResult()`
  interpolation, two hard-coded English sort options (home.js:127-128), dead `data-i18n-ph` hook on
  footer anchors — all confirmed present and unmodified at HEAD.
- The duplicated `escapeHtml` copy: removed, but only because its entire host region (bottom grid)
  was deleted under D10; the surviving copy serves all surviving call sites.
- The never-shown footer: **fixed by design** (D10 surfaces it) — the one intentional defect fix.
- made MORE likely to trigger: none. (Dark `--text-4` failing AA is a *new* condition introduced by
  D-1's value choices, recorded in Phase 1 and remediated by `a11y-ux-debt` Phase 2.)

### Risks / notes
- The one verification class this report cannot cover is runtime/browser behavior (C-checks marked
  behavioral in the phase texts, both-themes-both-directions rendering, and the search-switch-search
  language rebuild). All such items were verified statically against untouched mechanisms.
- Phase 7 (17 tasks) remains UNVERIFIED at this time — it was outside the Phase 8 prerequisite
  (Phases 1–6) and outside this session's scope. It should receive the same retroactive verification
  before archive.

### OpenSpec compliance
- openspec validate enterprise-ui-redesign --strict: PASS — "Change 'enterprise-ui-redesign' is valid"
- every requirement satisfied: NO — with maintainer-accepted deviations (D-1…D-20 recorded and
  accepted; three spec requirements in `design-tokens` fail their letter under D-1/D-5/D-6 and are
  covered by that acceptance)
- every scenario verified: every mechanically-checkable scenario verified with evidence; browser-only
  scenarios flagged above as manual remainder
```
