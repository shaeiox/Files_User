# Design: Enterprise UI Redesign ("Obsidian Kinetic")

## 1. Architecture Direction

### 1.1 Zero-build, token-first

The application has no bundler, no preprocessor, and no CSS framework. `package.json` declares no build
step, and `lib/http-utils.js:57` ships a Content-Security-Policy that forbids remote scripts, remote
stylesheets, remote fonts, and remote images. The redesign therefore adds **no toolchain** and reuses the
existing six stylesheets loaded in this order from `index.html`: `tokens.css` → `base.css` →
`components.css` → `home.css` → `browse.css` → `performance-modes.css`.

All visual change is expressed as **values of custom properties declared in `assets/css/tokens.css`**, plus
rule-level restyling inside the stylesheet that already owns each component. `tokens.css` is the single
theming surface and is imported first, so a token value change is immediately global and immediately
revertible.

### 1.2 Two-layer separation

| Layer | Files | What may change | What may not change |
|---|---|---|---|
| **A — CSS shell** | `index.html` static shell, `tokens.css`, `base.css`, `components.css`, `home.css`, `browse.css`, `performance-modes.css` | Everything visual: selectors, properties, values, media-query rules | Any selector that is a documented JS behavioral hook (I8) |
| **B — JS markup shape** | `assets/js/home.js` render functions, `assets/js/browse.js` row construction | Class names, wrapper elements, inline decorative styles, SVG markup | Ids (I6), `data-*` attributes (I7), child count and child order (I3), text content that a consumer reads |

Layer B is the risk layer. Phases 4 and 5 permit edits there under a strict whitelist: a class name, a
wrapper `<div>`, an inline decorative style, or inline SVG artwork. Anything else is out of scope.

### 1.3 Contract-preserving edits

Phase 0 documented twelve contracts (C1–C12) that the DOM/JS layer depends on. The redesign treats them as
a **frozen interface**: it may add presentation around them, between them, or on them, but never changes
what a consumer reads, queries, or matches. §11 maps each contract to its design response.

### 1.4 Phase independence

Each phase in `tasks.md` leaves the application working and behaviorally unchanged. No phase depends on a
later phase. Phase 1 (`tokens.css` + fonts only) is the highest-value-per-risk slice because token values
cannot alter a selector, an id, a `data-*` attribute, an event binding, or a URL.

## 2. Token Architecture

### 2.1 Post-redesign `tokens.css` structure

The file keeps its existing four-block shape and gains no new top-level structure:

1. **`:root`** — theme-invariant tokens: the D4 palette is declared here as the single source of truth,
   together with the typography, radius, spacing, and z-index scales.
2. **`:root, [data-theme="light"]`** — the light-theme overrides of every theme-sensitive token.
3. **`[data-theme="dark"]`** — the dark-theme overrides of every theme-sensitive token (the primary theme).
4. **No new blocks.** No `[data-perf]` block is added to `tokens.css`; all tier overrides live in
   `performance-modes.css`, as today.

The dark theme is declared **after** the light block so that a bare `:root` load and an explicit
`[data-theme="dark"]` both resolve to Obsidian Kinetic. `index.html:34` sets `data-theme` pre-paint and
`theme.js:25` maintains it, so no new mechanism is introduced.

### 2.2 Authoritative tokens (D4, verbatim)

The complete D4 palette is reproduced in `proposal.md` §Locked Decisions and is the normative source. This
section documents only *where* each group lives and how it is consumed.

| Group | Tokens | Declared in | Consumed by |
|---|---|---|---|
| Core surfaces (dark-primary) | `--surface`, `--surface-dim`, `--surface-bright`, `--surface-container-lowest`, `--surface-container-low`, `--surface-container`, `--surface-container-high`, `--surface-container-highest`, `--surface-variant`, `--background` | `:root` + both theme blocks | the legacy alias bridge (§2.4), `base.css`, `home.css`, `browse.css` |
| Foreground | `--on-surface`, `--on-surface-variant`, `--on-background`, `--inverse-surface`, `--inverse-on-surface` | both theme blocks | text colors across all five styled stylesheets |
| Outlines | `--outline`, `--outline-variant`, `--border-hairline`, `--border-active` | both theme blocks | borders, muted text, focus affordances |
| Primary — Cyber Amber | `--primary`, `--on-primary`, `--primary-container`, `--on-primary-container`, `--inverse-primary`, `--primary-fixed`, `--primary-fixed-dim`, `--on-primary-fixed`, `--on-primary-fixed-variant`, `--surface-tint` | both theme blocks | brand accents, status dots, glows |
| Secondary — Electric Indigo | `--secondary`, `--on-secondary`, `--secondary-container`, `--on-secondary-container`, `--secondary-fixed`, `--secondary-fixed-dim`, `--on-secondary-fixed`, `--on-secondary-fixed-variant` | both theme blocks | primary buttons, panel icons, hero gradient stop |
| Tertiary — Cyan Stream | `--tertiary`, `--on-tertiary`, `--tertiary-container`, `--on-tertiary-container`, `--tertiary-fixed`, `--tertiary-fixed-dim`, `--on-tertiary-fixed`, `--on-tertiary-fixed-variant` | both theme blocks | informational affordances, telemetry accents |
| Error | `--error`, `--on-error`, `--error-container`, `--on-error-container` | both theme blocks | `.badge-error`, `.status-error`, `.empty-circle.err`, `.dot-error` |
| Glows (derive) | `--glow-amber`, `--glow-amber-strong`, `--glow-indigo`, `--shadow-modal`, `--inset-highlight` | both theme blocks | hover/focus glows, modal elevation, top-edge highlight |

### 2.3 New scales

