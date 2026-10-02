# Proposal: Enterprise UI Redesign ("Obsidian Kinetic")

## Why

The CloudAvid File Portal's presentation layer is being brought to an enterprise visual standard using
`template/new-home.html` as the visual and UX reference. This is a **visual redesign that preserves 100% of
existing behavior**: every user-visible behavior, DOM/JavaScript contract, data flow, API interaction,
routing semantic, authentication/authorization behavior, i18n key, scroll/sticky behavior, responsive
behavior, and accessibility contract that exists today continues to function unchanged. Only the
presentation layer — design tokens, typography, backdrop, navbar chrome, page chrome, and state styling —
changes. The redesign is expressed entirely inside the existing six-stylesheet, zero-build CSS system and
the live tokens in `assets/css/tokens.css`.

## What Changes

- **Design tokens** — replace the live token values in `assets/css/tokens.css` with the authoritative
  "Obsidian Kinetic" palette; add a structurally parallel `[data-theme="light"]` block; add the typography,
  radius, spacing, and z-index scales; add a `--nav-h` token; deprecate dead tokens.
- **Typography** — self-host Inter, JetBrains Mono, and Vazirmatn as `.woff2` under `assets/fonts/`;
  declare `@font-face` with `font-display: swap`; remove the CSP-blocked Google Fonts `<link>` tags from
  `index.html`; re-point the five existing font tokens.
- **Backdrop** — restyle the existing `.aura-backdrop` / `.aura-base` / `.aura-glow-1` / `.aura-glow-2` /
  `.aura-vignette` layers with pure CSS to evoke the Obsidian Kinetic feel, gated by `[data-perf]` tier
  overrides.
- **Navbar** — restyle `.nav`, `.nav-bar`, `.nav-logo`, `.nav-tabs`, `.nav-tab`, `.nav-actions`,
  `.perf-pill`, `.perf-dropdown-menu`, `.lang-dropdown-wrap`, `.lang-dropdown-menu`, and the theme button
  chrome, preserving `position: sticky; top: 12px`, every id, and every `data-*` contract.
- **Home page** — restyle the resource cards and results panel; permitted presentational markup edits in
  `assets/js/home.js` render functions limited to class names, wrapper elements, and inline decorative styles.
- **Home page pruning** — **remove** the bottom grid (Latest Releases, Quick Access), the releases auth UI,
  and the status bar (including `#lastSyncTime` and `updateLastSyncTime()`) from both `home.js` and
  `home.css`. See D10.
- **Enterprise footer** — **add** a real, fully bilingual four-column CloudAvid footer to the application
  shell in `index.html`, styled in `components.css` with the Obsidian Kinetic palette, every string routed
  through `data-i18n`. See D10.
- **Hero section (Home page):** EXPLICITLY EXCLUDED — frozen, no changes permitted (see D8, I21).
- **Browse page:** EXPLICITLY EXCLUDED — frozen, no changes permitted (see D9, I22). Phase 5 cancelled.
- **Overlays and states** — restyle the auth modal, all four dropdowns, skeletons, empty states, error
  states, and the locked/auth-required state, preserving the 250 ms close delay and the `.show` toggle.
- **Performance / RTL / responsive** — add a `[data-perf]` tier override for every new effect, a
  `[dir="rtl"]` mirror for every new direction-sensitive layout rule, and preserve all six responsive
  breakpoints and the `@media (hover: none)` action fallback.
- **i18n keys** — add any new user-visible strings as keys in **both** the `en` and `fa` dictionaries,
  keeping the two structurally parallel.

## Impact

### Affected files by phase

