# Spec Delta

## Purpose

Defines the project's design-token contract: that every surface in the portal resolves the same
accent colour, the same focus-ring colour, and the same typeface treatment for a given theme, and
that no token resolves to different values within a single rendered page.

## ADDED Requirements

### Requirement: One accent resolves per theme across the whole page

Within a single theme, every surface of the portal SHALL resolve the same accent colour. A design
token SHALL NOT be redeclared inside a component scope in a way that gives it a different computed
value in one part of the page than in another.

#### Scenario: A token is redeclared inside a component scope

- **GIVEN** a token used outside a component scope
- **WHEN** the same token name is declared inside that component's scope with a different value
- **THEN** it is rejected, because the page would render two accents at once
- **AND** the token resolves to its single theme-level value everywhere

#### Scenario: Every route is inspected

- **GIVEN** any rendered route
- **WHEN** the accent colour is sampled at the hero, the navbar, the primary call to action, the card
  grid, and the footer
- **THEN** every sample resolves to the same accent

### Requirement: The accent palette is limited to a documented set of roles

The theme SHALL define at most one accent colour plus at most one distinct primary-action fill, and
each SHALL be documented with the role it serves. No additional accent hue SHALL be introduced for a
single component.

#### Scenario: A component needs a colour outside the documented roles

- **GIVEN** a component requires a colour not covered by an existing role
- **WHEN** a new accent hue is introduced for it
- **THEN** it is rejected, because a per-component hue breaks palette coherence
- **AND** the component instead uses an existing role or a semantic status token

### Requirement: One focus-ring colour resolves per theme

For a given theme, every focusable control SHALL render the same focus-ring colour. Where a ring
token and a focus token both exist, they SHALL resolve to the same value in that theme.

#### Scenario: Focus moves between controls in dark theme

- **GIVEN** the dark theme is active
- **WHEN** a user tabs from a link to a button to a navbar control
- **THEN** every focus ring renders in the same colour
- **AND** no control renders a different ring colour from its neighbours

### Requirement: Display type is set with the correct optical treatment

A display face SHALL be set with tracking and leading appropriate to its own construction. A face
whose identity depends on letter separation SHALL NOT be set with negative tracking or leading below
one.

#### Scenario: An inscriptional serif is used for the hero headline

- **GIVEN** the hero headline uses a face built on letter separation
- **WHEN** its tracking or leading is measured
- **THEN** neither tightens the face below its natural rhythm
- **AND** the headline remains legible as that face rather than reading as a generic sans

### Requirement: Font faces are scoped by script

A font face SHALL declare the character range it covers, so a visitor is not made to download a
face whose glyphs the active language never renders.

#### Scenario: An English-locale visitor loads the portal

- **GIVEN** the active language renders no Arabic-script text
- **WHEN** the font resources are requested
- **THEN** no face declared for Arabic script is fetched
- **AND** no fallback font is reached at runtime for any rendered glyph

#### Scenario: The documented font behaviour is checked against the implementation

- **GIVEN** project documentation describes a font-loading behaviour
- **WHEN** the stylesheet's font declarations are inspected
- **THEN** the declared behaviour matches what the documentation claims
- **AND** a claim with no implementation is corrected rather than trusted

### Requirement: Contrast claims are measured, not inherited

Where a colour token's documentation quotes a measured contrast ratio, the quoted ratio SHALL
describe the value currently in the token. Any change to a colour token SHALL re-measure the ratio
and update the quoted figure in the same change.

#### Scenario: A colour token value changes

- **GIVEN** a token whose documentation states a measured ratio against named surfaces
- **WHEN** the token's value is modified
- **THEN** the ratio is re-measured against every surface the comment names
- **AND** the comment states the newly measured figure rather than the previous one

### Requirement: A referenced token is always defined

Every design token referenced by a stylesheet rule SHALL be defined in the token layer. A rule
referencing an undefined custom property SHALL be treated as a defect.

#### Scenario: A rule references an undefined token

- **GIVEN** a stylesheet declares a property whose value references a custom property
- **WHEN** that custom property is not defined in the token layer
- **THEN** the declaration is reported as a defect
- **AND** the property is either made to resolve or the reference is removed