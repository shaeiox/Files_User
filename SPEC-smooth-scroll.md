# Spec: Super-Smooth Scrolling (site-wide)

## Objective
Make main-page scrolling feel smooth and inertial across the whole application
(`index.html` SPA shell, `browse.html`, `404.html`). Two layers:
1. CSS `scroll-behavior: smooth` applied consistently for programmatic/anchor
   scrolls.
2. Lenis (npm package `lenis`) driving the window scroll for inertial wheel/touch
   scrolling.

Nested scroll containers (autocomplete `.ac-list`, menus, modals, file lists)
keep native scrolling — Lenis wraps the main window scroller only.

## Tech Stack
- Vanilla JS + CSS, no build step (existing setup: Node stdlib server, static HTML)
- New dependency: `lenis` (npm), dist bundle copied to `assets/js/vendor/lenis.min.js`

## Commands
- Install: `npm install lenis`
- Dev: `npm start` (or `node server.js`)
- No test/lint scripts exist yet; verify manually in browser

## Project Structure (changes)
```
assets/js/vendor/lenis.min.js   → vendored Lenis bundle (new)
assets/js/smooth-scroll.js      → Lenis init + perf/reduced-motion gating (new)
assets/css/base.css             → scroll-behavior rules + reduced-motion guard (edit)
index.html, browse.html, 404.html → include lenis.min.js + smooth-scroll.js (edit)
package.json                    → add lenis dependency
```

## Code Style
Match existing patterns: plain script files, `defer` on script tags, IIFE or
top-level `'use strict'`, CSS variables from `tokens.css`.

Example (`assets/js/smooth-scroll.js`):
```js
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function perfAllows() {
    var p = document.documentElement.getAttribute('data-perf');
    return p !== 'potato' && p !== 'low';
  }
  if (reduceMotion || !perfAllows() || typeof Lenis === 'undefined') return;
  var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
})();
```

## Testing Strategy
- Manual browser verification (no automated test runner exists):
  - Wheel scroll on home + browse pages feels inertial, no jitter
  - Anchor jumps / programmatic `scrollTo` animate smoothly
  - `prefers-reduced-motion: reduce` → instant scroll, Lenis off
  - `[data-perf="potato"]` → Lenis off, native scroll
  - Nested containers (autocomplete dropdown, modal) scroll natively
  - No console errors; page still works if Lenis script fails to load

## Boundaries
- Always: keep native scroll as graceful fallback; respect reduced-motion;
  verify no horizontal scrollbar regression (see home.css overflow notes)
- Ask first: adding more JS animation libraries, touching router/idle-timer
  interaction
- Never: commit node_modules; break the SPA without-Lenis path; disable
  reduced-motion behavior

## Success Criteria
- [ ] `npm ls lenis` succeeds and `assets/js/vendor/lenis.min.js` exists
- [ ] Wheel scrolling on index/browse/404 is visibly inertial (Lenis active)
- [ ] Anchor/programmatic scrolls animate via `scroll-behavior: smooth`
- [ ] With reduced-motion or potato perf mode, scrolling is instant and native
- [ ] Inner scroll containers unaffected
- [ ] No console errors, no new horizontal overflow

## Open Questions
- RESOLVED: Lenis stays on for `data-perf="low"`, disabled only for `"potato"`.
  `data-perf` changes at runtime are observed via MutationObserver and Lenis is
  stopped/started accordingly.