| Phase | Files allowed to change |
|---|---|
| 1 — Design Tokens + Fonts | `assets/css/tokens.css`, `assets/fonts/*` (new), `index.html` (font `<link>` tags only) |
| 2 — Backdrop & Shell Base | `assets/css/base.css`, `assets/css/home.css`, `assets/css/performance-modes.css` |
| 3 — Navbar Redesign | `assets/css/components.css`, `assets/css/tokens.css`, `assets/css/performance-modes.css`, `index.html` (class additions only, each documented) |
| 4 — Home Page Redesign | `assets/css/home.css`, `assets/css/components.css`, `assets/js/home.js` (presentational markup only), `assets/css/performance-modes.css` |
| 5 — Browse Page Redesign | `assets/css/browse.css`, `assets/js/browse.js` (row chrome only), `assets/css/performance-modes.css` |
| 6 — Overlays & States | `assets/css/home.css`, `assets/css/components.css`, `assets/css/browse.css`, `assets/css/performance-modes.css` |
| 7 — Performance, RTL, Responsive Parity | `assets/css/performance-modes.css`, `assets/css/components.css`, `assets/css/home.css`, `assets/css/browse.css`, `assets/css/base.css` |
| 8 — i18n Keys & Final Verification | `assets/js/i18n.js` (additive keys only) |

### Files explicitly NOT changing

- Every file under `lib/` — `api-router.js`, `auth-service.js`, `files-service.js`, `hash-password.js`,
  `http-utils.js`, `idle-timer.js`, `load-env.js`, `logger.js`, `rate-limiter.js`, `static-handler.js`.
- `assets/js/router.js`
- `assets/js/services/resource-service.js`
- `assets/js/file-actions.js` (including its `ACTIONS` array)
- `assets/js/theme.js` (persistence and wipe behavior)
- `assets/js/autocomplete.js` (semantics)
- `assets/js/i18n.js` — existing keys and values (additive new keys only, Phase 8)
- `lib/idle-timer.js` / `assets/js/lib/idle-timer.js`
- `template/new-home.html` (reference only)
- `browse.html` (dead file, D7)
- `index.html` — server-rendered contracts: the `<main id="app">` mount, the script load order, and the
  inline pre-paint theme/perf resolution script
- `package.json`
- `server.js`
- `nginx.conf`
- `lib/http-utils.js` CSP header
- `Doxyfile`, `skills-lock.json`, `.env`, `data/users.json`, `docs/*`

## Locked Decisions

The following decisions are locked, approved, and reproduced verbatim. They are not to be re-litigated,
reopened, or qualified.

### D1 — CSS Strategy

Zero-build, hand-written CSS. No Tailwind. No bundler. No new dependency in `package.json`. No change to
`lib/http-utils.js` CSP header. All visual work is expressed through the existing six-stylesheet system and
the live tokens in `assets/css/tokens.css`.

### D2 — Sidebar

No sidebar exists and none will be added. The shell remains: floating sticky navbar + `#app` + hidden
footer.

### D3 — Mock Data

Every string, count, link, date, chip, and compliance claim from `template/new-home.html` is
reference-only. None of them ship. All content comes from `ResourceService` or `i18n`. The following
claims are explicitly BANNED from appearing anywhere in the implementation: `SOC 2`, `ISO/IEC 27001`,
`HIPAA`, `Tier-1 Infrastructure Carrier`, `Cryptographically Verified Release Mirrors`, `v4.8`,
`8 Packages`, fabricated card data.

### D4 — Theme ("Obsidian Kinetic")

Use the following palette **verbatim**. These are the authoritative values. Do not invent new values. Do not
tweak hex codes. Do not add colors not listed here except where explicitly marked `derive`.

#### Core Surfaces (dark theme — primary)

```
--surface:                      #121316
--surface-dim:                  #121316
--surface-bright:               #38393d
--surface-container-lowest:     #0d0e11
--surface-container-low:        #1b1b1f
--surface-container:            #1f1f23
--surface-container-high:       #292a2d
--surface-container-highest:    #343538
--surface-variant:              #343538
--background:                   #121316
```

#### Foreground

```
--on-surface:                   #e3e2e6
--on-surface-variant:           #d5c4ab
--on-background:                #e3e2e6
--inverse-surface:              #e3e2e6
--inverse-on-surface:           #2f3034
```

#### Outlines

```
--outline:                      #9e8f78
--outline-variant:              #514532
--border-hairline:              rgba(255, 255, 255, 0.07)  /* derive */
--border-active:                rgba(255, 184, 0, 0.35)    /* derive */
```

#### Primary — Cyber Amber (brand accent)

```
--primary:                      #ffdca1
--on-primary:                   #412d00
--primary-container:            #ffb800
--on-primary-container:         #6b4c00
--inverse-primary:              #7c5800
--primary-fixed:                #ffdea8
--primary-fixed-dim:            #ffba20
--on-primary-fixed:             #271900
--on-primary-fixed-variant:     #5e4200
--surface-tint:                 #ffba20
```

