# ADR-006: Vanilla JS SPA with no build step

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

The frontend is two routes — a home/category view and a browse/file view — sharing a
header, footer, search, theme toggle, and language switcher.

The common instinct is a component framework plus a bundler. Against that, the actual
complexity is small, and several constraints argue for shipping source directly:

- **Two routes is not an application.** The routing problem is `location.pathname` mapped
  to one of two render functions.
- **No build step means no build failures.** There is no compile/bundle/deploy split, so
  there is no class of bug that only appears in the built artifact.
- The CSP is `script-src 'self' 'unsafe-inline'`. A bundler would need a nonce or hash
  strategy for injected runtime code; shipping plain scripts needs none.
- Debugging is `view-source` — the file the browser runs is the file in the repository.

The cost of this decision is real: no type checking, no component reuse, and global
script scope.

## Decision

Plain ES5-compatible scripts in `public/assets/js/`, each an IIFE that attaches a single global to
`window`. No bundler, no transpiler, no framework, no `node_modules` on the client.

Module shape:

```javascript
const BrowsePage = (function () {
    'use strict';
    // ... private implementation
    return { render };   // the module's entire public surface
})();
```

**Script loading contract.** Scripts are declared in `public/index.html` in dependency order.
Modules other than `banner.js` and `idle-timer.js` carry `defer`, which preserves execution
order while allowing parallel download. `router.js` loads **last** because it drives
navigation and assumes every page module is already registered.

## Alternatives Considered

### React / Vue / Svelte
- Pros: Component model, reactive updates, ecosystem.
- Cons: Requires a build step, or an in-browser toolchain via CDN — which the CSP blocks
  unless `unsafe-eval` is opened. For two routes this is a large tax.
- Rejected: Disproportionate to the actual UI complexity.

### Alpine.js / htmx / petite-vue (no build, CDN script)
- Pros: Declarative markup with no build step; genuinely close to the "ship source"
  property being optimised for.
- Cons: Adds `unsafe-eval` pressure or an external origin to the CSP, and introduces
  framework idioms into markup that must then be unlearned when leaving.
- Rejected: The CSP and the "no third-party runtime" goal outweigh the ergonomics.

### ES modules (`<script type="module">`)
- Pros: Native, real scoping, `import`/`export`, browser-managed dependency order.
- Cons: `type="module"` implies strict mode and deferred execution for *every* file, which
  conflicts with `banner.js` needing to run early and with `public/assets/js/idle-timer.js` currently
  loading as a classic script. It also makes top-level `await` and deep relative-import
  paths a live footgun under a flat directory structure.
- Rejected: The migration cost to restructure every global reference exceeded the benefit.
  **This is the most likely ADR to be revisited** — if the module count grows well past a
  dozen, native ESM removes the global-scope problem without a build step.

### TypeScript
- Pros: Type safety across the API boundary, where mistakes are most costly.
- Cons: Requires a compile step; type annotations at runtime need stripping.
- Rejected: For now. See the "Revisit when" note below.

## Consequences

- **Globals are the coupling mechanism.** Modules coordinate by reference to each other's
  globals, and there is no mechanism that enforces those references. A renamed global is a
  runtime `ReferenceError`, not a build error. Search for the old name before renaming.
- **`public/index.html` is load-bearing.** Adding a module means adding a `<script>` tag in the
  right position. Forgetting it fails silently — the module is simply undefined. This is
  the most common way to break the frontend.
- No unit-test story for the frontend, because there is no module system to test against
  without a DOM harness. Frontend correctness is verified manually; see
  `docs/DEVELOPMENT.md`.
- No minification, so full source is shipped to the browser. Acceptable on a
  same-origin, cacheable deployment (nginx sets 30-day immutable caching on `.css`/`.js`).
- **Revisit this ADR if** the frontend passes roughly a dozen modules, or if API response
  shapes start drifting from `public/assets/js/services/resource-service.js` expectations. Either
  event makes the lack of static checking the dominant cost, and native ESM plus a
  lightweight type-check-only step would address it without a bundler.