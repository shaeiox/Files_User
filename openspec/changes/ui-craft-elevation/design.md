# Design

## Context

The portal is a zero-build vanilla-JS SPA served by a native Node HTTP server (ADR-006). There is no
bundler, no preprocessor, and no framework. CSS layering is achieved solely by `<link>` order, and
that order is load-bearing. That single constraint shapes most of what follows.

Three systems currently read the same cross-cutting state, and this change has to keep all three in
sync:

- `data-theme` on `<html>` drives the two-theme token layer.
- `data-perf` on `<html>` drives tier overrides in `performance-modes.css`, the Lenis lifecycle in
  `smooth-scroll.js`, and the manual override UI.
- `dir` on `<html>` drives a genuinely first-class RTL path built on logical properties.

The relevant current state, beyond what the proposal states:

- The `home.css` hero insulation block pins seven tokens inside `.hero-max`. Its stated purpose is to
  keep the hero rendering identically across a token migration that has since completed.
- `router.js` contains a `navigate()` declared inside `navigate()`. The inner declaration hoists and
  shadows. Nothing calls it, so behaviour is correct today, but it is an editing trap.
- `performance-monitor.js` writes `data-perf` after `DOMContentLoaded`, while `index.html` hardcodes a
  pre-paint default of `medium`.
- Lenis runs a permanent `requestAnimationFrame` loop and owns scroll position, while `base.css` also
  sets `scroll-behavior: smooth` on `html` and `router.js` calls `window.scrollTo` imperatively.

## Goals / Non-Goals

**Goals:**

- One accent, one focus-ring colour, one type treatment per theme, enforced by a rule a reviewer can
  check rather than by taste.
- A motion layer that spends the existing performance budget instead of adding budget.
- A payload that scales with the route rather than with the application.
- An auth surface that behaves as a dialog.
- Zero net increase in runtime dependencies.

**Non-Goals:**

- Not a visual redesign. The Obsidian Kinetic language, the pill control vocabulary, the sticky glass
  nav at 56px, and the resource-card anatomy are all retained. This change fixes coherence and adds
  motion; it does not re-art-direct.
- Not a framework adoption. No build step, no bundler, no animation library. The portal's zero-build
  property is a deliberate ADR, not an accident to be fixed here.
- Not a content-management change. Category descriptions must become real; where they come from
  (dictionary vs. API) is bounded to what already exists.
- Not a density change. `VISUAL_DENSITY` stays at its current value; this change adds whitespace to
  the hero, not to the data surfaces.
- Not a performance-tier redesign. The four-tier system works and is retained as-is.

## Decisions

### D1 — Retire the hero insulation block outright; do not extend it

**Decision.** Delete the `HERO DRIFT INSULATION` block and let the hero resolve the live tokens.

**Rationale.** The block exists to isolate the hero from a token migration. That migration is done
(`enterprise-ui-redesign` is 111 of 128 tasks complete). The block has become load-bearing only for
itself: the only thing genuinely depending on a pinned value is `--text-4`, which `browse.css`
references in six selectors, and the hero pins `--text-4: var(--n-7)`. Once the block goes, that
alias resolves normally and the a11y-ux-debt contrast work already fixed `--text-3`/`--text-4` for
both themes.

**Alternatives considered.** Repointing the block to the new palette is a smaller diff and was the
first option. Rejected: it preserves a mechanism whose only reason to exist has expired, and every
future token change would need a second edit inside it. Keeping the freeze and restyling everything
around it was rejected because the split is the defect, not the hero's palette.

**Gate conflict.** This deliberately breaks `enterprise-ui-redesign` D8/I21 and `a11y-ux-debt` hard
gates J5 and J6. Both changes must be archived or have their gates amended first, or the two will
fight over the same region.

### D2 — Amber is the single accent; blue is a documented second role, not a second accent

**Decision.** The theme accent is amber (`#ffb800` dark, `#8a5a00` light as `--text-accent`). The
primary-action fill keeps the iris blue currently used by `.btn-primary`, the hero search button, and
the sign-in button, declared explicitly as the primary-action role rather than as an accent.

**Rationale.** Retiring blue entirely would mean re-authoring every call-to-action in a colour nobody
has validated against the light theme's surfaces. Two clearly documented roles read as coherent; an
undeclared second hue reads as sloppiness. The fix is documentation plus enforcement, not a repaint.

**Alternatives considered.** A single accent with the CTA in amber was rejected: the amber-as-fill
combination with the dark on-accent text has not been contrast-measured on either theme, and shipping
an unmeasured CTA colour to fix a coherence problem is a bad trade. The current hero gradient
(iris to violet to amber across two words) is removed outright rather than re-tuned; a three-stop
gradient across a short word is decoration, not identity.