#### Secondary — Electric Indigo

```
--secondary:                    #c3c0ff
--on-secondary:                 #1d00a5
--secondary-container:          #3626ce
--on-secondary-container:       #b3b1ff
--secondary-fixed:              #e2dfff
--secondary-fixed-dim:          #c3c0ff
--on-secondary-fixed:           #0f0069
--on-secondary-fixed-variant:   #3323cc
```

#### Tertiary — Cyan Stream

```
--tertiary:                     #a5ebff
--on-tertiary:                  #003640
--tertiary-container:           #49d5f4
--on-tertiary-container:        #005969
--tertiary-fixed:               #acedff
--tertiary-fixed-dim:           #4cd7f6
--on-tertiary-fixed:            #001f26
--on-tertiary-fixed-variant:    #004e5c
```

#### Error

```
--error:                        #ffb4ab
--on-error:                     #690005
--error-container:              #93000a
--on-error-container:           #ffdad6
```

#### Glows (derive)

```
--glow-amber:                   0 0 16px -2px rgba(255, 184, 0, 0.25)
--glow-amber-strong:            0 0 12px rgba(255, 184, 0, 0.4)
--glow-indigo:                  0 0 16px -2px rgba(79, 70, 229, 0.25)
--shadow-modal:                 0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.08)
--inset-highlight:              inset 0 1px 0 rgba(255, 255, 255, 0.12)
```

#### Light theme

A light-theme variant of the same semantic tokens MUST be produced. Derive it from the Material-style tonal
relationships (swap `surface-container-*` to light tiers, flip `on-*` foregrounds, keep
`--primary-container: #ffb800` as the brand anchor). The light theme is secondary; the dark theme is
primary. Both must be structurally parallel.

### D5 — Backdrop

Restyle the existing `.aura-backdrop` / `.aura-base` / `.aura-glow-1` / `.aura-glow-2` with pure CSS
(radial-gradients + optional `backdrop-filter`) to evoke the Obsidian Kinetic feel. **No WebGL. No
`requestAnimationFrame`. No `ResizeObserver`. No `mousemove` listener. No `<canvas>` element.** Backdrop
effects must be gated by `[data-perf]` tier overrides in `performance-modes.css`.

### D6 — Fonts

Self-host fonts under `assets/fonts/`:
- **Inter** (weights 400, 500, 600) — primary UI typeface
- **JetBrains Mono** (weights 400, 500, 600) — monospace, telemetry, kbd, metrics
- **Vazirmatn** (weights 400, 500, 600) — Farsi/RTL text

Fonts load via `@font-face` from `/assets/fonts/*.woff2` with `font-display: swap`. Font files are added as
part of Phase 1. Google Fonts `<link>` tags in `index.html` are removed (they are already blocked by CSP
and currently fall back to system fonts).

### Typography Scale

```
--text-headline-xl:    2.25rem / 2.75rem / 600 / -0.03em   (Inter)
--text-headline-xl-mobile: 1.75rem / 2.25rem / 600 / -0.02em (Inter)
--text-headline-lg:    1.5rem  / 2rem    / 600 / -0.02em   (Inter)
--text-headline-sm:    1.125rem / 1.5rem / 500 / -0.01em   (Inter)
--text-body-lg:        0.9375rem / 1.5rem / 400 / 0        (Inter)
--text-body-md:        0.8125rem / 1.25rem / 400 / 0       (Inter)
--text-label-code:     0.75rem / 1rem / 500 / -0.01em      (JetBrains Mono)
--text-label-mono-sm:  0.6875rem / 0.875rem / 400 / 0.02em (JetBrains Mono)
--text-label-kpi:      1.25rem / 1.5rem / 600 / -0.03em    (JetBrains Mono, tnum)
```

### Radius Scale

```
--radius-sm:    0.125rem
--radius-DEFAULT: 0.25rem
--radius-md:    0.375rem
--radius-lg:    0.5rem
--radius-xl:    0.75rem
--radius-full:  9999px
```

### Spacing Scale