| Scale | Tokens | Declared in | Notes |
|---|---|---|---|
| Typography | the nine `--text-*` tokens from D6's Typography Scale | `:root` | consumed by the Phase 4/5 restyle |
| Radius | `--radius-sm`, `--radius-DEFAULT`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full` | `:root` | `--radius-DEFAULT` is required verbatim by D4 |
| Spacing | `--space-xs/sm/md/lg/xl`, `--gutter`, `--gutter-desktop`, `--margin`, `--margin-desktop` | `:root` | page gutter and section rhythm |
| Z-index | `--z-base`, `--z-sticky`, `--z-dropdown`, `--z-dropdown-high`, `--z-autocomplete`, `--z-banner`, `--z-debug`, `--z-toast`, `--z-modal` | `:root` | replaces magic numbers; **values reproduce today's live numbers exactly** |
| Layout | `--nav-h` | `:root` | desktop nav height; overridden to the mobile height inside the existing `@media (max-width: 640px)` block |

**`--nav-h` derivation.** The navbar height is currently hardcoded twice in `components.css` (desktop and
the `≤640px` override) and is read by nothing else — no `calc()` anywhere in the codebase references a
header height. Introducing `--nav-h` is therefore safe: it replaces two literals with one token and its
mobile override, and adds **no new `calc()` consumer** in this change. Phase 3 wires `.nav-bar`'s `height`
to it; no other rule consumes it yet.

**Z-index scale fidelity.** `--z-sticky: 50` reproduces `.nav`'s live `z-index: 50`; `--z-dropdown: 100`
reproduces `.filter-dropdown-menu`; `--z-dropdown-high: 200` reproduces `.lang-dropdown-menu` and
`.perf-dropdown-menu`; `--z-autocomplete: 1000` reproduces the `.hero-search`/`.input-wrap` stacking chain
that caps `.ac-dropdown`; `--z-banner: 9999` reproduces `banner.js`'s injected `.cav-banner-host`; `--z-debug`
and `--z-toast` reproduce `.perf-debug-panel` and `.perf-toast`; `--z-modal: 999999` reproduces
`.auth-overlay`. Migrating to the scale must produce **zero numeric change** in the rendered stacking order.

### 2.4 Legacy-token alias bridge

Roughly forty legacy token names are consumed across the six stylesheets. Removing any of them would break
a consumer, so **Phase 1 keeps every legacy name alive as an alias resolving to exactly one D4 token**. This
makes Phase 1 behavior-neutral: no stylesheet rule outside `tokens.css` needs to change for the re-theme to
take effect. Later phases may migrate individual `var()` call sites to the canonical D4 name, but no phase
is required to.

| Legacy token | Resolves to | Rationale |
|---|---|---|
| `--bg` | `--background` | page canvas |
| `--bg-card` | `--surface-container-low` | card and panel surface (the app's dominant card tone) |
| `--bg-elevated` | `--surface-container-high` | raised surfaces |
| `--bg-hover` | `--surface-container-high` | hover wash; note D4 gives no dedicated hover tone |
| `--bg-input` | `--surface-container` | input fields |
| `--input-bg` | `--surface-container` | input background (second legacy name, same target) |
| `--surface-glass` | `--border-hairline` composite via the `--glass-*` treatment | glass panels; currently zero-use, so the alias is inert until Phase 3 consumes it |
| `--nav-bg` | `--surface-container-lowest` | navbar pill fill |
| `--border` | `--border-hairline` | hairline borders |
| `--border-hover` | `--outline-variant` | hover border |
| `--border-focus` | `--primary-container` | focus border; today `#5683da` (iris) |
| `--text` | `--on-surface` | primary text |
| `--text-2` | `--on-surface-variant` | secondary text |
| `--text-3` | `--outline` | tertiary text |
| `--text-4` | `--outline` at reduced alpha (marked `derive`; see OQ-2) | muted text |
| `--text-accent` | `--secondary-container` | accent text; today `#3d6bc7` |
| `--glow` | `--glow-indigo` at low alpha | accent wash |
| `--glow-strong` | `--glow-indigo` | stronger accent wash |
| `--ember-glow` | `--glow-amber` | warm accent wash; currently zero-use |
| `--n-4` | `--surface-container-high` | `.thead`, `.badge-file`, `.f-icon-file`, `kbd`, scrollbar track |
| `--n-5` | `--surface-container-highest` | scrollbar thumb |
| `--n-6` | `--surface-variant` | scrollbar thumb hover |
| `--color-electric-iris` | `--secondary-container` | brand iris; primary buttons, `.panel-icon`, `.btn-login`, hero `.accent` stop |
| `--color-ember-pulse` | `--primary-container` | warm accent; `.hero-pill-dot`, second `.panel-icon`, gradient stop |
| `--a-5` | `--secondary-container` | legacy iris ramp midpoint, consumed by `performance-modes.css` |
| `--danger` | `--error` | error color |
| `--success` | `--tertiary-container` | status-positive color; today `#10b981` |
| `--radius-cards` | `--radius-lg` | cards, panels, `.browse-head`, `.file-tbl` |
| `--radius-buttons` | `--radius-full` | pills and buttons |
| `--radius-tags` | `--radius-full` | chips, badges, crumbs |
| `--radius-inputs` | `--radius-full` | pill inputs |
| `--radius-panels` | `--radius-xl` | hero and modal |
| `--shadow-sm/md/lg/xl/card/subtle` | the D4 glow/elevation set | `--shadow-xl` → `--shadow-modal`; `--shadow-subtle` → `--border-active` focus ring |

Two mappings carry contrast risk and are listed as OQ-2: `--text-4` (D4's nearest muted tone,
`--outline-variant`, is markedly darker than today's `#95979e`) and `--border-focus` (amber versus today's
iris). Phase 7 verifies both.

**Hero drift risk (D8/I21).** Three rows in the table above feed the frozen Hero and therefore MUST be
compensated by pinning under D8 clause 3, or the Hero will drift while the rest of the app re-themes:

| Alias | Feeds (frozen Hero element) | Required action in Phase 1 |
|---|---|---|
| `--color-ember-pulse` → `--primary-container` | `.hero-pill-dot`, and the hero gradient stop | Pin `.hero-pill-dot` and the hero gradient rule to their pre-change literal values |
| `--color-electric-iris` → `--secondary-container` | the hero headline's `.accent` gradient stop | Pin the `.accent` rule to its pre-change literal values |
| `--radius-panels` → `--radius-xl` | `.hero-max` (and `.hero-max::before/after` clip paths) | Pin `.hero-max`'s radius to its pre-change literal value |
| `--hero-grad` → Obsidian gradient (§2.5) | `.hero-max` background | **Do not repoint `--hero-grad`.** It is consumed only by the frozen Hero, so its value must stay exactly as-is |

Because `--hero-grad` is consumed only by `.hero-max`, Phase 1 task 1.7 (repoint `--hero-grad`) is **cancelled
by D8**: the token keeps its current value in both theme blocks.

### 2.5 Deprecation

