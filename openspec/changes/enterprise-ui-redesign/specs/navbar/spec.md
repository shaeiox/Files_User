# Capability: Navbar

## Purpose

The header is the application's only persistent chrome and the only sticky element in the codebase. It is
currently a floating pill at `sticky top: 12px` inside the 1720 px `.page` container, with three regions: a
brand block on the left, a centred absolutely-positioned tab group, and an actions group holding the
performance dropdown, the language dropdown, and the theme button. `template/new-home.html` proposes a
full-bleed glass bar with five workspace tabs and a global search shortcut. This capability restyles the
existing pill to the Obsidian Kinetic look while keeping the sticky geometry, the three-region structure,
every id, every `data-*` attribute, and every dropdown open mechanism exactly as they are.

## ADDED Requirements

### Requirement: The navbar remains a floating sticky pill

`.nav` SHALL remain `position: sticky` with `top: 12px` and a `z-index` resolving to `var(--z-sticky)`
(= 50). It SHALL never become `fixed` or `absolute`. It SHALL remain visible throughout a page scroll. The
full-bleed treatment proposed by the reference SHALL NOT be adopted, because it would require either
`top: 0` — contradicting the locked offset — or hoisting the header out of `.page`, which would change the
sticky containing block.

#### Scenario: **HARD GATE** — Sticky navbar remains visible during page scroll

- **GIVEN** `.nav` declared as `position: sticky; top: 12px; z-index: var(--z-sticky)`
- **WHEN** a page taller than the viewport is scrolled from top to bottom
- **THEN** the navbar remains visible in the viewport at every scroll position, stays offset exactly 12 px
  from the viewport top, and never detaches, clips, jumps, or overlaps content incorrectly

#### Scenario: **HARD GATE** — The positioning scheme is unchanged

- **GIVEN** the `.nav` rule before and after the change
- **WHEN** the two rules are compared
- **THEN** `position` is still `sticky` and `top` is still `12px`; the rule contains neither `fixed` nor
  `absolute` for `.nav`

#### Scenario: The z-index resolves to 50

- **GIVEN** `--z-sticky` is declared as `50`
- **WHEN** the navbar's computed `z-index` is inspected
- **THEN** it is `50`, identical to the pre-change value, keeping the navbar above page content and below the
  dropdown layers and overlays

#### Scenario: The navbar sits above content and below overlays

- **GIVEN** the documented stacking scale
- **WHEN** the navbar, a dropdown menu, and the auth overlay are layered
- **THEN** the dropdown paints above the navbar, and the overlay paints above everything

#### Scenario: No full-bleed conversion is attempted

- **GIVEN** the reference design's full-bleed bar
- **WHEN** the shipped navbar is measured
- **THEN** it retains the 1720 px `.page` container width and its pill shape rather than spanning the
  viewport edge to edge

### Requirement: The three-region layout is preserved

`.nav-bar` SHALL keep its flex `justify-content: space-between` arrangement with the brand block on the left,
`.nav-tabs` centred, and `.nav-actions` on the right. No region SHALL be added, removed, or reordered.
`.nav-tabs` SHALL keep its absolute positioning with `left: 50%` and `translateX(-50%)`, because it depends
on `.nav` being a positioned ancestor in order to work at all.

#### Scenario: Region count and order are unchanged

- **GIVEN** the pre-change `.nav-bar` children
- **WHEN** the post-change markup is inspected
- **THEN** the same three regions are present in the same order, with no element added or removed

#### Scenario: The centred tab group keeps its absolute positioning

- **GIVEN** `.nav-tabs` is `position: absolute; left: 50%; transform: translateX(-50%)`
- **WHEN** the rule is inspected after the change
- **THEN** it remains absolutely positioned and still centres within `.nav`

#### Scenario: The navbar height is driven by `--nav-h`

- **GIVEN** `--nav-h` declares the desktop navbar height
- **WHEN** `.nav-bar`'s `height` declaration is inspected
- **THEN** it resolves through `var(--nav-h)` rather than a literal

### Requirement: Every navbar id and data attribute survives

Every id consumed by JavaScript SHALL survive: `#themeBtn`, `#langBtn`, `#currentLangLabel`,
`.lang-dropdown-menu`, `.perf-pill`, `.perf-dropdown-menu`, `.nav-tabs`, `.nav-tab`. Every `data-*` attribute
SHALL survive unchanged: `data-link` on the brand anchor, `data-i18n` on the translated spans, and
`data-perf-val` on all five performance options. `aria-haspopup`, `aria-expanded`, `aria-current`, `title`,
and `aria-label` SHALL also survive.

#### Scenario: All navbar ids are still present

- **GIVEN** the navbar ids listed in I6
- **WHEN** `index.html` is searched for each
- **THEN** every one is found, with the same element that carries it today

