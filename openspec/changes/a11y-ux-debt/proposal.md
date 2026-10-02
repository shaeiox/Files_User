# Change: Accessibility & UX Debt Clearance

## Why

`enterprise-ui-redesign` shipped an Obsidian Kinetic restyle across 9 phases. A post-implementation review of
the running application found 13 user-facing defects. Three of them block users outright:

1. **Language switching is impossible with a keyboard.** `components.css` opens the language menu via
   `.lang-dropdown-wrap:hover` only. There is no `:focus-within`, and no JavaScript anywhere in `assets/js/`
   touches `langBtn`, `lang-pill`, or `lang-dropdown`. A keyboard user Tabs to the pill, sees a focus ring,
   presses Enter, and nothing happens. The application cannot be switched to Persian without a pointing device
   (WCAG 2.1.1 Keyboard).
2. **`--text-4` fails WCAG AA in both themes.** Measured against `--bg-card`: **1.84:1** in dark, **3.16:1** in
   light, against a 4.5:1 requirement. It is live on the footer copyright line, the footer contact labels, the
   language menu sub-labels, and six Browse selectors.
3. **The language menu has an 8px hover dead zone.** The menu opens at `top: calc(100% + 8px)` while the
   wrapper is 32px tall, so moving the pointer from pill to menu crosses empty space where `:hover` is lost and
   the menu closes. Mouse users get a menu that dodges them.

The remaining ten defects are semantic, responsive, or localisation failures rather than blockers: invalid
`role="tablist"` on the primary nav, a search field with no combobox semantics, a broken heading outline, dead
`data-i18n-ph` hooks on footer anchors, a stale `aria-current`, total absence of mobile navigation, and two
footer links that merely duplicate the navbar.

## What Changes

- **Navbar keyboard operability.** Add `:focus-within` to `.lang-dropdown-wrap` so the menu opens on keyboard
  focus, and drive `aria-expanded` from real state instead of a hardcoded `false`.
- **Navbar semantics.** Replace `role="tablist"` (whose children are plain links, not tabs) with a valid nav
  structure. Set `aria-current="page"` from the router instead of hardcoding it in `index.html`.
- **Navbar hover affordance.** Close the 8px dead zone with `:hover-within`, and stop advertising a dead menu
  with `cursor: default`.
- **Navbar touch targets.** Raise nav pill, tab, and theme-button hit areas from 32–34px to the 44px
  recommendation.
- **Contrast.** Retune the muted text scale so every user-visible text surface clears 4.5:1 in both themes,
  without editing the frozen `browse.css`.
- **Search semantics.** Give `#globalSearch` combobox/listbox semantics and `aria-activedescendant` tracking.
  Requires an explicit exception to the Hero freeze (I21) because the input is inside `.hero-max`.
- **Heading outline.** Repair skipped heading levels in the shell footer and on the Home page.
- **Footer localisation.** Replace the dead `data-i18n-ph` hooks on the three social anchors with a working
  accessible-name mechanism so the Persian social labels actually render.
- **Mobile navigation.** Add a disclosure control that reveals the nav tabs below 900px, replacing the current
  `.nav-tabs { display: none }` dead end.
- **Content strategy.** De-duplicate footer links against the navbar and make footer destinations discoverable
  on mobile.

## Impact

- **Affected specs:** `navbar`, `contrast`, `search-a11y`, `doc-outline`, `footer-i18n`, `mobile-nav`,
  `content-strategy` (all new capability deltas under this change).
- **Affected code:** `assets/css/tokens.css`, `assets/css/components.css`, `assets/css/home.css`,
  `index.html`, `assets/js/home.js`, `assets/js/i18n.js`, `assets/js/router.js`.
- **Explicitly untouched:** `assets/css/browse.css`, `assets/js/browse.js`, `assets/js/file-actions.js`
  (frozen by D9/I22). The contrast fix reaches Browse's six `--text-4` selectors **through the token only**.