### D3 — Keep Cinzel, fix its optical treatment

**Decision.** Retain Cinzel as the hero display face. Remove the negative tracking and the sub-1.0
leading. Give it tracking and leading that suit an inscriptional face.

**Rationale.** Cinzel is a defensible monumental register for an infrastructure vendor, and swapping
the face is a bigger and more subjective change than fixing the parameters that are actively fighting
it. At `-0.045em` and `0.98` the face reads as a loose sans; that is a bug, not a style.

**Alternatives considered.** Replacing with a grotesque was rejected as scope creep: it changes brand
voice, and the diagnosis does not require it.

### D4 — Motion uses four native primitives; no new dependency

**Decision.** The entire motion layer is built from `IntersectionObserver`, FLIP (measure, reorder,
invert `transform`, play), the View Transitions API with a fallback, and CSS `animation-delay`
cascades. No animation library.

**Rationale.** The portal already depends on Lenis, a smooth-scroll library that is not an animation
framework. Adding Motion or GSAP would be a new runtime dependency for effects that are a few dozen
lines of native code, in a codebase whose defining property is having no build step. Every primitive
chosen is compositor-only and needs no polyfill.

**Alternatives considered.** GSAP ScrollTrigger was rejected: 70KB for effects achievable natively,
and it would need to be loaded on every route to animate one. Motion (formerly Framer Motion) was
rejected for the same reason plus its React assumption.

**Technique assignment:**

| Effect | Primitive | Reduced-motion | Potato tier |
|---|---|---|---|
| Section reveal on scroll | `IntersectionObserver`, once | no offset, instant | not registered |
| Filter/sort reorder | FLIP | no offset, instant | not registered |
| Grid/list toggle | CSS cross-fade | opacity only | reduced duration |
| Route change | View Transitions | instant swap | instant swap |
| Hero entrance | `animation-delay` cascade | not registered | not registered |
| Search results | stagger, capped at 10 rows | opacity only | reduced duration |
| Nav condense | Lenis scroll event | no transform | no transform |

**Note on scroll listeners.** `window.addEventListener('scroll')` is currently absent and must stay
absent. Nav condense reads Lenis's own scroll emitter, not the window.

### D5 — Reveal motion is `IntersectionObserver`, not scroll-driven CSS

**Decision.** Use `IntersectionObserver` for section entry, not CSS `animation-timeline: view()`.

**Rationale.** `animation-timeline` has uneven baseline support, cannot be gated by `data-perf`
without duplicating the animation under a tier selector, and gives no hook for the
`once: true` semantics the reveal wants. The observer gives all three cheaply and costs one observer
per section, all disconnected on route teardown.

**Alternatives considered.** `animation-timeline` was rejected for the gating problem specifically:
making it tier-aware means the same keyframes declared twice, which is exactly the drift this change
is removing elsewhere. A scroll-position-to-progress library was rejected as redundant with Lenis.

### D6 — Payload splitting uses native dynamic `import()`, not a bundler

**Decision.** Convert the route modules to dynamic `import()` in `router.js`, and gate the
browse-only and release-only stylesheets behind their routes.

**Rationale.** `import()` is native, needs no build step, and works with the existing
`defer`-loaded script topology. `/` currently fetches `browse.js`, `bulk-download.js`,
`file-inspector.js`, and `releases.js` for a visitor who will never execute a line of them.

**Constraint that shapes this.** The route modules share globals at load time: `router.js`
references `HomePage`, `BrowsePage`, and `ReleasePage` by bare identifier inside `navigate()`, and
`home.js` calls `bindDownloadInterception` which is defined in `file-actions.js`. Dynamic import
makes those references asynchronous, so bare-identifier references become `undefined` at call time.
The module boundary must be fixed before, or during, the split. This is the highest-risk part of the
change and is sequenced first within its phase.

**Alternatives considered.** A bundler was rejected outright: it would invalidate ADR-006 and the
entire six-stylesheet link-order model. Conditional `<link>` injection per route was rejected for the
stylesheets because it reintroduces a render-blocking flash on first navigation. Trimming dead weight
inside the modules was accepted as a complement, not a substitute, because 113 KB of unused modules
is the larger win.

### D7 — The route transition keys off render completion, not a timer

**Decision.** Replace the `setTimeout(150)` with the View Transitions API, which resolves when the new
DOM is committed, and fall back to the current fade where unsupported.

**Rationale.** The current 150ms timer starts the same duration from page load on every device. On a
slow device the incoming view fades in while still empty and the content pops in afterwards. The
native primitive resolves at commit, which is the correct signal and requires no timing guess.