```
--space-xs:         0.25rem
--space-sm:         0.5rem
--space-md:         0.75rem
--space-lg:         1rem
--space-xl:         1.5rem
--gutter:           1rem
--gutter-desktop:   1.5rem
--margin:           1rem
--margin-desktop:   2rem
```

### Z-Index Scale (new)

```
--z-base:        0
--z-sticky:      50
--z-dropdown:    100
--z-dropdown-high: 200
--z-autocomplete: 1000
--z-banner:      9999
--z-debug:       99998
--z-toast:       99999
--z-modal:       999999
```

### D7 — `browse.html`

Dead and untouched. It is NOT part of this change. A later, separate change will handle it.

### D8 — Hero Section Frozen

The entire Home page Hero section is **out of scope** for this redesign. No visual, structural, markup, or
CSS change is permitted in this area.

**Frozen elements (exhaustive list):**

| Element | Selector / ID | File |
|---|---|---|
| Hero wrapper | `.hero-max` | `home.css`, `home.js` |
| Hero headline | `.hero-title`, `.hero-subtitle` | `home.css`, `home.js` |
| Hero pill / status badge | `.hero-pill`, `.hero-pill-dot` | `home.css`, `home.js` |
| Search field | `#globalSearch` and its `.input-wrap` ancestor | `home.css`, `home.js`, `components.css` |
| Search button | `#searchBtn` | `home.css`, `home.js` |
| Stop button | `#stopBtn` | `home.css`, `home.js` |
| Logo swap container | `#logoSwap` | `home.css`, `home.js` |
| Hero visual / emblem | `.hero-visual` and all children | `home.css`, `home.js` |
| Hero search keys hint | `.search-keys` | `home.css`, `home.js` |
| Autocomplete dropdown | `.ac-dropdown`, `.ac-list`, `.ac-item`, `.ac-empty` (when rendered inside `.hero-max`) | `components.css`, `autocomplete.js` |
| Hero gradient / glow | `.hero-grad`, any gradient overlay inside `.hero-max` | `home.css` |

**What "frozen" means:**

1. No CSS rule targeting any of the above selectors may be added, modified, or removed in any phase.
2. No markup change in `home.js` render functions that affects the Hero section's DOM structure, class names,
   IDs, `data-*` attributes, or text content.
3. No new token value may alter the Hero's appearance (the Hero must continue to use whatever tokens it
   currently uses, at their current computed values, even if those tokens change elsewhere — if a token
   change would visibly affect the Hero, the Hero's rules must be pinned to explicit values to compensate).
4. The Hero's responsive breakpoints (≤1024 stacking, ≤640 search-keys hiding) must remain byte-identical.
5. The Hero's `⌘K` keyboard shortcut handler must remain unchanged.
6. The `Autocomplete.bind()` contract on `#globalSearch` must remain unchanged.

**What is NOT frozen (still redesigned in Phase 4):**

- `.resources-section` (resource category cards grid)
- `.bottom-grid` (releases panel, quick access, OS tabs)
- `#resultsBox` / `#resultsList` (search results panel, when rendered below the Hero)
- `.status-bar` / `#lastSyncTime`
- All Browse page elements (Phase 5)
- Navbar (Phase 3)
- Overlays, modals, dropdowns outside the Hero (Phase 6)

### D9 — Browse Page Frozen

The entire Browse page is **out of scope** for this redesign. No visual, structural, markup, or CSS change is
permitted in any Browse-related area.

**Frozen elements (exhaustive list):**

