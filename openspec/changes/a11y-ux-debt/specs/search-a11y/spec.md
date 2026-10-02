# Capability: Search Accessibility

## Purpose

The global search field powers package and file discovery from the Home page. Its keyboard behaviour is fully
implemented — arrow keys cycle a highlighted result, Enter navigates, Escape closes — but none of it is exposed
to assistive technology.

The field has no `role`, no `aria-expanded`, no `aria-controls`, and no `aria-activedescendant`. The result
panel has no `role="listbox"`, its rows have no `role="option"`, and the highlighted row is signalled only by a
CSS class. A screen reader user types a query and receives no indication that a result list exists, what it
contains, or which entry is highlighted.

Scope boundary: this capability adds ARIA semantics only. It changes no behaviour, no styling, and no Hero
visual property. The field lives inside the area frozen by I21, so D4 grants a narrow exception covering only
`role` and `aria-*` attributes.

## ADDED Requirements

### Requirement: The search field is exposed as a combobox

The global search input SHALL carry combobox semantics: a `combobox` role, an expanded state that tracks
whether the result panel is showing, and a reference to the panel it controls. The result panel SHALL be
exposed as a listbox and its entries as options.

#### Scenario: **HARD GATE** — The full combobox pattern is present

- **GIVEN** the search field drives a filtered result panel
- **WHEN** the rendered field and panel are inspected for ARIA semantics
- **THEN** the field declares a combobox role, an expanded state, and a control reference to the panel
- **AND** the panel declares a listbox role and every entry declares an option role

#### Scenario: The expanded state is truthful

- **GIVEN** the panel opens when a query matches and closes when it does not
- **WHEN** a query is typed that yields results, then a query that yields none
- **THEN** the field reports expanded for the matching query and collapsed for the non-matching one
- **AND** the exposed state is never stale in either direction

#### Scenario: Blurring without a query collapses the panel

- **GIVEN** the field is empty and the panel is not showing
- **WHEN** the field receives and loses focus
- **THEN** the expanded state remains collapsed and the panel does not appear

### Requirement: The highlighted result is announced

The field SHALL reference the currently highlighted entry so assistive technology can convey which result is
active, and the highlight SHALL be conveyed by an ARIA state rather than by a styling class alone. The
reference SHALL track the highlight whether it was moved by keyboard or by pointer.

#### Scenario: **HARD GATE** — The active descendant is always referenced

- **GIVEN** a query has produced at least one result
- **WHEN** the highlight moves by arrow key, by pointer hover, or by an explicit selection
- **THEN** the field references the highlighted entry, and that entry reports itself as selected
- **AND** exactly one entry reports itself as selected at a time

#### Scenario: The reference is cleared when nothing is highlighted

- **GIVEN** the highlight index is at its unselected value
- **WHEN** the panel is showing
- **THEN** the field references no entry, and no entry reports itself as selected

#### Scenario: Pointer and keyboard highlight stay in sync

- **GIVEN** the panel is showing results
- **WHEN** the pointer hovers an entry and then a keyboard arrow key is pressed
- **THEN** the reference follows the pointer first and the keyboard thereafter
- **AND** the highlighted styling and the announced state never disagree

### Requirement: The exception to the Hero freeze stays narrow

The search field renders inside the Hero section. This capability SHALL add only `role` and `aria-*` attributes
to the search field and to the elements the autocomplete generates. No Hero stylesheet rule, token, colour,
typography value, layout declaration, or breakpoint SHALL change.

#### Scenario: **HARD GATE** — Only attributes are added inside the Hero

- **GIVEN** the search field is emitted by the Hero render path
- **WHEN** this capability's diff is inspected
- **THEN** the only changes inside the Hero subtree are `role` and `aria-*` attributes
- **AND** no Hero stylesheet rule is modified

#### Scenario: Hero appearance is unchanged

- **GIVEN** the Hero was frozen before this change
- **WHEN** the search field gains its ARIA attributes
- **THEN** the Hero renders exactly as before, including its computed styles, its background layers, and its
  responsive behaviour

#### Scenario: The search field's own behaviour is unchanged

- **GIVEN** the field already implements keyboard navigation, selection, and dismissal
- **WHEN** ARIA semantics are added
- **THEN** arrow-key cycling, Enter navigation, and Escape dismissal behave exactly as they did
- **AND** no new event listener is introduced for functionality that already worked