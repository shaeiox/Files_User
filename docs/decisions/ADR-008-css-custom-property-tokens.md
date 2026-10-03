# ADR-008: CSS custom properties as the design-token layer, no preprocessor

## Status
Accepted

## Date
2026-10-02 (Obsidian Kinetic enterprise UI redesign)

## Context

The UI needed a coherent design system across seven stylesheets, two themes (light and
dark), two languages including RTL (ADR: `docs/STYLEGUIDE.md`), and four runtime
performance tiers (ADR-009). Before this, values were scattered across rules as literals.

The question was how to centralise them given ADR-006: no build step, so no Sass, Less, or
Stylus, and no PostCSS pipeline.

Additionally, the accessibility work (`a11y-ux-debt`) needed to change specific token
*values* and record measured contrast ratios in the source. That requires a named token
that can be adjusted in one place, with the reasoning preserved next to it.

## Decision

Use native CSS custom properties in `assets/css/tokens.css`. No preprocessor, no build
step, consistent with ADR-006.

Three token layers, in cascade order:

1. **Foundation** — `tokens.css`. Primitives with no meaning attached:
   - Colour ramps `--n-0`…`--n-12` (neutral) and `--a-1`…`--a-8` (accent)
   - Spacing `--s1`…`--s24` (4px base), radius, z-index, motion (`--ease`, `--dur-1..3`)
   - `@font-face` declarations for the self-hosted families (ADR-011)
2. **Semantic** — the same `:root`/`[data-theme=...]` blocks. Meaning-bearing roles that
   *alias* foundation tokens: `--bg`, `--bg-card`, `--text`, `--text-2..4`,
   `--border-default`, `--primary`, `--danger`, plus a shadcn-compatible set
   (`--background`, `--foreground`, `--card`, `--ring`, …).
3. **Consumption** — `base.css`, `components.css`, `home.css`, `browse.css`,
   `performance-modes.css`, `lenis.css`. These reference semantic tokens only, never
   foundation ramps directly.

Theme switching is a single attribute: `[data-theme="light"]` and `[data-theme="dark"]`
redefine the semantic layer; component CSS needs no theme awareness.

## Alternatives Considered

### Sass / Less
- Pros: Nesting, variables, mixins; mature tooling.
- Cons: **Requires a build step**, directly contradicting ADR-006. Introduces a
  compile/watch/deploy stage and a second failure surface (stale compiled output).
- Rejected: The build step is the entire cost; native custom properties now cover the
  token use case.

### PostCSS with custom-properties plugin
- Pros: PostCSS-native nesting and vendor prefixing.
- Cons: Still a build step. Autoprefixer can be dropped (modern baseline) rather than
  carried.
- Rejected: Same as above; browser support for custom properties is universal at our
  target baseline.

### JS-injected theme tokens
- Pros: Theme values computed at runtime; no CSS duplication.
- Cons: Requires a blocking script before first paint or a flash of wrong theme —
  precisely the failure `assets/js/theme.js` exists to avoid via
  `prefers-color-scheme` + an inline pre-paint script in `index.html`.
- Rejected: Introduces FOUC risk for a problem CSS solves natively.

### Utility-first (Tailwind)
- Pros: Constrained vocabulary, no bespoke token layer.
- Cons: Requires a build step; markup churn; and the redesign's stated intent is an
  enterprise design system with named, auditable tokens.
- Rejected: Build step plus a mismatch with the goal.

## Consequences

- **Token values are changed in one place, and the cascade does the rest.** Theme work is
  a single attribute change on `<html>`.
- **Two token families coexist.** `--a-*` appears twice: as legacy hex aliases in `:root`
  and as OKLCH accent ramp steps in the light theme. `--text-4` is deliberately aliased to
  `--text-3` because the frozen `browse.css` references it in six selectors and no dimmer
  value clears 4.5:1. Both are annotated in place. **These are compatibility scars, not
  design intent** — do not treat them as a clean system when extending it.
- **The light theme uses OKLCH; the dark theme uses hex.** Unintentional-looking, but
  deliberate in effect: the light theme was rebuilt on a hue-240 neutral ramp with even
  lightness stride for predictable contrast; the dark theme predates it and was not
  migrated. Aligning them is a candidate cleanup, not a bug.
- **No compile-time enforcement.** Nothing stops a component from hardcoding `#1b1b1f`
  instead of `var(--bg-card)`. Grep for literals before assuming a token change is complete:
  `grep -rn "#[0-9a-fA-F]\{3,8\}" assets/css/components.css assets/css/home.css
  assets/css/browse.css`
- **Layer order is implicit, via `<link>` order in `index.html`.** `tokens.css` must load
  first or the entire semantic layer resolves to nothing. This is the same fragile
  ordering contract as the script tags in ADR-006.
- Accessibility contrast decisions are recorded **in the token file next to the value**,
  with measured ratios in the comment. This is the main reason to prefer this over literals:
  the reasoning survives. When changing a colour token, re-measure the ratios quoted in the
  surrounding comments rather than trusting them.
- `docs/STYLEGUIDE.md` documents the token contract, contribution rules, and the
  performance-tier and RTL layers that build on this foundation.