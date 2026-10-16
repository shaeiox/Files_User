# Style Guide

Frontend visual conventions for `files-server-web`. Covers the CSS layer model, design
tokens, typography, theming, performance modes, and RTL support.

**Design style:** "Obsidian Kinetic" — enterprise dark surface with a Cyber Amber accent;
light mode is a calm editorial band (snow cards on linen canvas). Pills and tiered cards
throughout.

Rationale for the token layer lives in [ADR-008](decisions/ADR-008-css-custom-property-tokens.md);
runtime performance gating in [ADR-009](decisions/ADR-009-runtime-performance-tiers.md);
fonts in [ADR-011](decisions/ADR-011-self-hosted-fonts.md).

---

## 1. The CSS Layer Model

There is **no build step** (see [ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md)),
so there is no preprocessor, no autoprefixer, and no import graph. Layering is achieved
solely by `<link>` order in `public/index.html`. **Order is load-bearing.**

```
index.html and browse.html
├── 1. tokens.css            (503 L)  @font-face + foundation + semantic tokens
├── 2. base.css              (336 L)  reset, typography, container, ambient backdrop
├── 3. components.css      (1,181 L)  nav, buttons, inputs, cards, footer, controls
├── 4. home.css            (2,198 L)  home page: hero, cards grid, results, states
├── 5. browse.css           (509 L)  browse table, breadcrumbs, row grid
├── 6. performance-modes.css (790 L) [data-perf] overrides
└── 7. lenis.css             (26 L)  upstream Lenis requirements
```

| Layer | Owns |
|-------|------|
| `tokens.css` | Every design decision as a named custom property. No component selectors. |
| `base.css` | Reset, body typography, the shared page container, ambient backdrop. |
| `components.css` | Reusable UI: navbar, buttons, theme toggle, language pill, inputs, chips, cards, footer. |
| `home.js`'s `home.css` | Home page composition only. |
| `browse.css` | Browse page only. **Partially frozen** — see §7. |
| `performance-modes.css` | Nothing but `[data-perf="..."]` overrides. |
| `lenis.css` | Upstream library requirements. Do not edit. |

`public/browse.html` loads a **reduced** set — `tokens`, `base`, `components`, `home`, `browse`,
`lenis`. It omits `performance-modes.css`. Since `public/browse.html` is not routed (see
`ARCHITECTURE.md`), verify changes against the page actually served.

---

## 2. Token Contract

Three layers, resolved in cascade order:

1. **Foundation** — primitives, no meaning. `--n-0`…`--n-12` (neutral), `--a-1`…`--a-8`
   (accent), `--s1`…`--s24` (4px spacing base), `--r*` radius, `--z-*` z-index,
   `--ease`/`--dur-*` motion.
2. **Semantic** — meaning-bearing roles that alias foundation tokens. `--bg`, `--bg-card`,
   `--text`, `--text-2`…`--text-4`, `--border-default`, `--primary`, `--danger`, plus a
   shadcn-compatible set (`--background`, `--foreground`, `--card`, `--ring`, …).
3. **Consumption** — component rules. **Semantic tokens only.**

### Rules

- **Never hardcode a colour, radius, or spacing value in a component rule.** Use
  `var(--token)`.
- **Never reference a foundation ramp (`--n-*`, `--a-*`) from a component rule.** Only the
  semantic layer may do that.
- **Prefer semantic tokens over raw values even when a raw value looks simpler.** A token is
  the seam where theming and accessibility fixes land.
- **Change a value in `tokens.css`, once.** Both themes re-resolve automatically.

To check a token change is actually complete, look for literals that should have been
tokens:

```bash
grep -rn "#[0-9a-fA-F]\{3,8\}" public/assets/css/components.css public/assets/css/home.css public/assets/css/browse.css
```

### Known scars — do not "clean up" without reading

These exist for specific, documented reasons. Each is annotated in place in `tokens.css`.

- **`--a-*` collides.** Legacy hex aliases in `:root`; a different OKLCH accent ramp in the
  light theme. The light-theme definitions win there.
- **`--text-4` is aliased to `--text-3`.** The frozen `browse.css` references `--text-4` in
  six selectors, so the declaration cannot be deleted — but no value dimmer than `--text-3`
  clears the 4.5:1 contrast floor. Aliasing is deliberate.
- **`--font-hero` is intentionally still `Cinzel`.** It is consumed by exactly one frozen
  selector, `.hero-content h1`.
- **Light theme is OKLCH, dark theme is hex.** Not an oversight. The light theme was
  rebuilt on a hue-240 neutral ramp with even lightness stride; the dark theme was not
  migrated. Aligning them is a candidate cleanup, not a bug fix.

### Contrast is a measured claim, not a guess

Colour tokens carry measured contrast ratios in adjacent comments — for example, dark
`--text-3` was moved from `#9e8f78` to `#a99d8a` because the original measured 3.89:1 on
`--bg-elevated`, below the 4.5:1 floor, while the replacement clears every surface.

**When you change a colour token, re-measure the ratios quoted in its comment.** Do not
trust them; they describe the value that is there now, not any value you are about to write.

---

## 3. Typography

| Token | Family | Use |
|-------|--------|-----|
| `--font` / `--font-display` / `--font-heading` | `Inter`, `Vazirmatn` | Body, display, headings |
| `--font-mono` | `JetBrains Mono` | Versions, hashes, paths, code |
| `--font-hero` | `Cinzel` | Hero headline only — frozen |
| `--font-fa` | `Vazirmatn`, `Inter` | Persian content |