The following are **not removed** in this change — only marked deprecated with a comment — because each has
at least one live consumer or is required by name elsewhere: `--s1`…`--s24`, `--r1`…`--r-full`, `--radius`,
`--a-1`…`--a-8`, `--n-0`…`--n-3`, `--n-7`…`--n-12`, `--color-obsidian-canvas`, `--color-void`,
`--color-charcoal-card`, `--color-slate-edge`, `--color-iron-veil`, `--color-smoke`, `--color-ash`,
`--color-frost`, `--color-linen`, `--color-snow`, `--color-molasses`, `--warning`, `--ease-out`,
`--dur-1`…`--dur-3`, `--text-caption`, `--text-body`, `--text-subheading`, `--text-heading-sm`,
`--text-heading`, `--text-display-sm`, `--text-display`, `--hero-grad`, and the shadcn HSL triplets
(`--background`…`--ring` as channel values).

Two of those need a targeted note. First, `--background` is **claimed by D4** with the value `#121316`,
which collides with the existing dead shadcn channel-value `--background` (`240 4% 96%`); D4 wins and the
shadcn triplet must be dropped or renamed in Phase 1, since no rule in the codebase wraps it in
`hsl()`. Second, `--hero-grad` is consumed by `.hero-max` and is repointed to a D4-derived Obsidian
gradient rather than removed. Full deprecation is a separate, later change.

### 2.6 Light theme

D4 fixes the light-theme derivation rule but not its hex values, and D4 forbids inventing values. The
structural mirror is therefore specified as follows: the `[data-theme="light"]` block declares **exactly the
same token names** as `[data-theme="dark"]` (structural parallelism is a hard requirement), applying the D4
rule "swap `surface-container-*` to light tiers, flip `on-*` foregrounds, keep `--primary-container: #ffb800`
as the brand anchor". For every token D4 does not pin, the value is taken from the **already-present**
light-theme declarations in the current `tokens.css` — so no new hex is introduced. `--primary-container`
stays `#ffb800` in both themes. See OQ-1.

## 3. Font Loading Strategy

### 3.1 Files added

Nine `.woff2` files under `assets/fonts/`, self-hosted (see OQ-5 for provenance):

| Family | Weights | Files |
|---|---|---|
| Inter | 400, 500, 600 | `inter-400.woff2`, `inter-500.woff2`, `inter-600.woff2` |
| JetBrains Mono | 400, 500, 600 | `jetbrains-mono-400.woff2`, `jetbrains-mono-500.woff2`, `jetbrains-mono-600.woff2` |
| Vazirmatn | 400, 500, 600 | `vazirmatn-400.woff2`, `vazirmatn-500.woff2`, `vazirmatn-600.woff2` |

Paths are served from `/assets/fonts/*.woff2`, which satisfies the CSP `font-src 'self' data:` directive.

### 3.2 `@font-face` declarations

Declared in `assets/css/tokens.css` (the first-loaded stylesheet, so no flash of unstyled text ordering
issue). Every declaration carries `font-display: swap`, matching D6. `font-weight` is declared per file so
the browser can select the right binary rather than synthesising bold.

### 3.3 Token re-pointing

| Existing token | Current stack | New family | Role |
|---|---|---|---|
| `--font` | Manrope, Inter, ui-sans-serif, … | **Inter** | primary UI typeface |
| `--font-display` | Sora, Manrope, Inter, … | **Inter** | headings |
| `--font-hero` | Cinzel, Sora, … | **Inter** | hero headline |
| `--font-fa` | Vazirmatn, Tahoma, … | **Vazirmatn** | Farsi/RTL |
| `--mono` | JetBrains Mono, SF Mono, ui-monospace, … | **JetBrains Mono** | telemetry, `kbd`, metrics |

Note that `--font-hero` currently maps to Cinzel (a serif); the redesign maps it to Inter per D6's
"Inter — primary UI typeface". The `--mono` token is already correct and only gains working binaries.

### 3.4 Google Fonts link removal

`index.html` lines 86–90 contain three `<link>` tags (`preconnect` ×2 and the `css2` stylesheet) pointing at
`fonts.googleapis.com` / `fonts.gstatic.com`. Both are **already blocked** by the CSP, so the application has
been silently falling back to the system stack. Phase 1 removes those three tags and nothing else from
`index.html`. The `<link rel="stylesheet">` tags for the six project stylesheets, the `<link rel="icon">`,
and the inline pre-paint theme/perf script are **not** touched.

`browse.html` also contains the same Google Fonts tags, but `browse.html` is out of scope (D7, I18) and is
left byte-identical.

### 3.5 RTL

`i18n.js:288` sets `document.documentElement.lang` to `fa` when Persian is active. The existing
`base.css:39` already switches `font-family` to `var(--font-fa)` for that case, so self-hosting Vazirmatn
makes a previously-dead rule live. No new selector is needed.

## 4. Backdrop Strategy

### 4.1 Approach

Pure CSS on the **existing** five elements. No new element is added to `index.html`; `.aura-backdrop`
(containing `.aura-base`, `.aura-glow-1`, `.aura-glow-2`) is restyled in place, and `.aura-vignette` — which
today has a `display: none` rule but no matching element anywhere in the codebase — is left in place with
its rule intact, since adding it would be markup scope creep.

The Obsidian Kinetic feel is achieved with:

- a base vertical wash from `--background` toward `--surface-container-lowest`;
- two offset radial-gradient orbs tinted with `--glow-amber` and `--glow-indigo` at low alpha;
- an edge vignette darkening the periphery;
- an optional `backdrop-filter` on `.aura-base` for the frosted-glass read.

### 4.2 Stacking preservation

`.aura-backdrop` is currently declared **twice**: `base.css:95-101` (`position: fixed; inset: 0;
overflow: hidden; pointer-events: none; z-index: 0`) and `home.css:1385-1392` (`position: fixed; top/left/right: 0;
pointer-events: none; z-index: -1`), the later file winning on equal specificity. The redesign **must keep
both declarations' resolved result** (`z-index: -1`, `pointer-events: none`, viewport-filling, clipped) and
**must not** raise it above `--z-base`, because `.page` sits at `z-index: 1` and is what visually separates
the backdrop from content. `pointer-events: none` is load-bearing: the backdrop must never intercept a
click.

### 4.3 Performance gating

Every new backdrop rule using `backdrop-filter`, `blur`, `filter`, or `animation` receives a matching
`[data-perf="low"]` and `[data-perf="potato"]` override in `performance-modes.css`, consistent with I12. At
`low` and `potato` the orbs collapse to a single static gradient and `backdrop-filter` is removed entirely.
`prefers-reduced-motion` guards any animation.

### 4.4 Rejected

