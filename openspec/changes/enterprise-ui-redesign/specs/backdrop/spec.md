# Capability: Backdrop

## Purpose

The application already renders an ambient backdrop from five existing elements — `.aura-backdrop` wrapping
`.aura-base`, `.aura-glow-1`, and `.aura-glow-2` — plus a `.aura-vignette` rule with no matching element.
`template/new-home.html` proposes an animated WebGL shader canvas instead. This capability rejects that
technology outright and restyles the existing CSS layers to evoke the Obsidian Kinetic feel using only
gradients and an optional blur, while preserving the backdrop's stacking position, its non-interactive
nature, and its role as the first layer beneath `.page`.

## ADDED Requirements

### Requirement: The backdrop is CSS-only with no new technology

The backdrop SHALL be produced entirely by CSS applied to the existing elements. No WebGL context, no
`<canvas>` element, no `requestAnimationFrame` loop, no `ResizeObserver`, and no `mousemove` listener SHALL be
introduced, and no JavaScript file SHALL be created or modified to produce it. The Obsidian Kinetic feel
SHALL be achieved with radial-gradient washes, a base vertical gradient, a peripheral vignette, and an
optional `backdrop-filter`.

#### Scenario: No forbidden rendering technology exists

- **GIVEN** the redesign is complete
- **WHEN** the whole `assets/` tree and `index.html` are searched for `canvas`, `webgl`, `getContext`,
  `requestAnimationFrame`, `ResizeObserver`, `mousemove`, and `shader`
- **THEN** no match is found in any stylesheet, script, or markup file

#### Scenario: No new JavaScript is added for the backdrop

- **GIVEN** the backdrop is produced by CSS alone
- **WHEN** `git diff` is scoped to `assets/js/**` for the backdrop's phases
- **THEN** the diff is empty

#### Scenario: The Stitch shader is not adopted

- **GIVEN** the Stitch reference contains an animated fragment-shader canvas with a continuous render loop
  and a mouse-follow beacon
- **WHEN** the shipped implementation is inspected
- **THEN** no canvas-based backdrop exists and no continuous animation loop is running for the backdrop

### Requirement: No new element is added and `.aura-vignette` is left alone

The backdrop SHALL continue to be produced by the five existing selectors. No element SHALL be added to
`index.html` to support the backdrop. `.aura-vignette` and its `display: none` rule SHALL be left untouched,
because no matching element exists in the codebase and adding one would be markup scope creep.

#### Scenario: `index.html` gains no backdrop element

- **GIVEN** the backdrop is produced by existing elements only
- **WHEN** the diff of `index.html` for this capability is inspected
- **THEN** no element is added, removed, or reordered inside `.aura-backdrop`

#### Scenario: `.aura-vignette` is unchanged

- **GIVEN** `.aura-vignette` has a `display: none` rule and no matching element
- **WHEN** the rule is inspected after the change
- **THEN** the rule is byte-identical to its pre-change state

#### Scenario: The five existing selectors remain the only backdrop selectors

- **GIVEN** the backdrop layers are `.aura-backdrop`, `.aura-base`, `.aura-glow-1`, `.aura-glow-2`, and the
  unused `.aura-vignette`
- **WHEN** the backdrop rules are enumerated after the change
- **THEN** each of the five is still declared and no new backdrop-specific selector has been introduced

### Requirement: Stacking position and non-interactivity are preserved

`.aura-backdrop` is declared twice — once in `base.css` and once, later and at equal specificity, in
`home.css`. The restyle SHALL preserve the **resolved** outcome of both declarations: `position: fixed`,
viewport-filling coverage, `overflow: hidden`, `pointer-events: none`, and `z-index: -1`. The backdrop SHALL
NOT be raised above `--z-base`, because `.page` at `z-index: 1` is what visually separates the backdrop from
content.

#### Scenario: The resolved stacking outcome is unchanged

- **GIVEN** the two competing `.aura-backdrop` declarations and their cascade order
- **WHEN** the post-change rules are evaluated in document order
- **THEN** the resolved `position` is `fixed`, the element fills the viewport, `overflow` is `hidden`,
  `pointer-events` is `none`, and the effective `z-index` is `-1`

#### Scenario: The backdrop never intercepts a pointer

- **GIVEN** the backdrop fills the viewport behind the content
- **WHEN** a pointer is pressed over an area where no content control exists
- **THEN** the press falls through to whatever lies beneath, confirming `pointer-events: none` is in effect

#### Scenario: Content still paints above the backdrop

- **GIVEN** `.page` sits at `z-index: 1`
- **WHEN** the page renders
- **THEN** all content paints above the backdrop, and the backdrop is not raised above `--z-base`

#### Scenario: The backdrop follows the viewport, not the scroll

- **GIVEN** the backdrop is `position: fixed`
- **WHEN** the page is scrolled
- **THEN** the backdrop stays anchored to the viewport while content moves over it

### Requirement: Obsidian Kinetic appearance is achieved with tokens

The backdrop's colours SHALL be drawn from the D4 surface ramp, with the two orb washes tinted by the D4
`derive` glow tokens and the vignette darkening the periphery. No colour outside D4 SHALL be introduced, and
the orb positions SHALL be static — no animation of their positions.

#### Scenario: All backdrop colours resolve to D4 tokens

- **GIVEN** the restyled backdrop declarations
- **WHEN** each colour value is extracted
- **THEN** every value resolves to a D4 token or to a `derive` glow token, with no literal colour outside the
  palette