All faces are self-hosted WOFF2 in `public/assets/fonts/`, declared in `tokens.css`, all with
`font-display: swap`. Vazirmatn faces carry an `unicode-range` so they download only for
Arabic-script text.

Fallback stacks are ordered so the script-appropriate family wins: Latin text hits `Inter`
first, Persian text falls through to `Vazirmatn`.

Two type scales coexist: `--text-headline-*` / `--text-body-*` / `--text-label-*`
(Obsidian Kinetic) and `--text-caption`…`--text-display` (legacy Huly). Prefer the
Obsidian Kinetic scale for new work.

---

## 4. Theming

Themes are a single attribute on `<html>`; component CSS is theme-agnostic.

```javascript
document.documentElement.setAttribute('data-theme', 'dark');   // or 'light'
```

- Persisted in `localStorage` by `public/assets/js/theme.js`, applied **before first paint** by an
  inline script in `public/index.html`.
- Initial default follows `prefers-color-scheme` when no stored preference exists.
- `color-scheme` is set in both themes so native UI (scrollbars, form controls) matches.

**Adding a theme means adding a `[data-theme="..."]` block that redefines the semantic
layer.** No component changes required. Verify both themes — dark surfaces separate by
border contrast with tight low-opacity shadows, light mode by shadow; a change that looks
right in one is often wrong in the other.

---

## 5. Performance Modes

Runtime device classification publishes `data-perf` on `<html>` (see
[ADR-009](decisions/ADR-009-runtime-performance-tiers.md)).

| Tier | Effects |
|------|---------|
| `high` | Full |
| `medium` | Blur radii roughly halved; aura reduced |
| `low` | `backdrop-filter` disabled; aura, logo shader, hero clouds removed |
| `potato` | No blur, no shadows, no transitions |

`performance-modes.css` is organised by tier and **must be updated for any new expensive
effect.** An effect with no `POTATO` override defeats the mechanism on exactly the devices
it exists to protect.

**Test every visual change at every tier.** Local development only ever shows `high`:

```javascript
document.documentElement.setAttribute('data-perf', 'potato');
```

Three independent systems read `data-perf`: `performance-modes.css`,
`public/assets/js/smooth-scroll.js`, and the manual override UI. It is set from more than one
place. Treat it as a cross-cutting contract.

---

## 6. RTL Support

Persian (`fa`) is a first-class locale, not an afterthought.

- Direction is driven by the `dir` attribute on `<html>`, with a `body.rtl` fallback
  selector for robustness.
- **Prefer logical properties** (`margin-inline-start`, `padding-inline`,
  `inset-inline-start`) over physical `left`/`right` so rules mirror automatically.
- Where physical values are unavoidable, provide a `[dir="rtl"]` override. Existing
  examples: `browse.css` breadcrumb separator mirroring, `components.css` input padding,
  `base.css` body direction and `::selection`.
- Vazirmatn needs **generous line-height** for joined Arabic script — see the comment block
  in `base.css`.
- Touch targets are handled in a dedicated `components.css` section; keep new controls
  within it.

---

## 7. Frozen Regions

Some CSS is deliberately **frozen** — the redesign's design docs record it as fixed, and
several accessibility tokens were engineered around it (`--text-4` in particular).

**Frozen:** `browse.css` (in practice), the `.hero-content h1` hero headline and its
`--hero-grad` gradient, the ambient backdrop implementation in `base.css`.

Before editing a frozen file, check the comment at the top of the section — several carry
explicit "unchanged" or "frozen" markers referencing the originating design decision.
Changing frozen CSS usually means re-measuring a contrast value or re-checking a layout
invariant documented in `docs/ARCHITECTURE.md` (for example the fixed `26px` action column
track in the browse row grid, which must stay identical between header and rows).

---

## 8. Accessibility Conventions

- Every interactive control is keyboard reachable with a visible focus ring. The ring is
  `--shadow-ring` / `--border-focus`, amber — do not replace with `outline: none` without a
  replacement.
- Action controls carry `aria-label`/`title` of the form `"{verb} {item name}"`; decorative
  SVGs get `aria-hidden="true"`.
- The browse row exposes **two distinct target categories** — the primary name/icon link
  and dedicated File Actions. They are siblings, never nested, each appearing exactly once
  in tab order. Do not collapse them; see `ARCHITECTURE.md` for the ownership split.
- `prefers-reduced-motion` is honoured in two places: CSS transitions and
  `public/assets/js/smooth-scroll.js`. Any new animation must honour it too.
- Body text meets 4.5:1; large text and UI boundaries meet 3:1. When in doubt, measure and
  record the ratio in a comment next to the token.

---

## 9. Checklist for a UI Change

- [ ] Semantic token used, not a literal — and the literal grep is clean
- [ ] Verified in **both** themes
- [ ] Verified at `data-perf="potato"` (and `low`)
- [ ] Verified in **both** directions (`dir="rtl"` and default)
- [ ] `prefers-reduced-motion` respected
- [ ] Keyboard reachable with a visible focus ring
- [ ] Contrast measured if a colour token changed, and the comment updated
- [ ] A `POTATO` override added if the change is expensive
- [ ] `public/index.html` `<link>` order still correct
- [ ] `docs/STYLEGUIDE.md` updated if a token, tier, or font changed