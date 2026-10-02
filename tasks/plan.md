# Plan: Super-Smooth Scrolling

1. Vendor Lenis: copy `node_modules/lenis/dist/lenis.min.js` →
   `assets/js/vendor/lenis.min.js` (sequential, first)
2. Create `assets/js/smooth-scroll.js`: Lenis init, reduced-motion + potato
   perf gating, anchor-scroll integration (sequential, after 1)
3. Update `assets/css/base.css`: ensure `scroll-behavior: smooth` on html,
   reduced-motion guard (base.css:285 area) — parallel-safe with 2
4. Wire scripts into `index.html`, `browse.html`, `404.html` (after 1+2)
5. Verify manually: wheel inertia, reduced-motion, potato mode, no console
   errors, no horizontal overflow