#### Scenario: `data-perf-val` covers all five tiers

- **GIVEN** the performance menu offers `AUTO`, `HIGH`, `MEDIUM`, `LOW`, and `POTATO`
- **WHEN** the menu markup is inspected
- **THEN** five `.perf-option` elements each carry `data-perf-val` with exactly those values

#### Scenario: `data-i18n` keys are unchanged

- **GIVEN** the navbar's translated strings use `brand`, `subtitle`, `website`, `docs`, `downloads`,
  `perfLabel`, `perfAuto`, `perfHigh`, `perfMed`, `perfLow`, `perfPotato`
- **WHEN** the markup is inspected
- **THEN** exactly those keys are present, with none removed, renamed, or duplicated

#### Scenario: The brand anchor keeps its client-side navigation marker

- **GIVEN** `.nav-logo` carries `data-link`
- **WHEN** the attribute is inspected
- **THEN** it is still present, so the click continues to be handled as client-side navigation

#### Scenario: The active tab keeps its current-page semantics

- **GIVEN** the Downloads tab carries `aria-current="page"`
- **WHEN** the attribute is inspected
- **THEN** it is still present on the same tab

### Requirement: No new navigation destinations are fabricated

The reference design proposes five workspace tabs — Repositories, ISO Mirrors, Release, Documentation, and
Performance. The application SHALL keep its three existing real tabs. No tab SHALL be added whose
destination does not exist, and no `href="#"` placeholder SHALL be introduced, because a dead link is a
fabricated navigation affordance.

#### Scenario: The tab count is unchanged

- **GIVEN** three tabs — Website, Docs, and Downloads
- **WHEN** `.nav-tabs` is inspected after the change
- **THEN** exactly three `.nav-tab` elements remain, with their original hrefs and target attributes

#### Scenario: No placeholder href is introduced

- **GIVEN** D3 forbids fabricated links and mock data
- **WHEN** every `href` in the navbar is collected
- **THEN** none has the value `#` or an otherwise non-resolving placeholder

#### Scenario: External links keep their target and rel

- **GIVEN** Website and Docs open in a new tab with `rel="noopener"`
- **WHEN** those anchors are inspected
- **THEN** `target="_blank"` and `rel="noopener"` are unchanged, so the router continues to skip them

### Requirement: No new global theme or keyboard mechanism is introduced

The reference design defines `window.toggleTheme()` and toggles an `html.light-theme` class; it also adds a
document-level keyboard handler for a `/` shortcut, `⌘K`, and `Escape`. The redesign SHALL NOT introduce any
of these. The theme button SHALL continue to be handled by the existing delegated listener, the existing
theme module SHALL continue to own persistence, and `⌘K` SHALL continue to focus the existing search field
rather than a second one.

#### Scenario: No `window.toggleTheme` is added

- **GIVEN** the theme module exposes its own toggle and the existing button is handled by a delegated
  listener
- **WHEN** the whole `assets/` tree and `index.html` are searched for `toggleTheme`
- **THEN** no match is found

#### Scenario: No second theming class is introduced

- **GIVEN** theming is expressed only through `data-theme` on the root element
- **WHEN** `light-theme` is searched across the shipped files
- **THEN** no match is found

#### Scenario: The theme button still toggles through the existing path

- **GIVEN** `#themeBtn` is matched by a delegated document-level click listener
- **WHEN** the button is clicked
- **THEN** `data-theme` flips, the choice persists to storage, the document's colour meta value updates, and
  the logo wipe animation still plays

#### Scenario: No second `⌘K` handler is added

- **GIVEN** a keyboard shortcut already focuses the search field
- **WHEN** `index.html` is searched for an inline `onclick` invoking a shortcut focus
- **THEN** no such attribute exists in the navbar

#### Scenario: No document-level keyboard handler is added by the navbar

- **GIVEN** I15 forbids new per-render global listeners
- **WHEN** the navbar's scripts are inspected
- **THEN** no document-level `keydown` listener is registered

### Requirement: Dropdown open mechanisms are preserved exactly

The three navbar-related menus use three different mechanisms, and the restyle SHALL preserve each. The
performance menu SHALL continue to open via a `show` class on its **wrapper**. The language menu SHALL
continue to open by CSS `:hover` only, with no `show` path and no change to its `aria-expanded` attribute —
that recorded accessibility gap is a pre-existing defect and is out of scope. The closed state of each menu
SHALL continue to use its existing properties rather than `display: none`.

#### Scenario: The performance menu opens via `show` on the wrapper

- **GIVEN** the performance dropdown's `show` class is toggled on `.perf-dropdown-wrap`
- **WHEN** the menu is opened and then dismissed by an outside click
- **THEN** the menu opens and closes exactly as before, and the selected tier's indicator dot is retained

#### Scenario: The language menu remains hover-only