| Element | Selector / ID | File |
|---|---|---|
| Browse layout | `.browse-layout` | `browse.css`, `browse.js` |
| Browse header | `.browse-head` | `browse.css`, `browse.js` |
| File table | `.file-tbl`, `.thead`, `.trow`, `#rows`, `#tableContainer` | `browse.css`, `browse.js` |
| File/folder rows | `.f-icon`, `.f-icon-link`, `.f-name`, `.f-link`, `.badge`, `.f-sub`, `.f-actions`, `.f-action` | `browse.css`, `browse.js`, `file-actions.js` |
| Breadcrumbs | `#breadcrumb`, `.crumbs`, `.crumb`, `.crumb-sep`, `.crumb-active`, `#folderName` | `browse.css`, `browse.js` |
| Browse search | `#localSearchInput` | `browse.css`, `browse.js` |
| Browse filters | `#typeFilterWrap`, `#sortFilterWrap` | `browse.css`, `browse.js` |
| Browse view toggle | `#viewList`, `#viewGrid` | `browse.css`, `browse.js` |
| Browse stats | `#folderCount`, `#fileCount` | `browse.css`, `browse.js` |
| Browse auth | `#browseAuthBtn` | `browse.css`, `browse.js` |
| Browse states | `.empty-box`, `.empty-circle`, `.empty-text`, `.locked-state`, `.resources-error` (in Browse context) | `browse.css`, `browse.js` |
| Browse skeletons | `.skeleton-box`, `.skeleton-line` (in Browse context) | `browse.css`, `browse.js` |
| Grid mode | `#tableContainer.grid-mode` | `browse.css`, `browse.js` |
| File actions | `FileActions.render()`, `.f-actions`, `.f-action` | `file-actions.js`, `browse.css` |

**What "frozen" means:**

1. No CSS rule in `browse.css` may be added, modified, or removed.
2. No markup change in `browse.js` render functions.
3. No change to `file-actions.js`.
4. The 6-child row contract, `data-file="true"` markers, three independent targets, folders-first sort,
   responsive collapse, and all Browse behavior remain byte-identical.
5. `browse.css` and `browse.js` are byte-identical to their pre-redesign state throughout all remaining
   phases.

**What is NOT frozen (still redesigned in remaining phases):**

- Auth modal (`.auth-overlay`, `.auth-modal`) — Phase 6
- Dropdowns outside Browse — Phase 6
- Skeletons/empty/error in Home context — already done in Phase 4
- Performance modes, RTL, responsive for non-Browse areas — Phase 7
- i18n keys — Phase 8

### D10 — Home Page Pruning & Enterprise Footer

Two coupled changes replace the placeholder footer with real content and remove the low-value Home panels
that the redesign could not improve.

**1. Pruning (deletions).** The following are permanently removed from the application:

| Removed | Identifiers / selectors |
|---|---|
| Bottom grid | `.bottom-grid`, `.panel`, `.releases-table`, `.res-row`, `#osTabs`, `#releasesContainer`, `#releasesBody`, `#quickAccessList`, `.quick-item` |
| Releases auth UI | `#releaseAuthAction`, `#viewAllReleases`, `#releaseLogoutBtn` |
| Status bar | `.status-bar`, `.status-item`, `.status-dot`, `#lastSyncTime`, and the `updateLastSyncTime()` logic in `home.js` |

These are ripped out of `assets/js/home.js` (render functions and logic) and `assets/css/home.css`.

**`showLoginModal` MUST remain intact.** `HomePage.showLoginModal` is a core logic contract, and
`window.triggerAuthModal = showLoginModal` is a cross-module contract consumed by the frozen Browse page
(`browse.js:241-247`). Only the Home page UI that *triggers* it is removed. The function, the
`window.triggerAuthModal` binding, and the auth API logic all survive, so the Browse locked state keeps
working. This is the reason the Browse freeze does not break authentication.

**2. Enterprise Footer (addition).** `index.html:243` already contains `<footer class="footer"
style="display:none">`. That placeholder becomes a real, fully bilingual, four-column CloudAvid footer:

| Column | Content |
|---|---|
| 1 — Brand / About | CloudAvid logo and the about text: cloud computing with over 15 years of experience, providing secure and scalable services in virtualization, cloud infrastructure, and enterprise support |
| 2 — Useful Links | Main Page (`/`), Contact Us (`#`), About Us (`#`), Blog (`#`), Documentation (`https://docs.cloudavid.com`), Rakaard (`https://rakaard.ir`), CloudAvid (`https://cloudavid.com`) |
| 3 — Contact | Phone `035-3106` / `021-66198680`, Email `info@cloudavid.com`, Address in Yazd, Safaieh |
| 4 — Socials / Trust | SVG placeholder icons for Telegram, LinkedIn, X, Github, plus trust-badge placeholders |

A copyright bar closes the footer: *"All rights reserved for CloudAvid."*

**Strictly bilingual.** Every string in the footer MUST use a `data-i18n` attribute. No hardcoded text ships in
the footer. The inline `style="display:none"` is removed as part of this work.