The Stitch's WebGL fragment-shader canvas, its `ResizeObserver` sizing loop, its `requestAnimationFrame`
render loop, and its `mousemove` beacon are rejected outright under D5. They would add a permanent GPU
frame budget, two new global listeners, and a runtime dependency with no analogue in the application.

## 5. Navbar Mapping

### 5.1 Floating pill, not full-bleed

The Stitch uses a **full-bleed** `sticky top-0 z-40` glass bar (`h-16`). The application uses a **floating
pill** at `sticky top: 12px` (`components.css:9-14`) inside the 1720 px `.page` container.

**Decision: keep the floating pill.** I1 locks `top: 12px` and `position: sticky`; a full-bleed bar would
require either `top: 0` (violating I1's literal offset) or hoisting the header out of `.page` into a
full-width wrapper — which changes the sticky containing block and risks I2. The full-bleed treatment is
therefore rejected on invariant grounds, not aesthetic ones.

What the redesign **does** take from the Stitch: the darker glass fill, the amber hairline border
(`--border-active` on hover), the amber glow on the brand mark, and the monospaced subtitle treatment.

### 5.2 Structure mapping

The Stitch's header maps onto the **existing** `.nav > .nav-bar` three-region layout. No region is added,
removed, or reordered.

| Stitch element | Application target | Change |
|---|---|---|
| Brand logo block (rounded tile, amber border, glow) | `.nav-logo` > `img` + `.nav-logo-text` | Restyle only. Image source stays `/assets/icon/logo.webp` (D3/D4: remote Stitch images are CSP-blocked). `data-link` and `data-i18n="brand"` / `data-i18n="subtitle"` preserved. |
| `CloudAvid` + `Infra` chip + `FILE PORTAL // TIER-1` | `.nav-logo-text > strong` + `span` | Restyle only. `data-i18n` keys unchanged (I10 — no new strings, so no new keys needed). |
| Five workspace tabs | `.nav-tabs` > `a.nav-tab` ×3 | **Structure unchanged.** The Stitch's Repositories / ISO Mirrors / Release / Documentation / Performance tabs have no destination in this application and would fabricate navigation (D3). The three existing real tabs (Website, Docs, Downloads — the latter with `aria-current="page"`) are restyled only. |
| `⌘K` search pill | — | **Not added to the navbar.** `⌘K` is already bound to `#globalSearch` in `home.js:889`; the Stitch's handler targets a different, non-existent field and would violate I14/I15. The hero search field keeps the shortcut. |
| Locale `EN` pill | `.lang-dropdown-wrap` > `#langBtn` + `.lang-dropdown-menu` | Restyle only. `#currentLangLabel` text is written by `i18n.js:312`. |
| Theme toggle | `#themeBtn` | Restyle only. The Stitch's `onclick="window.toggleTheme()"` and `html.light-theme` class are **not adopted** — they would create a second theming system (I14, I14 collision with `Theme`). |
| — | `.perf-pill` + `.perf-dropdown-menu` | Restyle only. `data-perf-val` values and `.show` toggle preserved. |

### 5.3 Preserved navbar contracts

- `.nav` stays `position: sticky`, `top: 12px`, `z-index: var(--z-sticky)` (= 50). Never `fixed`, never
  `absolute`.
- `.nav-bar` keeps `height` (now driven by `--nav-h`), `backdrop-filter: blur(16px)`, and the `≤640px`
  mobile height override.
- `.nav-tabs` remains `position: absolute; left: 50%; transform: translateX(-50%)` — it depends on `.nav`
  being a positioned ancestor for stickiness.
- The `≤900px` rule that sets `.nav-tabs { display: none }` and the `≤640px` rule that sets the mobile nav
  height are **behavior, not chrome**, and are preserved unchanged (see §9).

## 6. Home Page Mapping

**NOTE:** The Hero section (`.hero-max` and all descendants) is FROZEN per D8/I21 and is NOT part of this
mapping. Only the following Home page areas are redesigned: `.resources-section`, `.bottom-grid`,
`#resultsBox`, `.status-bar`.

### 6.1 Section-by-section

| `home.js` renderer | Section | Change |
|---|---|---|
| `renderHeroSection` | `.hero-max` | **FROZEN — NOT REDESIGNED (D8/I21).** Retained verbatim from the pre-change state: `.hero-bg` > `.logo-shader` (`aria-hidden`), `.hero-pill` + `.hero-pill-dot`, `h1`, `.hero-desc`, `.hero-search`, `#globalSearch`, `#searchBtn`, `#stopBtn`, `#logoSwap` + both `.logo-layer` images. See the Hero Section Freeze Strategy section. |
| `renderResourcesSection` | `.resources-section` | Restyle `.section-head`, `.section-icon`, `.section-title`, `.section-sub`, `.section-controls`, `.filter-dropdown-wrap`, `.filter-pill`, `.view-toggle`, `.vt-btn`, `#resourcesGrid`. |
| `renderResourceCards` | `.resource-card` | Stitch card chrome applied to the existing grid: rounded `--radius-lg`, `--surface-container-low` fill, hairline border, amber border + `--glow-amber` on hover, `--inset-highlight` top edge. **All data remains `ResourceService`-driven.** |
| `renderBottomSection` | `.bottom-grid` / `.panel` | Restyle `.panel-head`, `.panel-icon`, `.panel-title`, `.panel-sub`, `.os-tabs`, `.panel-link`, `.releases-table`, `.quick-list`, `.quick-item`. |
| `renderSearchResultsPanel` | `#resultsBox` | Restyle only. `#resultsTitle`, `#progress`, `#resultsList` preserved. `resultsBox.scrollIntoView({behavior:"smooth"})` at `home.js:990` is unchanged. |
| `renderStatusBar` | `.status-bar` | Restyle only. `#lastSyncTime` preserved; the three inline `background` colors on `.status-dot` map onto `--tertiary-container` / `--primary-container` / `--secondary-container`. |

### 6.2 Id and hook preservation

Every id in I6 that belongs to Home survives: `#globalSearch`, `#searchBtn`, `#stopBtn`, `#logoSwap`,
`#resourcesGrid`, `#catFilterWrap`, `#sortFilterWrap`, `#refreshResourcesBtn`, `#viewGridBtn`,
`#viewListBtn`, `#releasesContainer`, `#releasesBody`, `#releaseAuthAction`, `#viewAllReleases`,
`#releaseLogoutBtn`, `#quickAccessList`, `#resultsBox`, `#resultsTitle`, `#progress`, `#resultsList`,
`#lastSyncTime`, `#osTabs`.

### 6.3 `.input-wrap` ancestor — load-bearing

`autocomplete.js:147` does `input.closest('.input-wrap')` and returns early if absent;
`autocomplete.js:150-155` then finds or creates `.ac-dropdown` **inside that wrapper**. Any Phase 4 markup
edit that moves `#globalSearch` out of `.hero-search > .input-wrap`, or restructures the wrapper such that
`.input-wrap` is no longer an ancestor, silently disables autocomplete. This is a hard constraint on Phase
4.

`.ac-dropdown` additionally depends on `.hero-max { overflow: visible !important }` (`components.css:626`)
so it can escape the hero panel, and on the `.hero-search` / `.input-wrap` `z-index: 1000 !important`
stacking chain. Both must survive.

### 6.4 Auth modal call sites

`showLoginModal` is reachable from three distinct places, all of which must keep working:

1. `home.js:564` — an inline `onclick` inside the locked-state markup generated by `loadReleasesTable`.
2. `home.js:763` — the `[data-url]` download-interception path (dead, but the call site exists).
3. `browse.js:241-247` — the Browse locked state, which tries `HomePage.showLoginModal`, then
   `window.triggerAuthModal`, then `Router.navigate("/")`.

`window.triggerAuthModal = showLoginModal` (`home.js:1113`) is a cross-module contract between `home.js` and
`browse.js`. Phase 4 preserves it; no new `window.*` global is introduced (I14).

### 6.5 Markup edit whitelist

Phase 4 may change, in the Home render functions only: class names, wrapper `<div>` elements, inline
decorative `style` attributes, and inline SVG markup. It may **not** change: ids, `data-*` attributes,
`data-i18n*` attributes, element counts that JS depends on, or the `textContent` of any element JS reads.
The two existing hard-coded English sort-option labels (`home.js:126`, `home.js:130`) are a recorded
pre-existing defect and are **not** fixed here (authoring rule 7).

### 6.6 Content discipline

No Stitch string, count, date, chip, link, or claim ships. The resource cards render from
`ResourceService.getResources()`; every label renders from `getDict()`. The banned set in D3 is asserted by
grep in Phase 7.

## Hero Section Freeze Strategy

The entire `.hero-max` section of the Home page is frozen per D8/I21. This means:

1. **No CSS restyle.** All existing CSS rules targeting `.hero-max`, `.hero-title`, `.hero-subtitle`,
   `.hero-pill`, `.hero-visual`, `#globalSearch`, `#searchBtn`, `#stopBtn`, `#logoSwap`, `.search-keys`, and
   their descendants remain byte-identical.
2. **No markup change.** The `HomePage.render()` function's Hero-emitting code path is untouched.
3. **Token insulation.** If Phase 1 changes token values that the Hero's CSS currently consumes (e.g.,
   `--text`, `--bg`, `--glow`), the Hero's CSS rules must be updated to use explicit hardcoded values matching
   the pre-redesign computed values, so the Hero's appearance does not drift. This is the ONLY permitted CSS
   change in the Hero area: pinning tokens to literals to prevent drift.
