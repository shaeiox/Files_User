# ADR-009: Runtime performance tiers gate visual effects

## Status
Accepted

## Date
2026-10-02 (Obsidian Kinetic enterprise UI redesign)

## Context

The design system is deliberately heavy on motion and compositing: blurred glass surfaces,
multi-layer ambient "aura" glows, a shader-driven logo, drifting hero clouds, and
spring-eased transitions. These are the product's visual identity and they are also exactly
the effects that make a low-end device — or a constrained phone on a bad connection — feel
broken.

The tension: effects must be **removed automatically on the devices that cannot afford
them**, without the user having to know a "performance mode" exists, and without
regressing the design on capable hardware.

## Decision

Detect device capability and measured frame rate at runtime in
`assets/js/services/performance-monitor.js`, classify the device into one of four tiers,
and publish the result as a `data-perf` attribute on `<html>`. CSS reads that attribute;
JavaScript reads it too.

**The four tiers**, in `TIERS` order:

| Tier | Meaning |
|------|---------|
| `HIGH` | Full effects |
| `MEDIUM` | Reduced effects |
| `LOW` | Effects disabled |
| `POTATO` | Minimal — animation off entirely |

**Classification inputs:**

- Measured FPS from a frame-timing loop
- `navigator.connection.effectiveType` — `slow-2g` and `2g` force `POTATO`
- `navigator.hardwareConcurrency` — small core count implies a low-end device
- Touch capability + screen size — small touch devices are treated conservatively
- Battery status via the Battery API — low battery forces `LOW`
- The result is clamped into the `TIERS` array bounds, so an out-of-range classification
  can never produce an undefined tier

**Runtime adaptation.** A hysteresis mechanism prevents oscillation between adjacent
tiers: `DOWNGRADE_THRESHOLD: 3` consecutive low-FPS samples are required to step down,
`UPGRADE_THRESHOLD: 5` consecutive high-FPS samples to step up. Asymmetric on purpose —
degrading quickly is user-visible in a good way, recovering slowly is invisible.

**Consumption.** `assets/css/performance-modes.css` (790 lines) overrides by
`[data-perf="..."]`: aura glows, `backdrop-filter` blur, the logo shader, hero clouds, and
dropdown transitions are progressively stripped. `assets/css/components.css` also carries
targeted overrides for footer and dropdown costs.

**Second consumer, and the important one:** `assets/js/smooth-scroll.js` reads the same
attribute and disables smooth scrolling entirely at `POTATO` — see ADR-010.

**A user-facing manual override exists.** Performance mode can be selected explicitly from
the UI (`data-perf-val` attributes), and that choice is reflected in `data-perf`.

## Alternatives Considered

### Respect `prefers-reduced-motion` only
- Pros: Standard, accessible, zero JS. Also already implemented — Lenis gating uses it.
- Cons: It expresses *accessibility preference*, not *device capability*. A user with no
  motion sensitivity on a slow phone still gets the full effect load. It solves the wrong
  problem.
- Rejected: Necessary but insufficient. It is retained as an **additional** gate (ADR-010).

### `@media (prefers-reduced-transparency)`, hover, and pointer queries
- Pros: Pure CSS, no JS.
- Cons: Fragile, indirect proxies for device capability, and cannot express a measured FPS
  threshold. A CSS-only solution also cannot stop JS-driven work like Lenis's rAF loop.
- Rejected: Cannot reach measured performance, and cannot gate JavaScript behaviour.

### Ship the light-weight experience to everyone
- Pros: Simplest. One experience, no detection logic.
- Cons: Abandons the visual identity on hardware that can render it. The design system is
  the product's differentiation; a permanently degraded portal is a worse outcome than the
  complexity.
- Rejected: The redesign's stated goal is the rich experience, adaptively granted.

### User-selectable performance mode only (no detection)
- Pros: No detection heuristics to get wrong; user is in control.
- Cons: Users under pressure do not diagnose their own frame rate. They see jank and
  conclude the site is broken. The setting exists as a manual override here, but not as the
  primary mechanism.
- Rejected: Kept as a complement, not a replacement.

### Build-time / UA-string branching
- Pros: No runtime cost; server or build could pick a variant.
- Cons: UA strings are unreliable and increasingly frozen; no build step exists (ADR-006);
  and no runtime capability data.
- Rejected: Stale signal, wrong architecture.

## Consequences

- **`data-perf` on `<html>` is a cross-cutting contract.** Three independent systems consume
  it: `performance-modes.css`, `smooth-scroll.js`, and the manual override UI. Changing its
  name or values is a breaking change across all three, and it is set from more than one
  code path (`performance-monitor.js` at two call sites).
- **Visual regressions are invisible in local development.** A developer on a fast laptop
  always sees `HIGH`. Every effect change must be checked at `LOW` and `POTATO` — set the
  attribute manually in devtools (`document.documentElement.setAttribute('data-perf',
  'potato')`) rather than assuming the default path is representative.
- **790 lines of override CSS is a maintenance liability.** `performance-modes.css` is
  larger than most of the application's logic. It is ordered by tier and must be updated
  whenever a new expensive effect is introduced; a new effect with no `POTATO` override
  defeats the entire mechanism on exactly the devices it was built for.
- **The heuristics are judgement calls.** `hardwareConcurrency` and screen-size thresholds
  are not derived from measurement. Devices will be misclassified in both directions. The
  hysteresis limits the cost of being wrong and the manual override covers the rest.
- Classification is **per-device, not per-user**, and is recomputed live — so the same
  browser can change tier as the network degrades. This is intended.
- Because the tier can change at any moment after load, `smooth-scroll.js` registers a
  `MutationObserver` on `data-perf` and a `matchMedia` change listener to start and stop
  Lenis in response (ADR-010). Any new JS behaviour gated on performance must follow the
  same pattern rather than reading the attribute once.