#### Scenario: The deepest tone is the lowest surface container

- **GIVEN** D4 defines `--surface-container-lowest` as the deepest surface
- **WHEN** the base wash is inspected
- **THEN** it resolves through `--surface-container-lowest`

#### Scenario: Both orb tints are present

- **GIVEN** the Obsidian Kinetic look pairs an amber wash with an indigo wash
- **WHEN** `.aura-glow-1` and `.aura-glow-2` are inspected
- **THEN** one resolves through `--glow-amber` and the other through `--glow-indigo`

#### Scenario: No D3-banned claim appears in the backdrop

- **GIVEN** D3 bans fabricated trust and infrastructure claims from shipping
- **WHEN** the backdrop rules and any generated content are searched
- **THEN** none of `SOC 2`, `ISO/IEC 27001`, `HIPAA`, `Tier-1 Infrastructure Carrier`,
  `Cryptographically Verified Release Mirrors`, `v4.8`, or `8 Packages` appears

### Requirement: Every backdrop effect is gated by performance tier

Every backdrop rule that uses `backdrop-filter`, `blur`, `filter`, `animation`, or `transition` SHALL have a
matching override in `performance-modes.css` under **both** the `low` and `potato` tiers. At those tiers the
orbs SHALL collapse to a single static gradient and `backdrop-filter` SHALL be removed entirely.

#### Scenario: Every effect-bearing backdrop selector has a low-tier override

- **GIVEN** the enumeration of backdrop selectors using blur, filter, animation, or transition
- **WHEN** `performance-modes.css` is searched under `[data-perf="low"]`
- **THEN** every enumerated selector appears with an override

#### Scenario: Every effect-bearing backdrop selector has a potato-tier override

- **GIVEN** the same enumeration
- **WHEN** `performance-modes.css` is searched under `[data-perf="potato"]`
- **THEN** every enumerated selector appears with an override

#### Scenario: Low tier removes the blur entirely

- **GIVEN** `data-perf="low"` is set on `<html>`
- **WHEN** the computed `backdrop-filter` of `.aura-base` is inspected
- **THEN** it is `none`

#### Scenario: Potato tier collapses to a single gradient

- **GIVEN** `data-perf="potato"` is set on `<html>`
- **WHEN** the rendered backdrop is inspected
- **THEN** it is a single static gradient with both orb layers suppressed

#### Scenario: Reduced motion forces the low tier

- **GIVEN** the inline head script forces `data-perf="low"` when `prefers-reduced-motion: reduce` matches
- **WHEN** the operating system requests reduced motion
- **THEN** the backdrop renders in its low-tier form without any separate media query being required

### Requirement: No animation is introduced without a motion guard

Any animation or transition added to the backdrop SHALL be wrapped in a `prefers-reduced-motion: reduce` guard
in addition to its tier overrides, so users who request reduced motion never see it regardless of the tier
the inline script selected.

#### Scenario: Every new animation has a reduced-motion guard

- **GIVEN** the backdrop rules introduced by this change
- **WHEN** each `animation` or `transition` declaration is located
- **THEN** a `prefers-reduced-motion: reduce` block neutralises it

#### Scenario: No backdrop animation runs in the low tier

- **GIVEN** `data-perf="low"` is set
- **WHEN** the backdrop is observed over time
- **THEN** nothing moves

### Requirement: The backdrop renders correctly across breakpoints and directions

The restyled backdrop SHALL render at all six existing breakpoints — `min-width: 1440px`,
`max-width: 1024px`, `max-width: 900px`, `max-width: 768px`, `max-width: 640px`, `max-width: 480px` — and in
both themes and both text directions, without introducing a new breakpoint.

#### Scenario: All six breakpoints render

- **GIVEN** the six existing responsive breakpoints
- **WHEN** the page is loaded at each width
- **THEN** the backdrop fills the viewport at every width, with no gap, no seam, and no horizontal overflow

#### Scenario: Both themes render

- **GIVEN** `data-theme="dark"` and `data-theme="light"`
- **WHEN** the page is rendered in each
- **THEN** the backdrop is visible and does not reduce content contrast below the pre-change baseline

#### Scenario: No new breakpoint is introduced

- **GIVEN** the existing set of breakpoint values
- **WHEN** all `@media` conditions are extracted from the touched stylesheets
- **THEN** no new width value beyond the six existing ones is added

### Requirement: Backdrop restyling does not disturb the hero overhang

`.hero-visual` and `.logo-shader` are positioned to deliberately overhang their containers and rely on
visible overflow. The restyle SHALL NOT add `overflow: hidden` to `.page` or `#app`, and SHALL NOT clip the
hero's overhang, because the existing clipping and sticky behaviour depends on those elements remaining
unclipped.

#### Scenario: `.page` and `#app` gain no overflow

- **GIVEN** `body { overflow-x: hidden }` propagates to the viewport, leaving `body` itself unclipped
- **WHEN** `.page` and `#app` are inspected after the backdrop restyle
- **THEN** neither declares any `overflow` value

#### Scenario: The hero logo overhang is not clipped

- **GIVEN** the hero visual element extends beyond its container by design
- **WHEN** the page renders
- **THEN** the overhang is fully visible, confirming no clipping ancestor was introduced

#### Scenario: The sticky navbar is unaffected

- **GIVEN** `.nav` is `position: sticky` at `top: 12px` against the root scroller
- **WHEN** the page is scrolled with the restyled backdrop present
- **THEN** the navbar remains visible and stuck, confirming the backdrop introduced no new scroll container