4. **Autocomplete preservation.** The `.ac-dropdown` rendered inside `.hero-max` by `Autocomplete.bind()` is
   frozen. The `.ac-dropdown` rendered elsewhere (if any) may be restyled in Phase 6.
5. **Responsive preservation.** The ≤1024 hero stacking and ≤640 `.search-keys` hiding rules remain
   byte-identical.

### Token Drift Risk

The Hero currently consumes these tokens (verify during Phase 1):

- `--text`, `--text-2`, `--text-3` (headline and subtitle colors)
- `--bg`, `--bg-card`, `--bg-input` (search field background)
- `--border`, `--border-focus` (search field border)
- `--glow`, `--glow-strong` (hero ambient glow)
- `--hero-grad` (hero gradient)
- `--shadow-md`, `--shadow-lg` (search field shadow)
- `--radius-lg`, `--radius-xl` (search field radius)
- `--font`, `--font-mono` (typography)

If any of these change in Phase 1, Phase 4 must pin the Hero's rules to the old computed values BEFORE
changing the tokens' global values. This ensures the Hero remains visually identical while the rest of the app
adopts the new palette.

## 7. Browse Page Mapping

### 7.1 Row chrome only

The Browse redesign is a **chrome** restyle. The row's structure, child count, child order, and target
attributes are frozen by I3 and I4.

```
.trow (6 children, fixed order)
  1  .f-icon > a.f-icon-link          ← same href as child 2; data-file on files
  2  .f-name > a.f-link               ← same href as child 1; data-file on files
  3  div > span.badge.badge-dir|badge-file
  4  .f-sub                           ← localized date
  5  .f-sub                           ← localized size, or em dash for directories
  6  .f-actions                       ← FileActions.render(); EMPTY for directories
```

Child 6 is empty for directories **deliberately and structurally**: it preserves the uniform child count so
the header row and every data row share the same six grid tracks. This is documented in `browse.css:170-176`
and in the archived `file-actions` spec.

### 7.2 Grid coupling — three places, one contract

The 26 px action track is pinned in **three coupled locations**:

| Location | Declaration |
|---|---|
| `browse.css:177` (desktop) | the six-track row template ending in the 26 px action track |
| `browse.css:492` (the `≤640px` block) | the three-track collapsed template ending in the same 26 px track |
| `browse.css:325-338` | `.f-action { width: 26px; height: 26px }` |

The in-file comment at `browse.css:170-176` and `browse.css:490-491` states that if the action icon size
changes, **all three must change together**, or directory and file rows drift apart and the header
misaligns. Phase 5 preserves all three at 26 px. Any future icon-size change is a separate change.

### 7.3 `nth-child` coupling

Three rules address cells by ordinal, and a redesign that changes child count breaks all of them:

| Rule | Purpose |
|---|---|
| `browse.css:205-212` | `nowrap` + `ellipsis` on children 3/4/5 |
| `browse.css:456-460` | `display: none` on children 3/4/5 in `grid-mode` |
| `browse.css:497-501` | `display: none` on children 3/4/5 at `≤640px` |

### 7.4 Three independent targets

`.f-icon-link` (child 1) and `.f-link` (child 2) resolve to the **identical** `href`, computed once in
`browse.js:360-368`. Neither wraps the other; the row itself is not clickable. Their accessible names
differ — the icon target's is composed from `d.btnOpen` / `d.btnDownload` plus the item name, so a screen
reader can distinguish two links to the same destination. Both icons are `aria-hidden="true"`.