- **Risk:** low for `navbar` and `footer-i18n`; medium for `contrast` (repaints muted text application-wide);
  medium for `mobile-nav` (first new interactive component in the shell); low for `doc-outline`.
- **No data migration, no server change, no dependency change.**

## Locked Decisions

### D1 - Capability boundaries and build order

Seven capabilities ship as independent modules. Module ids are stable and are referenced by every downstream
task. Dependency direction is one-way and acyclic.

| Module id | Responsibility | Depends on |
|---|---|---|
| `navbar` | Nav semantics, keyboard operability, hover affordance, active-state accuracy, touch targets | — |
| `contrast` | WCAG AA text contrast for the muted scale, including via token drift into frozen Browse | — |
| `search-a11y` | Combobox/listbox semantics for global search (requires the D4 exception) | — |
| `doc-outline` | Heading hierarchy across shell, Home, and Browse | — |
| `footer-i18n` | Working accessible-name localisation for footer social anchors | — |
| `mobile-nav` | Disclosure control replacing the `.nav-tabs` mobile dead end | `navbar` |
| `content-strategy` | Footer/nav link de-duplication and mobile discoverability | `mobile-nav` |

**Build order:** `navbar` → (`contrast` ∥ `search-a11y` ∥ `doc-outline` ∥ `footer-i18n`) → `mobile-nav` →
`content-strategy`.

`mobile-nav` is sequenced after `navbar` because both own the `.nav-bar` subtree; a disclosure that reveals
tabs containing an invalid `tablist` and an unopenable menu would inherit defects J1 and J3.
`content-strategy` is last because it is a copy decision that depends on what `mobile-nav` exposes.

### D2 - Contrast is fixed at the token, not at the call sites

`--text-4` is retuned rather than replaced at each call site. Two candidate strategies were evaluated:

- **Retarget the 15 non-frozen selectors.** Leaves the six frozen Browse selectors at 1.84:1 and `.ac-path`
  (a Hero descendant, unreachable) failing. The same audit would fail again next quarter.
- **Retune the token.** Fixes all 15 call sites, including the 6 in the frozen `browse.css`, in a two-line
  change. Browse's computed appearance shifts without the file being edited.

**Decision: retune the token.** This is the same drift pattern D9 already accepted when Phase 1 changed the
tokens `browse.css` consumes, so it is precedented rather than novel.

Two constraints shaped the specific values:

- The token **cannot be deleted**, because `browse.css` references it in six places and that file is frozen;
  deleting the token would make those `var(--text-4)` references invalid and break the Browse page.
- The muted scale **cannot keep four distinct steps.** `--text-3` in dark measures 4.37:1 on the raised surface
  `--n-4`, so there is no room for a fourth, dimmer, AA-passing step. Any independently retuned `--text-4`
  that passes AA is *lighter* than `--text-3`, inverting the intended hierarchy.

**Decision: `--text-4` becomes an alias of `--text-3`, and dark `--text-3` is nudged from `#9e8f78` to
`#a3947c`.** Aliasing keeps all 15 references valid, cannot invert the hierarchy by construction, and clears AA
on every real surface.

### D3 - Mobile navigation is a disclosure, not a drawer

The brief offered a full drawer with focus trap and Escape handling, or a minimal disclosure button.

**Decision: disclosure.** This codebase deliberately has no focus-trap, roving-tabindex, or Escape-in-dialog
primitive — Phase 6 (Overlays & States) was skipped for exactly that reason. A full drawer means inventing new
accessibility primitives and testing them from scratch. A disclosure reuses the existing tab markup and needs
no new keyboard model beyond what J3 already mandates. If a drawer is wanted later, it is its own capability
with its own spec.

### D4 - Search semantics take an explicit Hero-freeze exception

`#globalSearch` renders at `home.js:70`, inside `.input-wrap` → `.hero-search` → `.hero-max`. Adding
`role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant` is a **markup change inside
the area I21 freezes**.