**Placement.** The footer is application **shell** content, not Home route content: it lives in `index.html`
beside `.nav` as a `#app` sibling (I5 — never moved into `#app`), and it is styled in
`assets/css/components.css`. Phase 5 implements it; Phase 8 adds the dictionary keys for both languages.

## Locked Invariants

The following invariants are non-negotiable acceptance conditions. Every requirement, scenario, and phase
definition must respect them. If any phase or task appears to violate one, that task is invalid and work
stops.

- **I1** — `.nav` remains `position: sticky; top: 12px; z-index: var(--z-sticky)`. Must remain visible during
  page scroll. Never `fixed`, never `absolute`.
- **I2** — `.page` and `#app` MUST NOT gain any `overflow` value. `body { overflow-x: hidden }` is
  preserved. `html` does not gain overflow.
- **I3** — Browse `.trow` keeps exactly 6 children in the exact order: `.f-icon` → `.f-name` → `.badge`
  wrapper → `.f-sub` (date) → `.f-sub` (size) → `.f-actions`. Both grid-template-columns blocks
  (`browse.css:177` and the ≤640 collapse) stay coupled. The 26px action track is pinned.
- **I4** — Every file target (icon link, name link, action link) keeps `data-file="true"`. Router bypass
  depends on it.
- **I5** — `#app` remains the single router mount. The `.nav` and `.footer` siblings must not be moved into
  `#app`.
- **I6** — Every ID consumed by JS must survive: `#themeBtn`, `#langBtn`, `#currentLangLabel`,
  `.lang-dropdown-menu`, `.perf-pill`, `.perf-dropdown-menu`, `.nav-tabs`, `.nav-tab`, `#globalSearch`,
  `#localSearchInput`, `#searchBtn`, `#stopBtn`, `#logoSwap`, `#resourcesGrid`, `#catFilterWrap`,
  `#sortFilterWrap`, `#refreshResourcesBtn`, `#viewGridBtn`, `#viewListBtn`,
  `#resultsBox`, `#resultsTitle`, `#progress`, `#resultsList`, `#rows`, `#tableContainer`,
  `#breadcrumb`, `#folderName`, `#folderCount`, `#fileCount`, `#typeFilterWrap`, `#viewList`, `#viewGrid`,
  `#browseAuthBtn`, `#authOverlay`, `#authModal`, `#authForm`, `#authUsername`, `#authPassword`,
  `#authError`, `#authSubmitBtn`, `#closeAuthBtn`.
  **Exception (D10):** `#releasesContainer`, `#releasesBody`, `#releaseAuthAction`, `#viewAllReleases`,
  `#releaseLogoutBtn`, `#quickAccessList`, `#lastSyncTime`, and `#osTabs` are deliberately **deleted** and
  are no longer under this guarantee.
- **I7** — Every `data-*` attribute consumed by JS must survive: `data-file`, `data-link`, `data-i18n`,
  `data-i18n-ph`, `data-i18n-html`, `data-val`, `data-perf-val`, `data-theme`, `data-perf`,
  `data-url` (even though dead, do not add new consumers).
  **Exception (D10):** `data-os` is used only by the OS tabs, which D10 deletes, so it is removed with them.
- **I8** — Every class used as a JS/CSS behavioral hook must survive: `.filter-dropdown-wrap`,
  `.filter-pill`, `.filter-value`, `.filter-option`, `.show`, `.grid-mode`, `.view-toggle`, `.vt-btn`,
  `.input-wrap`, `.ac-dropdown`, `.ac-list`, `.auth-overlay`, `.auth-modal`, `.locked-state`, `.empty-box`,
  `.empty-circle`, `.empty-text`, `.resources-error`, `.skeleton-box`, `.skeleton-line`,
  `.resource-card-skeleton`, `.wiping`, `.f-icon-link`, `.f-link`, `.f-action`, `.f-actions`, `.trow`,
  `.thead`, `.badge`, `.badge-dir`, `.badge-file`, `.f-sub`, `.crumb`, `.crumb-sep`, `.crumb-active`.