Phase 5 changes only how these three targets **look**. Activation semantics, nesting, tab order, and names
are untouched.

### 7.5 `≤640px` collapse — restyled, not changed

At `≤640px` the row collapses from six tracks to `36px minmax(0,1fr) 26px`, children 3/4/5 are hidden, and
`.thead` is hidden entirely. Phase 5 restyles the surviving three tracks' sizing, padding, and radius while
leaving the track count, the collapse width, the hidden ordinals, and the `.thead` hiding untouched.

### 7.6 Sort semantics

`browse.js:310-315` bubbles directories above files **regardless of the selected sort**. This is existing
verified behavior and is preserved. `activeType` and `activeSort` are module state reset on every `render()`;
`view_mode` persists in `localStorage` and is restored by programmatically clicking `#viewGrid` at bind time.

## 8. Overlays & States Mapping

### 8.1 Auth modal

`.auth-overlay` / `.auth-modal` / `.btn-close-modal` / `.auth-form` / `.auth-error` currently live in
`home.css:1462-1630`; Phase 6 restyles them **in place** rather than relocating them, so the cascade order
relative to `.panel` and `.results-panel` is unchanged.

Frozen behaviors:

- **I19 / HARD GATE** — the overlay is appended to `document.body`, not `#app`, so a router re-render cannot
  destroy an open modal. This is `home.js:1071`.
- **I19 / HARD GATE** — the close delay is exactly **250 ms** (`home.js:1076`), and the CSS `opacity`
  transition on `.auth-overlay` is exactly **250 ms**. If Phase 6 restyles the transition, the duration must
  remain 250 ms or the modal pops.
- The `#authOverlay` idempotency guard (`home.js:1039`) runs before any DOM work, so a second call while one
  is open is a no-op.
- Reveal is `requestAnimationFrame` → add `.show`; the backdrop animates `opacity` + `pointer-events`, the
  box animates `transform`.
- Backdrop click closes only when `e.target === overlay`.

Restyling applies: `--surface-container-high` modal fill, `--radius-xl`, `--shadow-modal` (D4's elevation,
replacing `--shadow-xl`), an `.auth-modal::before` amber/indigo aurora, `--inset-highlight` on the header, and
`--primary-container` for the submit button.

Note that `.auth-overlay { backdrop-filter: blur(12px) }` is currently **not** gated by any perf tier. I12
requires Phase 6 to add `low`/`potato` overrides for it.

### 8.2 Dropdowns

Four dropdowns with **three different** hidden-state mechanisms coexist today. The redesign preserves each
mechanism rather than unifying them, because unifying would change hit-testing and focus behavior:

| Dropdown | Owner | Open mechanism | Hidden via |
|---|---|---|---|
| `.filter-dropdown-menu` | `.filter-dropdown-wrap` | `.show` on the **wrapper** | `opacity` + `visibility` |
| `.perf-dropdown-menu` | `.perf-dropdown-wrap` | `.show` on the **wrapper** | `opacity` + `visibility` + `pointer-events` |
| `.lang-dropdown-menu` | — | **CSS `:hover` only** | `opacity` + `visibility` |
| `.ac-dropdown` | itself | `.show` | `opacity` + `pointer-events` |

The `.filter-value[data-val]` and `.filter-option[data-val]` vocabulary is frozen: `all` / `directory` /
`file` for type, and `name-asc` / `name-desc` / `date-desc` / `date-asc` / `size-desc` for sort, plus Home's
`latest` / `name-asc` / `count-desc`. `bindFilterEvents` dispatches on `wrap.id` (`typeFilterWrap` /
`sortFilterWrap`), and `populateCategoryFilter` rebuilds `#catFilterWrap .filter-dropdown-menu` by DOM API —
so both the ids and the menu's position in the DOM are contractual.

A pre-existing accessibility gap is recorded and **not** fixed: `#langBtn` ships `aria-expanded="false"` and
no code ever updates it, because the menu is hover-only. Authoring rule 7 forbids accessibility work beyond
preservation, so Phase 6 restyles the menu and leaves the gap.

### 8.3 Loading, empty, error, locked states

| State | Markup owner | Classes |
|---|---|---|
| Browse skeletons | `browse.js:557-576` | `.trow`, `.skeleton-box`, `.skeleton-line`; six rows; `pointer-events: none` |
| Home skeletons | `home.js:297-314` | `.resource-card-skeleton[aria-busy]`, `.skeleton-box`, `.skeleton-line` |
| Browse empty | `browse.js:578-591` | `#empty`, `.empty-circle[.err]`, `.empty-text` |
| Home empty | `home.js:351` | `.ac-empty` |
| Error | `home.js:442-447`, `browse.js:268-276` | `.resources-error` |
| Browse 404 | `browse.js:253-266` | in-page `.resources-error`; **no redirect**; escaped `relPath` in a `<code>` |
| Browse 401 / locked | `browse.js:220-251` | `.locked-state`, `.locked-icon`, `.locked-title`, `.locked-desc`, `#browseAuthBtn` |
| Home locked | `home.js:554-567` | `.locked-state` + inline `onclick` to `showLoginModal` |

All are restyled in place. `#browseAuthBtn`'s handler chain and the Browse 404's no-redirect rule are
behavior and are preserved.

## 9. Performance / RTL / Responsive Strategy

### 9.1 Perf-tier parity (I12)

`performance-modes.css` already overrides many of the selectors this change will restyle, using
`!important`. The rule is: **for every new or restyled rule that uses `backdrop-filter`, `blur`,
`animation`, `transition`, or `box-shadow`, a matching `[data-perf="low"]` and `[data-perf="potato"]` override
must exist by the end of Phase 7.**

Phase 7 delivers this by auditing every selector introduced or modified in Phases 2–6 against the existing
override list. The audit is grep-verifiable: each new effect-bearing selector must appear in
`performance-modes.css` under both tier blocks.

`data-perf` is set pre-paint by the inline head script (`index.html:73`) and is forced to `low` when
`prefers-reduced-motion: reduce` matches — so the tier system doubles as the reduced-motion path.

### 9.2 RTL parity (I13)

`i18n.js:289` sets `document.documentElement.dir` from `d.dir`. RTL is mirrored today by scattered
`[dir="rtl"]` blocks plus JS branches that read `d.dir` (breadcrumb chevron direction at `browse.js:496-498`,
table cell alignment at `home.js:614` and `:700`, modal close-button side at `home.js:1049`, toast
centring at `performance-modes.css:435-443`).

