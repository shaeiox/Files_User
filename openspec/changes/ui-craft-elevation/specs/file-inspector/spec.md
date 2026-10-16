# Spec Delta

## Purpose

## MODIFIED Requirements

### Requirement: The card is accessible and direction-aware

The metadata card SHALL expose an accessible name for its close control, SHALL remain operable by
keyboard alone, SHALL render correctly in both text directions, and SHALL place its copy and download
controls in the mirrored order under right-to-left. Every colour the card renders SHALL meet the
contrast floor against every surface it sits on, under both themes, after accent unification. The
card's repeating progress indicator SHALL satisfy the shared motion contract.

#### Scenario: A keyboard user closes the card

- **GIVEN** the metadata card is open and focus is inside it
- **WHEN** the user activates the close control via the keyboard
- **THEN** the card closes
- **AND** focus does not remain trapped inside the dismissed card

#### Scenario: The card renders in Persian

- **GIVEN** the active language is Persian
- **WHEN** the metadata card renders
- **THEN** the layout mirrors, and values, digest, and snippet remain selectable and legible

#### Scenario: The card is read in each theme

- **GIVEN** either theme is active
- **WHEN** the card's labels, values, and digest are measured against the surfaces behind them
- **THEN** every one meets the contrast floor for its size and role
- **AND** no value becomes illegible as a result of accent unification

#### Scenario: The card's progress indicator loops

- **GIVEN** the card's archive control is performing real work
- **WHEN** its indicator animates
- **THEN** the animation repeats only while that work is in progress and stops when it ends
- **AND** the control's busy state remains distinguishable when the animation is suppressed by a
  performance tier or a reduced-motion preference