- **I9** — No change to any file under `lib/`.
- **I10** — No change to `assets/js/router.js`, `assets/js/services/resource-service.js`,
  `assets/js/file-actions.js` ACTIONS array, `assets/js/theme.js` persistence, `assets/js/autocomplete.js`
  semantics, `assets/js/i18n.js` dictionaries' existing keys/values, `assets/js/lib/idle-timer.js`.
- **I11** — Every new user-visible string must have a `data-i18n*` attribute AND corresponding keys in BOTH
  `i18n.en` and `i18n.fa`.
- **I12** — Every new CSS rule that uses `backdrop-filter`, `blur`, animation, or `box-shadow` must have a
  matching override in `performance-modes.css` for `low` and `potato` tiers.
- **I13** — Every new layout rule must have a `[dir="rtl"]` mirror where directionality matters.
- **I14** — No new `window.*` globals. No name collision with `window.toggleTheme`,
  `window._homeKeyHandler`, `window.triggerAuthModal`.
- **I15** — No new document-level or window-level event listeners added per-render. New global listeners
  (if any) must be registered once at module init.
- **I16** — No framework, no bundler, no new npm dependency, no CSP change.
- **I17** — `template/new-home.html` is reference-only and must not be modified.
- **I18** — `browse.html` is out of scope for this change.
- **I19** — `.auth-overlay` stays appended to `document.body` (not `#app`); the 250ms close delay must
  equal the CSS transition duration.
- **I20** — `.f-actions` hidden state uses `opacity` + `pointer-events`, never `display:none` or
  `visibility:hidden` (tab order preservation).
- **I21** — The Home page Hero section (`.hero-max` and all descendants, including `#globalSearch`,
  `#logoSwap`, `.hero-visual`, `.hero-pill`, `#searchBtn`, `#stopBtn`, `.search-keys`, and the Autocomplete
  dropdown rendered within) is FROZEN. No CSS, markup, token, or behavioral change is permitted in this
  area. If a token rename or value change would alter the Hero's computed appearance, the Hero's CSS rules
  must be pinned to explicit fallback values to prevent visual drift. The Hero's responsive breakpoints and
  keyboard shortcuts must remain byte-identical.
  **EXCEPTION (Phase 9, human-approved):** Responsive *layout* rules at `≤1024px` are permitted to modify
  `.hero-max` and `.hero-visual` to improve mobile stacking. Specifically, `.hero-visual` may leave absolute
  positioning, enter normal flow, be reordered above `.hero-content`, and be centered. This exception is
  scoped to layout-only declarations inside a `≤1024px` media query. It does **not** relax the freeze on Hero
  markup, tokens, colors, typography, the search input, the keyboard shortcuts, or any breakpoint above
  1024px, and it does not touch `.hero-bg`, `.logo-shader`, or the Hero pinning block.
- **I22** — The Browse page (all selectors in `browse.css`, all markup in `browse.js`, and all of
  `file-actions.js`) is FROZEN. No CSS, markup, token, or behavioral change is permitted. `browse.css`,
  `browse.js`, and `file-actions.js` must remain byte-identical to their pre-redesign state throughout all
  phases. The 6-child row contract, `data-file="true"` markers, three independent targets, folders-first sort,
  responsive collapse, and all Browse behavior are preserved by not touching them.

## Out of Scope

- **Backend redesign** — no changes to any file under `lib/`, `server.js`, or `nginx.conf`.
- **API redesign** — no route, payload, status code, error `code`, or response-shape change.
- **CSP relaxation** — `lib/http-utils.js` stays byte-identical; no CDN, no Tailwind, no remote fonts, no
  remote images.
- **Business rules** — no change to path-traversal defence, hidden-file policy, release ordering, recursive
  search, rate limiting, session TTL, lockout, or download headers.
- **Authentication and authorization semantics** — the three-state UI gate stays cosmetic; the server-side
  `pathRequiresAuth` gate remains the only security boundary.
- **Pre-existing bugs** — the 11 defects recorded in the Phase 0 analysis (per-render `document`/`window`
  listener accumulation in `home.js` and `autocomplete.js`, the `window._homeKeyHandler` removal-ordering
  bug, the dead `[data-url]`/`bindDownloadInterception` path, the `activeCategory`/`activeSort`/`activeOsTab`
  label-vs-state desync, the `IdleTimer.start` last-caller-wins conflict, the intentional duplicated
  `escapeHtml`, the unescaped server data in `resourceCard()`/`addResult()`, the two hard-coded English sort
  options, and the never-shown footer) are not to be fixed and not to be regressed further.