**Decision: grant a narrow, enumerated exception** covering only the `aria-*` and `role` attributes on
`#globalSearch` and on the `.ac-dropdown` / `.ac-item` elements that `autocomplete.js` generates. The exception
does **not** cover Hero styling, tokens, colours, typography, layout, the `.hero-pill`, the heading, the
description, the background layers, the Hero pinning block, or any breakpoint. No Hero CSS rule changes.

## Locked Invariants

- **J1** — Every interactive element in the shell SHALL be operable with a keyboard alone. Any control that
  reveals content on `:hover` SHALL also reveal it on `:focus-within` or on a click/Enter activation. No
  capability may ship a hover-only reveal.
- **J2** — No user-visible text SHALL render below **4.5:1** contrast against its actual background surface.
  Large text (≥24px, or ≥18.66px bold) may sit at 3:1. Every colour in the muted scale SHALL clear 4.5:1 on
  `--bg`, `--bg-card`, `--bg-input`, `--bg-hover`, `--n-4`, and `--bg-elevated` in both themes.
- **J3** — No ARIA role SHALL be declared unless its required child roles and keyboard pattern are actually
  implemented. `role="menu"` and `role="tablist"` require roving tabindex and arrow-key navigation; if that is
  absent, the role is removed rather than left as a lie.
- **J4** — The heading outline SHALL contain no skipped levels. Document order SHALL be `h1` → `h2` → `h3` →
  `h4`. Exactly one `h1` per page.
- **J5** — `assets/css/browse.css`, `assets/js/browse.js`, and `assets/js/file-actions.js` SHALL remain
  byte-identical. Where a fix must reach Browse, it SHALL arrive through a token value, never a file edit.
- **J6** — The `.hero-max` subtree SHALL remain frozen except for the enumerated `aria-*`/`role` attributes
  permitted by D4. No Hero CSS rule, token, or layout declaration changes under any circumstance in this change.
- **J7** — Every shell control SHALL expose an accessible name, and any localised accessible name SHALL change
  when the language changes.

## Out of Scope

- `browse.css`, `browse.js`, `file-actions.js` — frozen (J5). Browse's `--text-4` selectors are fixed via token
  drift only.
- Hero visual restyling, Hero tokens, Hero typography, Hero responsive behaviour. The D4 exception is ARIA-only.
- A focus-trap / roving-tabindex primitive, a mobile drawer, an off-canvas menu, or any new dialog.
- Fixing the two hard-coded English sort-option labels in `home.js` (`home.js:126`, `home.js:130`) — recorded
  pre-existing defect, not a regression.
- Any change to `lib/**`, `server.js`, `router.js` route table, auth logic, or API contracts. `aria-current`
  wiring touches `router.js` but adds no routes.
- Bundle splitting, minification, image optimisation, or any build-pipeline change. This is a zero-build
  project.
- Deleting the `--text-4` token. Blocked by J5 until Browse is unfrozen.

## Open Questions

1. **The muted scale collapses to three usable steps.** After this change, `--text-4` is an alias of `--text-3`,
   so hierarchy must be carried by font size and weight rather than a fourth colour step. If a genuine fourth
   step is wanted, the palette needs a surface that is light enough in dark mode to support it. Is the current
   two-tone muted treatment acceptable as the permanent state?
2. **Dark `--text-3` on the raised surface.** `#a3947c` clears `--n-4` at 4.65:1, but `--n-4` remains the
   highest-luminance surface the app uses for text. If a future surface exceeds it, the muted scale fails
   again. Should `--n-4` be capped, or should the audit become a CI check?
3. **Footer link overlap.** This change removes the two duplicate footer links (Home, Documentation) on the
   premise that the navbar and mobile nav cover them. If the footer is ever the primary navigation on small
   screens, that premise inverts and the duplicates should return. Confirm the footer is supplementary.
4. **Automated accessibility regression testing.** Every contrast and ARIA claim in this change was verified
   by hand-authored scripts, not by a test suite. Should axe-core or a Lighthouse CI gate be added so these
   cannot silently regress?