# Spec Delta

## Purpose

## MODIFIED Requirements

### Requirement: Browse motion respects reduced-motion and performance tiers

The Browse page SHALL animate its inspector and card transitions, and SHALL obey the shared motion
contract: animate only compositor properties, declare a reduced-motion branch and a lowest-tier
override in the same change, and never register a raw scroll event listener. No animation SHALL block
interaction, and no content SHALL be withheld when an animation is suppressed.

#### Scenario: The user prefers reduced motion

- **GIVEN** the operating system reports a reduced-motion preference
- **WHEN** the metadata card opens
- **THEN** it appears without the entrance animation
- **AND** its content and controls are fully available

#### Scenario: A lower performance tier is active

- **GIVEN** the page is running under a performance tier that disables animation
- **WHEN** the metadata card opens
- **THEN** the content becomes available without a long transition

#### Scenario: A Browse transition is authored

- **GIVEN** a new or changed animation is added to the Browse surface
- **WHEN** the change is reviewed
- **THEN** it animates only transform and opacity, declares its reduced-motion branch, and declares
  its lowest-tier override
- **AND** it registers no raw scroll event listener

### Requirement: Browse styling uses only the project's own design tokens

The Browse page SHALL be styled using the CSS custom properties defined in `assets/css/tokens.css` and
the existing six-stylesheet system. Every colour it uses SHALL resolve to a role declared by the shared
design-token contract, and no token SHALL be redeclared inside a Browse scope in a way that changes its
value. Material-3 style token names, Tailwind utility classes, and CDN-hosted icon or font resources
SHALL NOT appear in the shipped implementation.

#### Scenario: A Material token name reaches the stylesheet

- **GIVEN** the redesign is ported into the project stylesheet
- **WHEN** a Material-3 token name such as `surface-container-low` appears in `browse.css`
- **THEN** it is rejected, because the project has no such token
- **AND** the equivalent project token is used instead

#### Scenario: The inspector's accent is unified

- **GIVEN** the inspector currently introduces an accent hue found nowhere else in the portal
- **WHEN** the shared accent roles are applied
- **THEN** the inspector renders in one of the declared accent or semantic roles
- **AND** it introduces no accent hue of its own
- **AND** its text and controls still meet the contrast floor against every surface they sit on