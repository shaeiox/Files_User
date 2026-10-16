# Proposal: UI Craft Elevation

## Why

A comprehensive UI/UX review of the portal scored it **4.5 / 10** against modern high-end
benchmarks. The engineering underneath is considerably stronger than the surface on top: the
four-tier runtime performance system, the RTL and Persian support, and the reduced-motion
pipeline are all things most teams at this scale do not have. What is missing is a settled
visual identity and a spent motion budget.

Two findings cause most of the gap:

1. **The site resolves two different values for the same design token in the same viewport.**
   `home.css` pins seven tokens inside `.hero-max` to pre-redesign values, so the hero renders
   blue-and-coral while the page below it renders amber. A visitor sees five hues in the first
   400 ms, which reads as two products assembled on one page.
2. **The site ships an elaborate motion budget and spends almost none of it.** Six `@keyframes`
   across 7,566 lines of CSS. Zero `IntersectionObserver`, zero scroll-driven animation, no view
   transitions. Every filter, sort, view-mode, and language change re-renders `innerHTML` and
   hard-cuts. Meanwhile `theme.js` documents a "diagonal wipe" theme transition that has no CSS
   behind it, and two stylesheets carry overrides for that non-existent animation.

Why now: `enterprise-ui-redesign` is 111 of 128 tasks complete and `a11y-ux-debt` has finished
its feature work with only verification gates pending. Both are about to be archived. Once they
are, the hero freeze they encode becomes the standing architecture rather than a transitional
state, and the identity split becomes permanent and load-bearing. The freeze has to be lifted
deliberately, by someone, and the cheapest moment is now.

## What Changes

- **Unify the accent identity.** Retire the `.hero-max` token-insulation block so every
  component resolves one accent per theme. Re-point the hero gradient into the same accent
  family instead of the current three-stop iris-to-violet-to-amber ramp. Re-measure the hero
  headline against both themes and update the quoted contrast ratios in `tokens.css`.
  **This overrides the hero freeze (`enterprise-ui-redesign` D8/I21) and hard gate J6 in
  `a11y-ux-debt`.** See Impact.
- **Resolve the focus-ring split.** `--ring` and `--border-focus` currently resolve to different
  colours in dark mode, so buttons get a blue focus ring and every other control gets an amber
  one. Collapse to one.
- **Fix the type treatment.** Cinzel is set at `letter-spacing: -0.045em; line-height: 0.98`, a
  neo-grotesque optical treatment applied to an inscriptional serif, which destroys the rhythm
  the typeface exists to provide. Add `unicode-range` to the three Vazirmatn faces;
  `STYLEGUIDE.md` already claims they carry it and they do not, so every non-Persian visitor
  downloads 153 KB of faces they never render.
- **Correct nine defects that are bugs, not opinions.** Identical description text on all seven
  resource cards (a variable scoped outside a `map` callback); a hardcoded Persian `alert()`
  inside the download interceptor that bypasses the i18n dictionary and blocks the main thread;
  ungrammatical "All rights reserved for CloudAvid Technology Co."; two conflicting legal
  footers with different years and entity names; an undefined `--error-container` token that
  silently drops the error-state border in both themes; a non-deferred `idle-timer.js`; a
  duplicated `navigate()` nested inside `navigate()` in `router.js`; an unrouted `browse.html`
  that renders broken; and a decorative status dot on a slogan.
- **Add motion, under the budget that already exists.** Scroll-reveal on section entry; FLIP on
  filter and sort; cross-fade on the grid/list toggle; view transitions on route change; hero
  entrance choreography; staged search-result reveal; nav condense on scroll. Every one ships
  with its `prefers-reduced-motion` branch and its `[data-perf="potato"]` override in the same
  change, per the existing STYLEGUIDE rule.
- **Build or delete the theme transition.** `theme.js` documents a diagonal wipe that has no CSS.
  Either implement it or remove the `.wiping` machinery and the two overrides that reference it.
  An animation that exists only in comments is worse than a hard cut.