Phase 7 adds a `[dir="rtl"]` mirror for every new direction-sensitive layout rule. Direction-sensitive means:
any rule using `flex-direction: row`, logical-vs-physical side properties (`left`/`right`, `margin-left`/
`margin-right`, `border-left`/`border-right`, `padding-left`/`padding-right`, `text-align: left/right`),
`transform: translateX(...)`, or `float`.

Preferring logical properties (`margin-inline`, `padding-inline`, `border-inline-start`, `text-align: start`)
in new rules **reduces** the number of required mirrors and is the preferred authoring choice for Phases 2–6
wherever it does not require rewriting an existing physical-property rule.

### 9.3 Responsive parity

All six existing breakpoints are preserved: `min-width: 1440px`, `max-width: 1024px`, `max-width: 900px`,
`max-width: 768px`, `max-width: 640px`, `max-width: 480px`, plus the `hover: none` and
`prefers-reduced-motion` blocks. No breakpoint value is changed and no breakpoint is added.

The following are **behavior** and are preserved exactly:

| Breakpoint | Preserved behavior |
|---|---|
| ≤900px | `.nav-tabs { display: none }` — the primary nav is removed on mobile, with no hamburger or off-canvas replacement. A narrower redesigned header must not reflow `.nav-bar` past its 56 px / 52 px height or cause horizontal overflow. |
| ≤640px | `.nav-bar` height drops to the mobile value; `.search-keys` hides. |
| ≤640px | `.file-tbl .trow` collapses to three tracks; children 3/4/5 hide; `.thead` hides. |
| ≤640px | `.section-controls .view-toggle { display: none }`. |
| `hover: none` | `.f-actions` forced to `opacity: 1; pointer-events: auto` so touch devices see the Download control. |

Phase 7 verifies each breakpoint renders correctly in both themes and both directions.

## 10. i18n Strategy

### 10.1 New keys

The redesign is a **visual** change and introduces **no new user-visible copy**. Therefore Phase 8 is expected
to add **zero** keys, and `tasks.md` Phase 8 treats "no new keys needed" as the passing outcome.

Two verified facts support this:

1. Every static string in `index.html` already carries a `data-i18n` attribute resolved from an existing key
   (`brand`, `subtitle`, `website`, `docs`, `downloads`, `perfLabel`, `perfAuto`, `perfHigh`, `perfMed`,
   `perfLow`, `perfPotato`).
2. Every dynamic string in `home.js` and `browse.js` is already interpolated from `getDict()`.

If Phase 4 or Phase 5 introduces any genuinely new visible label, I11 requires a `data-i18n*` attribute on
static markup and keys in **both** `i18n.en` and `i18n.fa`, added in Phase 8.

### 10.2 Structural parallelism

`i18n.js` declares two objects, `en` and `fa`, with identical key sets (roughly 95 keys each). The existing
convention is that `dir` and `lang` differ and **everything else mirrors**. Any additive change in Phase 8
must add the key to both objects at a mirrored position and must not delete, rename, or reword any existing
key (I10).

This is mechanically verifiable: the sorted key sets of `i18n.en` and `i18n.fa` must be equal.

### 10.3 Re-render contract

`i18n.js:341-347` — a language change calls `Router.refresh()`, which re-renders the current route and then
re-runs `applyLang()`. Consequences the redesign must not break:

- Dynamic content must be rebuilt from `getDict()`, never left as English literals.
- The two existing hard-coded English sort options in `home.js` stay as-is (recorded pre-existing defect).
- `document.documentElement.lang` / `.dir` must keep being set by `applyLang()` so the self-hosted
  Vazirmatn rule (`base.css:39`) activates.

## 11. Contract Preservation Map

| Contract | Phase 0 summary | Design response | Enforced by |
|---|---|---|---|
| **C1** Router link interception | Global `document` click interceptor decides SPA-nav vs native download | No row/card target changes its `href` source or gains/losses `data-file`; `href="#"` placeholders never enter the app | I4; `browse-page` HARD GATE |
| **C2** Browse row cell order | 6 children, fixed order; `nth-child(3\|4\|5)` rules; 26 px pinned track; two coupled grid templates | Chrome restyle only. Child count, order, and all three coupled declarations preserved | I3; `browse-page` HARD GATE ×3 |
| **C3** Three independent targets | Icon and name resolve to the identical href; no nesting; rows not clickable | Visual restyle only. Nesting structure, `href` agreement, and accessible-name composition untouched | `browse-page` scenarios |
| **C4** Download marker | `data-file="true"` is the router bypass; every file target carries it | No target's attributes change; no reliance on extending the extension regex | I4; `browse-page` HARD GATE |
| **C5** URL construction | All URLs from `ResourceService.browseHref` / `downloadHref`; no concatenation | No new URL construction anywhere in the redesign | `browse-page`, `home-page` |
| **C6** `#app` is the only router mount | Router captures `getElementById("app")` once; replaces only its `innerHTML` | `#app` keeps no `overflow` and no layout CSS; `.nav`/`.footer` stay siblings | I2, I5; `navbar` HARD GATE |
| **C7** Sticky navbar integrity | `.nav` sticky at `top: 12px`, `z-index: 50`, against the root scroller; breaks if `.page`/`#app` gain `overflow` | Pill geometry and offset unchanged; `--z-sticky` reproduces 50 exactly; full-bleed variant rejected on I1 grounds | I1, I2; `navbar` HARD GATE ×2 |
| **C8** i18n application | Two mechanisms: static `data-i18n*` and dynamic `getDict()` at render time | No new copy; existing keys unchanged; both dictionaries stay parallel | I11; `i18n-keys` |
| **C9** Dropdown visibility | Three different hidden-state mechanisms; `.show` on the wrapper for filter/perf; `:hover` for lang | Each mechanism preserved rather than unified; `.show` stays on the wrapper | I8; `overlays-and-states` |
| **C10** Auth modal lifecycle | `document.body` append, `#authOverlay` guard, 250 ms close delay matched to the CSS transition | Restyle in place; duration and append target unchanged | I19; `overlays-and-states` HARD GATE |
| **C11** Performance tiers | `[data-perf]` gates heavy effects via `!important` overrides | Every new effect gets `low` + `potato` overrides by Phase 7 | I12; `performance-rtl-responsive` |
| **C12** Event-listener lifetime | `document`/`window` listeners stack per render (3 known leaks) | No new per-render global listener; no new `window.*` global | I14, I15; `performance-rtl-responsive` |
| **C13** — Hero section freeze | D8, I21 | Hero DOM, CSS, and behavior remain byte-identical; token drift compensated by pinning |