- **`browse.html`** — dead and untouched (D7).
- Home page Hero section (`.hero-max` and all descendants) — frozen per D8.
- Browse page (all of `browse.css`, `browse.js`, `file-actions.js`) — frozen per D9.
- **Pagination** — does not exist; not to be added.
- **Selection / multi-select** — does not exist; not to be added.
- **Infinite scroll, lazy loading** — do not exist; not to be added.
- **Sidebar / drawer / off-canvas / hamburger** — do not exist; not to be added (D2).
- **Framework, bundler, or dependency introduction** — rejected (D1, I16).
- **Accessibility work beyond preservation** — no WCAG remediation, no certification, no new ARIA patterns;
  existing accessible names, roles, tab order, and focus visibility are preserved, not improved.
- **Test infrastructure** — no new test framework, no CI/CD change, no visual-regression harness.
- **Fixing the WebGL / `requestAnimationFrame` / `ResizeObserver` backdrop** — the Stitch backdrop is
  rejected outright (D5).
- **`assets/js/router.js`, `resource-service.js`, `file-actions.js`, `theme.js`, `autocomplete.js` logic** —
  preserved exactly (I10).

## Open Questions

- **OQ-1 — Light-theme concrete values.** D4 fixes the light-theme *derivation rule* but does not enumerate
  its hex values, and authoring rule "do not invent values" forbids deriving new ones. `design.md` §2
  specifies the structural mirror and a derivation rule that reuses the **already-present**
  `[data-theme="light"]` values in `assets/css/tokens.css` for every token D4 does not pin (so no new hex is
  introduced). Confirm this bridge is acceptable, or supply the explicit light-theme palette.
- **OQ-2 — Legacy-token alias bridge.** D4's token names differ from the ~40 legacy names consumed across
  the six stylesheets (`--bg`, `--bg-card`, `--border`, `--text`, `--text-2/3/4`, `--n-4/5/6`,
  `--color-electric-iris`, `--color-ember-pulse`, `--a-5`, `--radius-cards`, `--radius-buttons`, …).
  `design.md` §2 specifies each legacy name resolving to exactly one D4 token so Phases 1–2 are
  behavior-neutral. Confirm the mapping, particularly `--text-4` (whose D4 target is the low-contrast
  `--outline-variant`) and `--color-electric-iris` (whose D4 target is `--secondary-container`, i.e. indigo
  rather than amber).
- **OQ-3 — CTA accent color.** D4 designates amber as the primary brand accent, but the existing primary
  button, `.panel-icon`, and hero gradient stop derive from the iris ramp. The alias bridge keeps them
  indigo. Confirm whether CTAs recolor to amber in this change or stay indigo.
- **OQ-4 — `assets/js/lib/idle-timer.js` path.** I10 names `assets/js/lib/idle-timer.js`; the file actually
  lives at `lib/idle-timer.js` and is served from `/lib/idle-timer.js` by `index.html`. Confirm the intended
  path so the implementation agent does not create a stray directory.
- **OQ-5 — Font file provenance.** D6 mandates specific self-hosted `.woff2` files. Confirm the source
  (vendor-provided binaries vs. an authorized download) and the exact filenames, since `assets/fonts/` does
  not exist yet and no font binaries are present in the repository.
  - **OQ-5 RESOLUTION:** Font files must be sourced by the implementation agent during Phase 1. The agent
    should download Inter (400/500/600), JetBrains Mono (400/500/600), and Vazirmatn (400/500/600) from their
    official GitHub releases (google/fonts, JetBrains/JetBrainsMono, rastikerdar/vazirmatn) as `.woff2` files
    and place them under `assets/fonts/`. If network access is unavailable during implementation, the agent
    must report this as a blocking issue and fall back to system fonts (no redesign failure).
- **OQ-6 — Footer.** The existing `<footer class="footer">` is `style="display:none"` and never shown (a
  recorded pre-existing condition). Confirm whether the redesign surfaces it, or leaves it hidden and maps
  the Stitch footer concept onto the existing `.status-bar` only.