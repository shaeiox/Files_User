# ADR-014: Hero "Noir Prism" palette exception

## Status
Accepted (hero redesign request, 2026-10-18).

## Root cause
The hero read as a flat gold box: tokens.css D2 allowed exactly two hue
roles product-wide, and home.css painted every hero layer (beam, sunburst,
pill, shader, hover) from the single amber `rgba(255,184,0,…)` family at
8px radius (`--radius-panels`), with the logo as a 0.48-opacity watermark.
No second hue, no depth cue other than blur, no proof content. Repetition
of one hue at one strength is what made it forgettable — not the gold itself.

## Decision
- Gold stays as heritage **champagne** (`--color-champagne`, desaturated),
  joined by decorative-only **iris** and **glacier** (plus a rose veil in
  gradients) as *light fields* inside the hero only.
- The hero ground becomes a token pair: noir prism (dark theme) /
  porcelain prism (light theme) via `--hero-ground`, `--hero-text`,
  `--hero-text-2`, `--hero-glass`, `--hero-input-*` in tokens.css.
  No token is redeclared inside a component scope (ui-contract test).
- Decorative hues never carry text, state or control fills. The primary
  CTA stays `--action`; accent *text* outside gradients stays
  `--text-accent`; focus stays `--border-focus`. D2 therefore still
  governs every informational surface; ADR-014 scopes colour-as-light
  to `.hero-max` only.
- Substance over ornament (taste-skill): a proof meta strip
  (SHA-256 / formats / signed delivery, i18n `heroMeta*`), a live status
  dot, concentric emblem rings, a pointer-tracked sheen (no scroll
  listener, transform/opacity-only keyframes) complete the redesign.
- ECC discipline applied: research-first (skill sources read before
  code), token contract preserved, perf tiers + `prefers-reduced-motion`
  shed every new layer (performance-modes.css), RTL uses logical
  properties (`inset-inline-*`).

## Consequences
- `test/ui-contract.test.js` still passes unmodified: no banned iris/coral
  literals return, no `--primary`/`--accent` tokens, `.btn-primary`
  remains `--action`.
- Reverting is deleting the appended "NOIR PRISM HERO" block in
  home.css, the hero tokens, and the `hero-aurora` markup.