## 12. Rejected Alternatives

- **Tailwind (CDN or self-hosted)** — the CSP's `script-src 'self'` blocks the CDN outright and the CDN also
  requires `eval`; self-hosting would introduce a build step into a zero-build project and a new dependency
  (D1, I16).
- **WebGL shader backdrop** — adds a permanent `requestAnimationFrame` GPU budget, a `ResizeObserver` sizing
  loop, and a `mousemove` listener, with no analogue in the application and no perf-tier story (D5).
- **New sidebar / drawer / off-canvas** — no sidebar exists today, so adding one is net-new UX rather than a
  visual redesign, and the brief's "preserve sidebar behavior" premise does not apply (D2).
- **Framework or bundler introduction** — no build step exists in `package.json`, and I16 forbids adding
  one.
- **CSP relaxation** — would be a backend change under `lib/http-utils.js`, explicitly out of scope, and
  would weaken a deliberate security boundary (D1, I16).
- **Full-bleed sticky navbar** — requires either `top: 0`, violating I1's locked `top: 12px`, or hoisting the
  header out of `.page`, changing the sticky containing block and risking I2.
- **Tailwind-style `commandInput` + global `/`, `⌘K`, `Escape` handlers** — `⌘K` and `Escape` already have
  live handlers; a second set would double-fire and a global `/` shortcut is net-new behavior (I14, I15).
- **Stitch footer with compliance badges** — every claim is fabricated and unbacked; D3 bans the entire set.
- **Reusing the Stitch's remote logo and emblem images** — CSP `img-src 'self' data: blob:` blocks
  `lh3.googleusercontent.com`; the existing `/assets/icon/*.webp` assets are used instead.
- **Rebuilding the Browse row as a Stitch-style card grid** — would violate I3's six-child order and the
  coupled grid templates; the card aesthetic is delivered only as a restyle of the existing `.grid-mode`
  variant.
- **Redesigning the Home Hero section** — superseded and now prohibited. The Stitch's hero treatment
  (gradient headline, command-search bar, floating 3D emblem) was originally in scope for §6, but D8/I21
  freeze `.hero-max` and all descendants. Phase 4 delivers only the resources grid, bottom grid, results
  panel, and status bar.
- **Fixing the pre-existing defects found in Phase 0** — out of scope per authoring rule 7; the redesign must
  neither fix them nor make them more likely to trigger.

## 13. Deviations from the Authoring Prompt

Recorded per authoring rule 9. No `openspec/AGENTS.md` exists and `openspec/config.yaml` is the unmodified
template, so the operative project convention is the existing `browse-file-actions` change plus the
`openspec` CLI v1.13.1 validator itself. Where the prompt's template conflicted with either, the project
convention was preferred.

- **D-1 — Spec section header.** The prompt's spec template specified a `## Requirements` section. The
  validator rejects that: `openspec validate --strict` emits `Requirement "…" is under "## Requirements",
  which is not a delta section, so it is ignored` and the capability parses as **zero** requirements. The
  existing `browse-file-actions/spec.md` uses `## ADDED Requirements`. All nine specs therefore use
  `## ADDED Requirements`. Without this the change would validate as valid while containing **no machine-
  readable requirements at all** — the exact failure mode `openspec archive` would silently miss.
- **D-2 — Spec document title.** The prompt's template specified `# Capability: <Name>`; the existing change
  uses `# Spec Delta: <capability>`. The prompt's form was kept because it is more accurate for a change
  that introduces nine wholly new capabilities, and because the validator does not constrain the H1. Only
  the H2 delta section needed correcting (D-1).
- **D-3 — Task line format.** The prompt's template numbered tasks as `N.1`, `N.2`. The validator warns
  `This change counts as 0 tasks: no line in its tracked task files is a checkbox`, which makes
  `openspec list`, `openspec status`, and `openspec archive` report no work. The existing change uses
  `- [x] 1.1 …`. All 122 tasks are therefore written as `- [ ] N.M …`, preserving the required numbering and
  adding the checkbox the toolchain needs. All are unchecked, since no phase is approved or started.
- **D-4 — Light-theme values.** The prompt fixes D4's light-theme *derivation rule* but forbids inventing
  values. Rather than invent hex values, `design.md` §2.6 specifies that the light block reuses the
  **already-present** light-theme declarations in the current `tokens.css` for every token D4 does not pin.
  This is a derivation decision and is raised as OQ-1 and OQ-8 for confirmation.

### 13.1 Validation evidence

`openspec validate enterprise-ui-redesign --strict` → `Change 'enterprise-ui-redesign' is valid` (exit code
`0`) after applying D-1 and D-3.

`openspec show enterprise-ui-redesign --json --deltas-only` → **94 requirements / 361 scenarios** across nine
capabilities. Every requirement carries at least two scenarios; the minimum observed is two.

| Capability | Requirements | Scenarios | HARD GATE refs |
|---|---:|---:|---:|
| `design-tokens` | 5 | 18 | 0 |
| `typography` | 6 | 22 | 0 |
| `backdrop` | 8 | 27 | 0 |
| `navbar` | 9 | 36 | 2 |
| `home-page` | 14 | 52 | 1 |
| `browse-page` | 13 | 56 | 7 |
| `overlays-and-states` | 15 | 56 | 6 |
| `performance-rtl-responsive` | 15 | 56 | 11 |
| `i18n-keys` | 9 | 38 | 2 |
| **Total** | **94** | **361** | **29** |

## Open Questions

See `proposal.md` §Open Questions for OQ-1 … OQ-6. Design-specific elaboration:

- **OQ-7 — `.grid-mode` as the Stitch-style card surface.** The Stitch's 3-column card grid is the closest
  visual match to Browse. The design delivers it by restyling the **existing** `.grid-mode` variant rather
  than introducing a new mode, because a new mode would need new state, new persistence, and new controls.
  Confirm that Browse's card aesthetic is acceptable as a *variant* of the existing view toggle rather than
  as a replacement default.
- **OQ-8 — `--text-4` muted-text target.** Mapping `--text-4` to `--outline` at reduced alpha (a `derive`)
  rather than to `--outline-variant` is a contrast judgment made in Phase 1 and verified in Phase 7. Confirm
  acceptable, or supply the intended muted tone.