**Alternatives considered.** Replacing the timer with a promise resolved after render was viable and
portable, but re-implements the primitive badly. Keeping the timer and lengthening it was rejected:
it does not fix the underlying signal problem.

### D8 — `data-perf` defaults to `high`, never upgrades after paint

**Decision.** Change the pre-paint default in `index.html` from `medium` to `high`, the no-op tier.

**Rationale.** `performance-modes.css` has no `high` rules, so `high` is the unstyled baseline. Today
the page paints as `medium` and then upgrades to `high` on capable devices, which changes aura blur
radii and opacities after first paint: a visible reflow-adjacent flash. Defaulting to `high` means
auto-detection can only ever reduce cost, never add it, so there is no post-paint upgrade to flash.

**Trade-off.** Capable devices briefly get full-cost rendering before the tier resolves. That window
is one `DOMContentLoaded`, and the alternative is a flash on every load.

### D9 — One dropdown mechanism: JS-toggled class

**Decision.** Convert the language menu from CSS `:hover`/`:focus-within` to the same JS-toggled `.show`
class the performance menu already uses, driven by real `aria-expanded`.

**Rationale.** Hover-only menus are unreachable by touch and unreliable by keyboard, and the navbar
currently runs two different mechanisms side by side. Consolidating on the mechanism that already
works removes a class of bug rather than adding a fix.

**Preserved detail.** The 8px hover bridge on `.lang-dropdown-wrap::after` must survive, because
`:focus-within` no longer holds focus across the gap but the hit region still needs to be continuous.

### D10 — Auth dialog: adopt the platform dialog pattern, no library

**Decision.** Add `role="dialog"`, `aria-modal`, `aria-labelledby`, a focus trap, Escape-to-close, and
focus restoration to the existing `home.js` modal. No `<dialog>` element migration, no focus-trap
library.

**Rationale.** `<dialog>` gives the top layer, the backdrop, Escape, and the inert background for
free, and `showModal()` handles the focus trap. It is well supported. But migrating means reworking
the open/close timing the codebase already depends on: a 250ms close delay before removal, and the
250ms transform transition on the panel. Additive ARIA plus a small trap preserves both.

**Alternatives considered.** `<dialog>` + `showModal()` was the front-runner and is the better long-run
answer; it was rejected here only because the close-delay contract is referenced by existing
behaviour and is not part of this change's scope. Worth revisiting once the close delay is
independently specified.

### D11 — Download progress uses the existing request path, not a new transport

**Decision.** Replace `link.innerHTML = "Checking..."` plus native `alert()` with the portal's existing
in-place error surface, and report transfer progress on the control that initiated it.

**Rationale.** `bulk-download` already requires that multi-file download "SHALL report progress", so
the pattern and its acceptance criteria exist. The single-file path should not diverge from it. The
hardcoded Persian `alert()` is a defect on its own: it bypasses the i18n dictionary and blocks the
main thread with an unstyleable dialog.

**Deferred honestly.** True byte-level progress for a multi-gigabyte download needs a streaming or
upload-progress transport. That is a transport change with its own failure modes and is called out
as an open question rather than smuggled into this change.

### D12 — Dead code removal is bundled with the phase that touches its file

**Decision.** Remove the dead keyframe, the `.hero-cloud-wrap` rules, the `.aura-vignette` rule, the
`.wiping` overrides, the duplicate `--a-*` ramp, the redundant height declarations, and the unrouted
`browse.html` in the same phase that edits the containing file.

**Rationale.** Each is a dead reference that will mislead the next reader, and each sits in a file
this change already opens. Bundling avoids a separate cleanup commit and avoids leaving a stale
reference to a machine this change just removed.

**Exception.** The 25 `transition: all` declarations are replaced with explicit property lists in the
motion phase, not in bulk, because the correct property list per rule requires knowing which properties
that rule actually changes.

### D13 — `browse.html` is deleted, not repaired

**Decision.** Delete `public/browse.html`.

**Rationale.** It is unrouted, it loads a reduced stylesheet set that omits `performance-modes.css`
entirely, and it references `logo.png` where only `logo.webp` exists. It renders broken. Repairing an
unrouted page that renders broken is work with no beneficiary.

**Risk if the deletion is wrong:** if some deployment serves it directly, it is already broken there.
Verified against `ARCHITECTURE.md` before deleting.

## Risks / Trade-offs

**[The hero freeze gates break under this change]** → Both `enterprise-ui-redesign` (D8/I21) and
`a11y-ux-debt` (gates J5, J6) encode the freeze as a hard gate. Archive or amend both before applying.
If they cannot be archived in time, this change must not be applied against them, because the gates
will fail and there is no correct resolution that satisfies both.

