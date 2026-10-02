# Capability: Navbar

## Purpose

The floating pill header is the application's only persistent chrome. It holds the brand link, three navigation
tabs (Website, Docs, Downloads), a performance dropdown, a language dropdown, and a theme button.

This capability clears the defects that make it unusable for keyboard users and misleading for everyone else:
the language menu opens on hover only, the tab group declares an ARIA role it does not implement, the tab group
has no alternative below 900px, the language menu dodges the pointer across an 8px gap, the language pill
advertises itself as inert while opening a menu, the current-page indicator never updates, and the primary
controls sit under the recommended touch-target size.

Scope boundaries: the sticky geometry (`position: sticky`, `top: 12px`, `z-index: var(--z-sticky)`) is frozen
by I1 and unchanged. This capability does not restyle the navbar; it repairs behaviour and semantics only.

## ADDED Requirements

### Requirement: Every navbar control is operable by keyboard

The language menu SHALL open when the language wrapper contains keyboard focus, not only when it is hovered. Any
navbar control that reveals content on hover SHALL reveal it on `:focus-within` or on activation. No navbar
control SHALL require a pointing device.

#### Scenario: **HARD GATE** — A keyboard user can open the language menu

- **GIVEN** the language menu opens only via `.lang-dropdown-wrap:hover`
- **WHEN** a keyboard user Tabs to the language pill and presses Enter or Space
- **THEN** the menu becomes visible, and every option inside it is reachable by continuing to Tab
- **AND** the behaviour does not depend on any script toggling the menu

#### Scenario: No script opens the language menu

- **GIVEN** the freeze on adding a script toggle for the language menu
- **WHEN** all of `assets/js/**` is searched for `langBtn`, `lang-pill`, `lang-dropdown`, and `.show`
- **THEN** no result opens or closes the menu
- **AND** the CSS state is the single source of truth for visibility

#### Scenario: `aria-expanded` reflects the real state

- **GIVEN** the language button declares `aria-expanded="false"` as a literal attribute
- **WHEN** the menu is opened or closed by hover, by keyboard focus, or by pointer
- **THEN** the exposed state matches what the user can see, in both directions

#### Scenario: The menu does not dodge the pointer

- **GIVEN** the menu is offset from the wrapper by a gap that belongs to neither element
- **WHEN** a pointer user moves from the pill toward an option in the menu
- **THEN** the menu stays open for the whole traversal, with no region in which it closes

#### Scenario: The language pill does not advertise itself as inert

- **GIVEN** the language pill opens a menu on hover
- **WHEN** the pill is rendered
- **THEN** its cursor indicates interactivity, matching its actual behaviour

### Requirement: The navigation group declares only semantics it implements

The tab group SHALL NOT declare `role="tablist"` unless its children carry `role="tab"` with `aria-selected`
and the group implements roving tabindex with arrow-key navigation. Because the group is a set of navigation
links rather than tabs, the role SHALL be removed and replaced with a labelled navigation landmark.

#### Scenario: **HARD GATE** — No unbacked ARIA role remains in the navbar

- **GIVEN** `role="tablist"` wraps plain `<a>` elements with no `role="tab"` children
- **WHEN** the rendered navbar is inspected for ARIA roles
- **THEN** no `tablist`, `tab`, `menu`, or `menuitem` role appears without its required child roles and
  keyboard pattern
- **AND** the group is exposed as a navigation landmark with an accessible name

#### Scenario: The group is still reachable as a landmark

- **GIVEN** the role was removed from the tab container
- **WHEN** a screen reader user navigates by landmark
- **THEN** the primary navigation is announced as a named navigation region
- **AND** the three links are announced as ordinary links with their accessible names

### Requirement: The current-page indicator is truthful

The navigation group SHALL mark at most one tab as the current page, and that mark SHALL be derived from the
active route rather than hardcoded in the markup. On a route with no matching tab, no tab SHALL be marked.

#### Scenario: The indicator follows the route

- **GIVEN** the Downloads tab carries a hardcoded current-page mark in the static markup
- **WHEN** the user navigates to the Browse route and the shell re-renders
- **THEN** no tab is marked as the current page, because Browse has no tab in the group
- **AND** the stale mark from the Home route is not left behind

#### Scenario: Exactly one tab is marked at a time

- **GIVEN** the group contains three tabs
- **WHEN** the current-page state is applied
- **THEN** at most one tab carries the current-page mark
- **AND** applying it twice does not produce duplicates

### Requirement: Primary navbar controls meet the touch-target recommendation

The language pill, performance pill, theme button, and navigation tabs SHALL expose a hit area of at least
44×44 CSS pixels, achieved without altering the navbar's sticky geometry or the height token that positions it.

#### Scenario: Hit areas meet the recommendation

- **GIVEN** the language pill, performance pill, and theme button are 32px tall and the tabs are 34px tall
- **WHEN** their rendered hit areas are measured
- **THEN** each is at least 44×44 CSS pixels
- **AND** the navbar remains the same height, with the sticky offset unchanged

#### Scenario: Expanding hit areas does not disturb the sticky bar

- **GIVEN** the navbar uses a height token to position its contents
- **WHEN** the control hit areas are enlarged
- **THEN** the token, the bar height, and the `sticky` offset are all unchanged