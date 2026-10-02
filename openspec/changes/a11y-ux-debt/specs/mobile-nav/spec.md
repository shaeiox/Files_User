# Capability: Mobile Navigation

## Purpose

Below 900px the stylesheet sets `.nav-tabs { display: none }` and nothing replaces it. There is no hamburger
control, no drawer, and no toggle anywhere in the codebase. On a phone the entire primary navigation —
Website, Docs, Downloads — simply disappears from the shell.

The footer links partially compensate, which is why this defect survived the redesign review, but a user must
scroll past the entire page content to discover an equivalent set of links, and the footer omits the Downloads
entry entirely.

This capability adds a disclosure control that reveals the existing tab group as a vertical stack. It
deliberately does not add a drawer: this codebase has no focus trap, roving tabindex, or dialog-dismissal
primitive, and Phase 6 of the redesign was skipped for that reason. A disclosure reuses the existing markup and
introduces no new keyboard model.

Scope boundary: the sticky geometry and the navbar's visual treatment are frozen by I1 and unchanged. The
disclosure control appears only below 900px.

## ADDED Requirements

### Requirement: Primary navigation is reachable below 900px

At viewport widths below 900px the navigation group SHALL be reachable through a control in the navbar. The
control SHALL toggle the group's visibility, and the group SHALL render as a vertical stack when revealed.

#### Scenario: **HARD GATE** — The navigation group is never unreachable

- **GIVEN** the stylesheet hides the navigation group below 900px
- **WHEN** the page is rendered at 360px, 480px, 768px, and 900px
- **THEN** a control that reveals the group is visible and operable at every one of those widths
- **AND** no width leaves the shell without a route to Website, Docs, or Downloads

#### Scenario: Revealed navigation is a usable list

- **GIVEN** the navigation group is revealed below 900px
- **WHEN** the group is inspected
- **THEN** its links stack vertically and remain individually reachable
- **AND** no link is clipped, overlapped, or forced to a zero hit area

### Requirement: The disclosure control is operable and truthfully described

The control SHALL be a native button so that activation works without custom key handling. It SHALL report its
expanded state, and that state SHALL reflect the group's actual visibility in both directions.

#### Scenario: The control reports its state

- **GIVEN** the navigation group is hidden by default below 900px
- **WHEN** the control is activated
- **THEN** it reports expanded and the group is visible
- **AND** activating it again reports collapsed and hides the group

#### Scenario: Activation works without a pointing device

- **GIVEN** the control is a native button
- **WHEN** a keyboard user reaches it and presses Enter or Space
- **THEN** the group toggles, and focus stays on the control

#### Scenario: The control is hidden where it is not needed

- **GIVEN** the navigation group is always visible at wider widths
- **WHEN** the page is rendered at 1024px and above
- **THEN** the disclosure control is not rendered or not visible
- **AND** the group remains visible without it

### Requirement: Revealed links remain valid navigation targets

Revealing the group SHALL NOT change where its links point, and SHALL NOT alter the router's handling of them.
The disclosure is a visibility control, not a navigation mechanism.

#### Scenario: Link targets are unchanged by the disclosure

- **GIVEN** the navigation group contains external and internal destinations
- **WHEN** the group is revealed and a link is activated
- **THEN** the destination is the same as when the group is always visible
- **AND** internal navigation still routes through the existing router

#### Scenario: The frozen sticky geometry is preserved

- **GIVEN** the navbar is frozen as a sticky pill at a fixed offset
- **WHEN** the disclosure control is added
- **THEN** the sticky positioning, its offset, and its stacking value are unchanged
- **AND** the control does not detach or overlay the routed content

### Requirement: The control does not inherit the navbar's known defects

Because this control is added to the same subtree as the language menu and the navigation group, it SHALL NOT
ship with a hover-only reveal or an unbacked ARIA role.

#### Scenario: **HARD GATE** — No hover-only behaviour or unbacked role

- **GIVEN** the control is added after the navbar's semantics and keyboard defects are cleared
- **WHEN** the control's behaviour and markup are inspected
- **THEN** it is activated by click or keyboard, never by hover alone
- **AND** its role, if any, is one whose keyboard pattern is actually implemented