**[Dynamic import breaks bare-identifier route references]** → `router.js` calls `HomePage`,
`BrowsePage`, and `ReleasePage` as bare globals, and `home.js` depends on `file-actions.js` being
loaded first. Convert these to explicit module handles before the split lands. Sequence the split in
its own phase with no other change mixed in, so a break is unambiguous.

**[Accent unification changes contrast on surfaces nobody re-measured]** → `--info` cyan is being
retired as an accent role, and browse and inspector text sits on it. `file-inspector` gained an
explicit contrast scenario for exactly this. Re-measure rather than trusting the ratios quoted in
`tokens.css` comments; per D2 of the review those comments describe the value that is there now, not
the value about to be written.

**[FLIP is measurably expensive on a large grid]** → FLIP reads layout on every filter change. The
grid is small today, but a directory with hundreds of entries would make this a per-frame cost.
Gate the offset animation to `medium` and above, and check frame timing against the real maximum
category size before shipping.

**[`document.startViewTransition` is not universally supported]** → Feature-detect and fall back to
the current fade. Do not polyfill. A missing transition must never mean a failed navigation, which is
why `routing` specifies the fallback as a plain immediate change rather than an error.

**[The reduced-motion global override is a blunt instrument]** → `base.css` sets
`animation-duration: 0.01ms !important` on `*`. It currently catches every CSS animation
automatically, which is why the new effects need no separate reduced-motion branch for the CSS half.
It will also silently kill any future *functional* animation. Noted as a known ceiling rather than
fixed here: replacing it means auditing every animation in the portal, which is a separate change.

**[Reducing `.page` max-width is a visible regression on ultra-wide displays]** → 1720px down to
roughly 1400px is a real change for a visitor on a 2560px monitor. Accepted: the current width is what
produces the hero void, and the content does not benefit from the extra space.

**[`ui-craft-elevation` covers six phases in one change]** → Accepted at the user's direction. The
internal phase ordering exists precisely because the work is not independent: identity must land
before motion is authored against it, and motion must land before composition is judged. If the
phases need independent review or independent rollback, split them at the phase boundaries; the spec
capabilities are already drawn along those seams.

## Migration Plan

1. **Preflight.** Confirm `enterprise-ui-redesign` and `a11y-ux-debt` are archived or have their
   freeze gates amended. Re-measure the hero headline and the focus-ring colours in both themes before
   writing any replacement value. This is the gate on the whole change.
2. **Phase 0, correctness.** Nine defect fixes. No visual change. Independently revertible.
3. **Phase 1, identity.** Retire the insulation block, unify the accent and the focus ring, fix the
   Cinzel parameters, add `unicode-range`, remove dead code. Re-measure and update the quoted ratios in
   `tokens.css`. Independently revertible.
4. **Phase 2, motion.** Motion-contract compliance first (`transition: all`, nav condense), then
   reveals, then route transitions. Each effect ships with its reduced-motion branch and its potato
   override in the same change.
5. **Phase 3, composition.** Hero void, container width, featured band, tiered grid.
6. **Phase 4, payload.** Module-boundary fix, then dynamic import, then route-scoped stylesheets.
7. **Phase 5, accessibility closure.** Auth dialog, dropdown consolidation, download feedback.

**Rollback.** Phases 0, 1, 3, and 5 are CSS-and-markup changes that revert by file. Phase 2 reverts
by removing the added rules. Phase 4 is the only one with a behavioural failure mode: if the split
breaks a route, revert that phase alone. No phase touches the API, the data layer, or authentication
logic, so no rollback requires a data migration.

## Open Questions

- **Which source supplies per-category descriptions?** Phase 0 fixes the scoping bug, which makes the
  grid correct-by-omission immediately. But populating real descriptions needs a source. The i18n
  dictionary can key them by category id; the resource API would be more durable if categories gain
  metadata later. This does not change any spec or the task breakdown, because either source satisfies
  `home-page` as written. Decide when implementing Phase 0.
- **Should the performance tier selector leave the navbar entirely, or just be relabelled?** The spec
  requires it not sit among the primary destinations and requires production-audience labels; both
  are satisfied by moving it to a secondary surface, by hiding it behind a settings affordance, or by
  a combination. Which one is a product decision, not a technical one.
- **How much of the download-progress affordance ships in Phase 5?** `home-page` specifies that an
  in-progress state exists and that failure is reported in place, which a determinate progress bar
  satisfies. Whether to go further to true byte-level progress via a streaming transport is a
  follow-up with its own spec surface.