- **GIVEN** the language menu's open state is produced by a `:hover` rule
- **WHEN** the rule set is inspected
- **THEN** there is still no class-driven or attribute-driven open state for it, and its trigger's
  `aria-expanded` value is still not managed by any code

#### Scenario: Closed menus are never removed with `display: none`

- **GIVEN** each menu's closed state uses opacity and visibility rather than removal from layout
- **WHEN** the menu rules are inspected
- **THEN** no rule sets `display: none` on the language, performance, or filter menu

#### Scenario: The theme button keeps clipping its two icons

- **GIVEN** the sun and moon icons are absolutely positioned and stacked inside the button
- **WHEN** the button's overflow is inspected
- **THEN** it still clips, so the two icons do not bleed outside the control

### Requirement: The theme toggle affordance is restyled without behavioural change

The theme button SHALL be restyled to the Obsidian Kinetic look — amber-accented on hover, using the D4
foreground and outline tokens — while keeping its id, its two icon elements, its `title`, its `aria-label`,
its delegated handler, and its behaviour. The reference design's inline theme handler SHALL NOT be adopted.

#### Scenario: The button keeps its accessible name

- **GIVEN** the theme control is an icon-only button
- **WHEN** the button is inspected
- **THEN** it still exposes an accessible name and a tooltip, so it remains distinguishable to assistive
  technology

#### Scenario: The two icon states still reflect the current theme

- **GIVEN** one icon is shown in the light theme and the other in the dark theme
- **WHEN** `data-theme` is inspected
- **THEN** exactly the expected icon is visible, unchanged from the pre-change behaviour

### Requirement: New navbar effects are tier-gated and direction-mirrored

Every new navbar rule that uses `backdrop-filter`, `blur`, `animation`, `transition`, or `box-shadow` SHALL
have a matching override in `performance-modes.css` under both the `low` and `potato` tiers. Every new
direction-sensitive navbar layout rule SHALL either have a `[dir="rtl"]` mirror or be authored with logical
properties so that no mirror is required.

#### Scenario: Every new navbar effect is tier-gated

- **GIVEN** the enumeration of navbar rules introduced by this change that use blur, animation, transition,
  or shadow
- **WHEN** `performance-modes.css` is searched under both tier blocks
- **THEN** every enumerated selector appears in each

#### Scenario: The navbar's blur is removed in the low tier

- **GIVEN** the navbar pill uses a blur
- **WHEN** `data-perf="low"` is set
- **THEN** the computed `backdrop-filter` of `.nav-bar` is `none`

#### Scenario: Direction-sensitive navbar rules are mirrored or logical

- **GIVEN** every new navbar rule using physical side properties, `translateX`, or a row flex direction
- **WHEN** each is inspected for a mirror or for logical-property authoring
- **THEN** each has either a `[dir="rtl"]` counter-rule or uses logical properties such as
  `margin-inline` or `padding-inline`

#### Scenario: The navbar mirrors correctly in Persian

- **GIVEN** the active language is Persian, so the root element carries an RTL direction
- **WHEN** the navbar is rendered
- **THEN** the brand block, centred tab group, and actions group mirror to the correct sides with no overlap

### Requirement: Responsive navbar behavior is preserved

The navbar SHALL continue to hide `.nav-tabs` at `≤900px` with **no** hamburger, drawer, off-canvas, or
alternative navigation being introduced. It SHALL continue to reduce its height at `≤640px`. These are
existing verified behaviors, not presentation.

#### Scenario: The mobile navigation removal is unchanged

- **GIVEN** the primary tabs are removed below a certain width
- **WHEN** the `≤900px` rules are compared before and after the change
- **THEN** the rule that hides the tab group is present and unchanged

#### Scenario: No alternative mobile navigation is introduced

- **GIVEN** the redesign adds no navigation affordance
- **WHEN** the shipped files are searched for `hamburger`, `burger`, `drawer`, `offcanvas`, `aria-expanded`
  on a navigation trigger, and a mobile nav toggle
- **THEN** no match is found

#### Scenario: The mobile height reduction is preserved

- **GIVEN** the navbar is shorter at narrow widths
- **WHEN** the `≤640px` rules are inspected
- **THEN** a smaller height override is present, now resolving through the mobile value of `--nav-h`

#### Scenario: No horizontal overflow appears at any width

- **GIVEN** the restyled pill contains the brand block, the actions group, and the three action controls
- **WHEN** the page is rendered at 1440, 1024, 900, 768, 640, and 480 px
- **THEN** no horizontal overflow appears at any width, and the pill stays within its intended height

#### Scenario: The brand block is never hidden

- **GIVEN** the brand mark and wordmark are the only always-visible identifying element on mobile
- **WHEN** the navbar is rendered at 480 px
- **THEN** the brand block remains visible and legible