- **Rebalance composition.** Close the 600-1000px void at the centre of the hero, reduce the
  1720px page container to roughly 1400px, add a featured-resource band with real hierarchy
  ahead of the uniform grid, and tier the grid itself so the section has internal rhythm.
- **Add a download progress affordance.** The portal's core action is multi-gigabyte transfer and
  its only feedback today is `link.innerHTML = "Checking..."` followed by a native `alert()` on
  failure.
- **Split the payload per route.** All 17 scripts and all 8 stylesheets load on every route:
  498 KB of first-party CSS and JS. A visitor landing on `/` downloads `browse.js`,
  `bulk-download.js`, `file-inspector.js`, and `releases.js` (113 KB combined) and never executes
  a line of them. There is no build step, so this is native dynamic `import()` in `router.js`.
- **Close the accessibility gaps that remain.** The auth dialog is a `div` with no
  `role="dialog"`, no `aria-modal`, no focus trap, and no Escape-to-close, on a security-gated
  surface. 25 `transition: all` declarations can animate layout properties off the GPU.
- **Remove dead code.** Dead keyframes, selectors targeting elements that do not exist, a
  duplicate `--a-*` ramp whose resolution silently changes by theme, and redundant height
  declarations where two files each claim ownership of one control.

## Capabilities

### New Capabilities

- `design-tokens`: The token contract. One accent per theme, one focus-ring colour per theme,
  font loading scoped by script, measured contrast, and removal of tokens that resolve
  ambiguously.
- `home-page`: The home route. Hero composition, resource grid hierarchy, filter, sort and view
  controls, search results, empty and error states, and the download path's user feedback.
- `app-shell`: The persistent chrome on every route. Navbar controls, dropdown mechanisms, the
  theme toggle, footer content and localisation, and the authentication dialog.
- `motion-contract`: The cross-cutting rules every animated surface obeys. Permitted techniques,
  reduced-motion obligation, performance-tier obligation, and the prohibitions.
- `routing`: The SPA route lifecycle. Per-route rendering, route transitions, history, the 404
  path, and per-route payload.

### Modified Capabilities

- `browse-page`: Its motion requirement ("suppress or shorten those animations") is strengthened
  to the shared `motion-contract` techniques, and its accent requirement changes because the
  shared accent unification re-scopes the inspector's `--info` token.
- `file-inspector`: Its accessible-and-direction-aware requirement now carries an explicit
  contrast obligation under the unified accent, and its perpetual zip-drop micro-loop is brought
  under the `motion-contract` gating rules.

## Impact

**Files:** `public/index.html`, `public/404.html`, `public/browse.html` (deletion),
`public/assets/css/{tokens,base,components,home,browse,release,performance-modes}.css`,
`public/assets/js/{home,router,theme,idle-timer,browse,file-inspector}.js`,
`docs/STYLEGUIDE.md`, `openspec/config.yaml` unchanged.

**No API, schema, route, or dependency changes.** No new runtime dependency. No build step is
introduced; dynamic `import()` is native.

**Frozen-region conflicts, both requiring explicit sign-off before implementation:**

- `enterprise-ui-redesign` D8/I21 freezes `.hero-max` and every descendant, and
  `home.css` carries a `HERO DRIFT INSULATION` block enforcing it. Retiring that block is the
  single highest-leverage change here and it is a deliberate override of a standing gate.
- `a11y-ux-debt` hard gate J5 requires three files byte-identical to recorded SHA-256 baselines
  and gate J6 requires the hero stylesheet byte-identical. This change deliberately breaks both.

**Coordination:** `enterprise-ui-redesign` (111/128) and `a11y-ux-debt` (feature work complete,
verification pending) should be archived or have their gates amended before this change is
applied, so the two changes are not fighting over the same frozen regions.

**Measurement note:** the review that motivated this proposal was a source audit. Contrast,
layout, and overflow claims are derived from declared token values and from the measured ratios
already quoted in `tokens.css` comments. No live-browser capture was performed. Phase 0 of the
task list re-measures rather than trusting those comments.