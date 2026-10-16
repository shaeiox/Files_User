# Spec Delta

## Purpose

Defines the persistent chrome that surrounds every route: the navbar and its controls, the dropdown
mechanisms, the theme toggle, the footer and its content, and the authentication dialog.

## ADDED Requirements

### Requirement: Every dropdown in the navbar opens by one documented mechanism

All navbar dropdowns SHALL open by the same mechanism. No dropdown SHALL depend solely on a pointer
hover state, because hover is unavailable to touch and to some assistive input.

#### Scenario: A visitor without a pointer opens the language menu

- **GIVEN** the visitor is using a touch device or navigating by keyboard
- **WHEN** the language control is activated
- **THEN** the menu opens and remains open until it is dismissed
- **AND** it does not close merely because the pointer left the control

#### Scenario: Two dropdowns are compared

- **GIVEN** the navbar contains more than one dropdown
- **WHEN** each is opened
- **THEN** both open and close through the same mechanism
- **AND** neither is pointer-only

### Requirement: A dropdown reports its state to assistive technology

A control that opens a menu SHALL report the menu's current open or closed state, and the reported
state SHALL reflect reality.

#### Scenario: A menu opens

- **GIVEN** a dropdown control is collapsed
- **WHEN** the menu opens
- **THEN** the control reports the expanded state
- **AND** the reported state matches what is visible on screen

#### Scenario: A menu is inspected while closed

- **GIVEN** a dropdown control's menu is closed
- **WHEN** its reported state is read
- **THEN** it reports the collapsed state rather than a hardcoded value

### Requirement: A dropdown has no pointer dead zone between trigger and menu

The area between a dropdown's trigger and its open menu SHALL remain part of the control's hit
region, so moving a pointer across the gap does not dismiss the menu.

#### Scenario: A pointer crosses from trigger to menu

- **GIVEN** a dropdown menu is open with a visible gap between it and its trigger
- **WHEN** the pointer moves across that gap
- **THEN** the menu stays open throughout the traversal

### Requirement: The theme change is communicated, not silent

Switching the active theme SHALL produce a visible transition that makes the change legible as a
change. If a named transition is specified anywhere in the source or its documentation, it SHALL
exist in the stylesheet; a transition that exists only in a comment SHALL be either implemented or
removed along with the rules that reference it.

#### Scenario: The theme is toggled

- **GIVEN** the visitor activates the theme control
- **WHEN** the theme changes
- **THEN** the change is legible as a transition rather than an instant cut
- **AND** the transition completes within roughly half a second

#### Scenario: A documented transition is checked against the stylesheet

- **GIVEN** source documentation describes a named transition
- **WHEN** the stylesheet is searched for the animation that would implement it
- **THEN** either the animation exists, or the documentation and every rule referencing it are removed

### Requirement: The authentication dialog behaves as a dialog

The sign-in dialog SHALL expose dialog semantics, SHALL trap focus while open, SHALL be dismissible
with the Escape key, and SHALL return focus to the control that opened it on close.

#### Scenario: The dialog opens

- **GIVEN** a visitor activates a control that requires authentication
- **WHEN** the dialog opens
- **THEN** assistive technology is informed a dialog is present and what it is called
- **AND** focus moves inside the dialog to its first field

#### Scenario: A keyboard user tabs inside the open dialog

- **GIVEN** the dialog is open
- **WHEN** the visitor presses Tab repeatedly
- **THEN** focus stays within the dialog and does not reach the page behind it

#### Scenario: The visitor presses Escape

- **GIVEN** the dialog is open
- **WHEN** the visitor presses Escape
- **THEN** the dialog closes
- **AND** focus returns to the control that opened it

#### Scenario: The dialog closes

- **GIVEN** the dialog is open
- **WHEN** it is dismissed by any means
- **THEN** focus is restored to the triggering control
- **AND** focus does not remain on a removed element

### Requirement: The footer states one accurate legal identity

The portal SHALL render a single legal attribution, stating the correct copyright year and a single
consistent entity name, on every route that renders a footer.

#### Scenario: Two routes are compared

- **GIVEN** the home route and any other route rendering a footer
- **WHEN** their footers are compared
- **THEN** the copyright year is identical
- **AND** the entity name is identical
- **AND** the phrasing is grammatically correct

#### Scenario: The year rolls over

- **GIVEN** the calendar year changes
- **WHEN** the footer is rendered
- **THEN** the year shown is the current year rather than a value frozen at authoring time

### Requirement: The footer's descriptive copy is a real sentence

The footer's company description SHALL be written as prose a person would write, and SHALL NOT be a
stack of search keywords or a placeholder.

#### Scenario: The footer is read

- **GIVEN** the footer's company description
- **WHEN** it is read in full
- **THEN** it is a coherent sentence or short paragraph
- **AND** it carries no claim the company has not verified

### Requirement: Shell controls carry localisable accessible names

Every control in the shell SHALL have an accessible name, and that name SHALL follow the active
language when the control's purpose is expressed in words.

#### Scenario: The language is switched to Persian

- **GIVEN** the visitor switches to Persian
- **WHEN** a shell control's accessible name is read
- **THEN** it is expressed in Persian
- **AND** no control retains an English-only name that was intended to translate

### Requirement: The performance tier control does not dominate the navbar

The navbar SHALL NOT carry a multi-option performance tier selector among its primary destinations. Where
a manual override remains available, it SHALL be reachable without displacing the portal's main
navigation, and its labels SHALL be written for a production audience.

#### Scenario: The navbar is inspected at desktop width

- **GIVEN** the navbar renders at a desktop viewport
- **WHEN** its controls are enumerated
- **THEN** the primary destinations occupy the primary navigation group
- **AND** no tier selector sits alongside them as a peer destination

#### Scenario: The tier override is placed

- **GIVEN** a manual tier override remains available to visitors
- **WHEN** its control is located
- **THEN** it sits in a secondary surface rather than among the navbar's primary destinations
- **AND** it is labelled clearly as a performance setting
- **AND** auto-detection remains the default when no override is chosen