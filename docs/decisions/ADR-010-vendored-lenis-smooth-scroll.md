# ADR-010: Vendored Lenis for smooth scrolling, gated by perf and reduced-motion

## Status
Accepted

## Date
2026-10-03 (commit `03bcfab`, "feat: implement super-smooth scrolling with Lenis integration")

## Context

The enterprise redesign wanted inertial, eased scrolling as a signature feel. Native
scroll is instant and abrupt; a smooth-scroll layer interpolates it.

That is a real intervention, not just a CSS easing. A smooth-scroll library takes over the
scroll position and drives it from a `requestAnimationFrame` loop — which means it runs a
rAF loop continuously for the life of the page. On a low-end device that competes directly
with the aura glows and blur effects already being stripped by ADR-009, and it can make
scrolling *worse* than native rather than better.

Three additional constraints:

- **The CSP is `script-src 'self' 'unsafe-inline'`.** A CDN-loaded library is out. So is any
  library needing runtime `eval`.
- **No build step** (ADR-006), so no npm-import-and-bundle.
- **`prefers-reduced-motion` is a hard accessibility requirement**, not a preference.

## Decision

Vendor `lenis.min.js` into `public/assets/js/vendor/` and load it as a same-origin script. Wrap
all use in `public/assets/js/smooth-scroll.js`, which is the only file that may reference `Lenis`.

Configuration is deliberately minimal: `new Lenis({ lerp: 0.1, smoothWheel: true })`.

**Three independent gates, all required to start** — `start()` returns early unless *every*
condition permits:

1. `prefers-reduced-motion: reduce` is **not** requested
2. `data-perf` on `<html>` is **not** `potato` (ADR-009)
3. `typeof Lenis !== 'undefined'` — degrades to native scrolling if the vendor script is
   missing, rather than throwing

**Two conditions trigger teardown** — `stop()` cancels the rAF frame and calls
`lenis.destroy()`, nulling the instance:

- reduced-motion becomes requested
- `data-perf` becomes `potato`

Because the tier can change after load (ADR-009), both are watched continuously:

- A `MutationObserver` on `document.documentElement`, `attributeFilter: ['data-perf']`
- A `matchMedia('(prefers-reduced-motion: reduce)')` `change` listener

Both call `sync()`, which starts or stops accordingly. The library is never left running
after the device has been judged unable to afford it.

`public/assets/css/lenis.css` carries the upstream-required rules — `html.lenis { height: auto }`,
`overflow: clip` on stopped state, `overscroll-behavior: contain` for
`[data-lenis-prevent]` subtrees, and `transition-behavior: allow-discrete` for the
autoToggle case.

## Alternatives Considered

### CSS `scroll-behavior: smooth`
- Pros: One line, zero JS, no rAF loop, respects nothing else automatically.
- Cons: Only affects programmatic and anchor-link scrolling. Wheel/trackpad scrolling is
  unchanged — it does not deliver the inertia the redesign was after. No control over
  easing feel beyond `ease`/`ease-in-out`.
- Rejected: Does not deliver the intended effect.

### CSS-only scroll-driven animations (`animation-timeline: view()` / `scroll()`)
- Pros: No JS at all; runs off the main thread; declarative.
- Cons: Cannot animate *actual scroll position*, so it gives parallax and reveal effects
  but not inertia. Browser support for smooth fallback behaviour is still uneven.
- Rejected: Different capability. Worth revisiting for scroll-linked effects specifically.

### Bundle Lenis via npm (it *is* in `package.json`)
- Pros: Already declared as a dependency; version-locked; no vendored blob to maintain.
- Cons: **Requires a build step or a server route to serve it** — neither exists
  (ADR-006). `lenis` in `package.json` is currently unused by any server code; the served
  file is the vendored copy under `public/assets/js/vendor/`.
- Rejected: The dependency declaration is aspirational. **If a build step is ever
  introduced (ADR-008, ADR-006), prefer importing from npm over the vendored copy** and
  supersede this ADR.

### Native inertia on macOS / trackpad scrolling
- Pros: Already present on Apple hardware; free.
- Cons: Inconsistent across platforms and absent on touch devices, which is exactly where
  a portal is often used.
- Rejected: Unpredictable feel; the redesign needs a single consistent behaviour.

### No smooth scroll; ship native
- Pros: Simplest; zero risk to low-end devices.
- Cons: Gives up a signature part of the redesign's feel.
- Rejected: Only if the rAF cost proved unacceptable in practice.

## Consequences

- **A vendored blob must be manually updated.** `public/assets/js/vendor/lenis.min.js` is not
  covered by `npm update` and will silently go stale. There is no integrity check on it.
  The npm version in `package.json` is the only signal of what it *should* be — reconcile
  them during dependency updates.
- **The script must load before `smooth-scroll.js`** in both `public/index.html` and
  `public/browse.html`. Load order is a plain `<script>` ordering contract (ADR-006); reversing
  the two silently disables smooth scrolling via gate 3, with no error.
- Gate 3 means a missing vendor file is a graceful degradation, not a crash. Worth
  preserving: do not replace the `typeof Lenis` check with an unguarded reference.
- **`smooth-scroll.js` must remain the only consumer of the `Lenis` global.** Two instances
  would fight over scroll position. The `start()` guard also prevents double-start within
  the module via the `lenis !== null` check.
- **Accessibility compliance depends on the `matchMedia` listener, not just the initial
  read.** Gating only at load would leave a user who enables reduced-motion mid-session
  with Lenis still running. Both the reduced-motion change listener and the
  `data-perf` observer are load-bearing, not defensive extras.
- **Continuous rAF cost is real on capable devices too** — Lenis animates the whole page
  for its lifetime. This is accepted as the price of the effect, bounded by the `POTATO`
  gate. If profiling ever shows it matters, the thresholds are the tuning surface.
- `public/browse.html` loads Lenis but is not routed (see the dead-code note in
  `docs/ARCHITECTURE.md`); verify any change here against the page that is actually served.