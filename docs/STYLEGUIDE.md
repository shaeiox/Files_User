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
index.html
├── 1. tokens.css              (579 L)  @font-face + foundation + semantic tokens
├── 2. base.css                (425 L)  reset, typography, container, backdrop, motion primitives
├── 3. components.css        (1,346 L)  nav, buttons, inputs, cards, footer, controls
├── 4. home.css              (2,224 L)  home page: hero, cards grid, results, states
│      route stylesheets, inserted here by router.js on their route only:
│      browse.css            (1,403 L)  browse table, breadcrumbs, row grid, inspector
│      release.css             (489 L)  releases page
├── 5. performance-modes.css   (884 L)  [data-perf] overrides
└── 6. lenis.css                (26 L)  upstream Lenis requirements
```

| Layer | Owns |
|-------|------|
| `tokens.css` | Every design decision as a named custom property. No component selectors. |
| `base.css` | Reset, body typography, the shared page container, ambient backdrop. The container is `100%` minus `--page-gutter` per side, capped at `--page-max` (1400px); `browse.css` and `release.css` raise `--page-max` to 2560px on their route only. |
| `components.css` | Reusable UI: navbar, buttons, theme toggle, language pill, inputs, chips, cards, footer. |
| `home.js`'s `home.css` | Home page composition only. |
| `browse.css` | Browse page only; loaded by `router.js` when `/browse` is entered. |
| `release.css` | Releases page only; loaded by `router.js` when `/download/release` is entered. |
| `performance-modes.css` | Nothing but `[data-perf="..."]` overrides. |
| `lenis.css` | Upstream library requirements. Do not edit. |

`public/index.html` is the only entry point (the unrouted `public/browse.html` was deleted).
Route stylesheets are disabled while another route is shown, so their rules never leak.

---

## 2. Token Contract

Three layers, resolved in cascade order:

1. **Foundation** — primitives, no meaning. `--n-0`…`--n-12` (neutral), `--s1`…`--s24` (4px spacing base), `--r*` radius, `--z-*` z-index,
   `--ease`/`--dur-*` motion.
2. **Semantic** — meaning-bearing roles that alias foundation tokens. `--bg`, `--bg-card`,
   `--text`, `--text-2`…`--text-4`, `--border-default`, `--action`, `--danger`, plus a
   shadcn-compatible set (`--background`, `--foreground`, `--card`, `--ring`, …).
3. **Consumption** — component rules. **Semantic tokens only.**

### Rules

- **Never hardcode a colour, radius, or spacing value in a component rule.** Use
  `var(--token)`.
- **Never reference a foundation ramp (`--n-*`) from a component rule.** Only the
  semantic layer may do that.
- **Prefer semantic tokens over raw values even when a raw value looks simpler.** A token is
  the seam where theming and accessibility fixes land.
- **Change a value in `tokens.css`, once.** Both themes re-resolve automatically.
- **Never redeclare a token inside a component scope** (`.hero-max { --text: … }`). That renders
  two values for one token on one page. This is how the old hero showed blue and coral while the
  rest of the page was amber; the scoped "insulation" block is gone and must not come back.
- **Every `var(--x)` must resolve.** A reference to an undefined token (the old
  `--error-container`) silently drops the declaration. `test/ui-contract.test.js` checks this.

### Colour roles — two, and only two

| Role | Tokens | Used for |
|------|--------|----------|
| Accent (amber) | `--color-ember-pulse` (fill), `--text-accent` (text), `--glow*` (tints), `--border-focus` / `--ring` (focus) | every highlight, active state, indicator, focus ring |
| Primary action (iris blue) | `--action`, `--action-hover`, `--text-on-action` | the one primary call to action per screen (`.btn-primary`, hero search, sign-in) |

Status colours (`--danger`, `--success`, `--warning`) are semantic, not accents. A component that
needs another colour uses one of these roles; it does not get its own hue. `--ring` is an alias of
`--border-focus`, so every focusable control draws the same ring in a given theme.

To check a token change is actually complete, look for literals that should have been
tokens:

```bash
grep -rn "#[0-9a-fA-F]\{3,8\}" public/assets/css/components.css public/assets/css/home.css public/assets/css/browse.css
```

### Known scars — do not "clean up" without reading

These exist for specific, documented reasons. Each is annotated in place in `tokens.css`.

- **`--text-4` is aliased to `--text-3`.** `browse.css` references `--text-4` in
  six selectors, so the declaration cannot be deleted — but no value dimmer than `--text-3`
  clears the 4.5:1 contrast floor. Aliasing is deliberate.
- **`--font-hero` is `Cinzel`, an inscriptional capital face.** Set it with open tracking and
  leading of at least 1 (`.hero-content h1`: `0.02em` / `1.12`). Negative tracking or sub-1
  leading closes the letter spacing the face is built on.
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
| `--font-hero` | `Cinzel` | Latin hero headline only |
| `--font-fa` | `Vazirmatn`, `Inter` | Persian content |

All faces are self-hosted WOFF2 in `public/assets/fonts/`, declared in `tokens.css`, all with
`font-display: swap`. The three Vazirmatn faces carry an Arabic-script `unicode-range`
(`U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200F, U+FB50-FDFF, U+FE70-FEFF`), so a page that
renders no Arabic-script glyph never downloads them. Closed navbar menus are `display: none` for
the same reason: the "فارسی" label would otherwise be laid out, and fetch the face, on every
English page load. `index.html` preloads the two faces the hero paints with first
(`Cinzel-SemiBold`, `Inter-Regular`).

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
| `low` | `backdrop-filter` disabled; aura and logo shader removed; FLIP reorder off |
| `potato` | No blur, no shadows, no transitions; reveal, route and hero motion off |

The pre-paint default (inline script in `index.html`) is `high`, the unstyled baseline, so
auto-detection after first paint can only reduce cost, never add it.

`performance-modes.css` is organised by tier and **must be updated for any new expensive
effect.** An effect with no `POTATO` override defeats the mechanism on exactly the devices
it exists to protect.

**Test every visual change at every tier.** Local development only ever shows `high`:

```javascript
document.documentElement.setAttribute('data-perf', 'potato');
```

Four systems read `data-perf`: `performance-modes.css`, `public/assets/js/smooth-scroll.js`,
`public/assets/js/motion.js`, and the manual override UI (the performance setting in the footer). It is set from more than one
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

**None.** The hero freeze (`enterprise-ui-redesign` D8/I21, `a11y-ux-debt` J5/J6) was lifted by
`ui-craft-elevation`: it was enforced by redeclaring seven tokens inside `.hero-max`, which broke
the token contract above (one value per token per page). The hero now resolves the same tokens as
every other surface.

Layout invariants still apply. Re-check the ones documented in `docs/ARCHITECTURE.md` before
editing (for example the fixed `26px` action column track in the browse row grid, which must stay
identical between header and rows), and re-measure contrast when a colour changes.

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
- `prefers-reduced-motion` is honoured in three places: CSS (`base.css` and
  `performance-modes.css`), `public/assets/js/smooth-scroll.js`, and `public/assets/js/motion.js`.
  Any new animation must honour it too — see §10.
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
- [ ] Any new animation passes the §10 motion checklist

---

## 10. Motion Contract

Permitted techniques — native only, no animation library:

| Effect | Technique | Where |
|--------|-----------|-------|
| Section reveal | `IntersectionObserver`, once, disconnected on route change | `motion.js` `reveal()`, `[data-reveal]` |
| Reorder on filter/sort | FLIP (measure, reorder, invert `transform`, play) | `motion.js` `flip()` |
| Grid/list toggle | cross-fade (fade/scale out, swap, fade in) | `motion.js` `crossfade()` |
| Route and theme change | View Transitions API, feature-detected | `router.js`, `theme.js` |
| Hero entrance, list stagger | `animation-delay` cascade / capped stagger | `base.css`, `motion.js` `enter()` |
| Scroll-linked (nav condense) | Lenis's own `scroll` event | `smooth-scroll.js` |

Checklist for every animation, in the change that introduces it:

- [ ] Animates `transform` and `opacity` only. Transitions list their properties — never
      `transition: all` — and never animate width, height, top or left.
- [ ] No `window` scroll listener drives it; use an observer, a scroll timeline, or Lenis's event.
- [ ] Reduced-motion branch declared: content present and operable, no offset.
- [ ] Lowest-tier (`potato`) override declared in `performance-modes.css` (or the gate in
      `motion.js`): the effect is absent or static, no content withheld.
- [ ] A state change stays legible with the animation removed.
- [ ] An infinite loop exists only while real work runs (skeleton while loading, ZIP indicator while
      zipping) and stops when it ends.
- [ ] An imperatively applied transition is removed once it completes.

Known ceiling: the reduced-motion rule in `base.css` sets `animation-duration: 0.01ms !important`
on everything. It catches every CSS animation automatically, but would also kill a future
*functional* animation; replacing it needs an audit of every animation and is a separate change.