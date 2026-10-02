# Capability: Contrast

## Purpose

The Obsidian Kinetic palette defines a four-step muted text scale (`--text`, `--text-2`, `--text-3`, `--text-4`).
The fourth step fails WCAG 2.1 AA in both themes: measured against `--bg-card` it resolves to **1.84:1** in dark
and **3.16:1** in light, against a 4.5:1 requirement for body text.

The failing token is live on the footer copyright line, the footer contact labels, the language menu
sub-labels, the autocomplete path and footer text, and six Browse selectors. At 11px monospace, 1.84:1 is not
a subtle hierarchy choice — it is effectively unreadable.

This capability fixes the scale at the token rather than at the call sites, so that all fifteen references are
corrected at once, including the six inside the frozen Browse stylesheet, without editing that file.

## ADDED Requirements

### Requirement: No user-visible text renders below the AA contrast floor

Every colour in the muted text scale SHALL resolve to at least 4.5:1 against every background surface the
application actually places text on. Large text, defined as at least 24px or at least 18.66px bold, may sit at
3:1.

#### Scenario: **HARD GATE** — The muted scale clears AA on every real surface

- **GIVEN** the surfaces text can sit on are `--bg`, `--bg-card`, `--bg-input`, `--bg-hover`, `--n-4`, and
  `--bg-elevated`
- **WHEN** every muted scale value is measured against each of those surfaces in both themes
- **THEN** every measured ratio is at least 4.5:1
- **AND** the previously failing token resolves to at least 4.5:1 in both themes

#### Scenario: The failing sites become legible

- **GIVEN** the footer copyright line, the footer contact labels, the language menu sub-labels, the
  autocomplete path and footer text, and six Browse selectors all resolve to the failing token
- **WHEN** the token is corrected
- **THEN** every one of those sites renders at or above the floor
- **AND** no call site is left pointing at a sub-AA value

#### Scenario: The muted scale does not invert

- **GIVEN** the scale is ordered from most to least prominent
- **WHEN** the quietest step is corrected to clear AA
- **THEN** no step renders brighter than the step above it
- **AND** the visual hierarchy runs monotonically from the brightest to the dimmest value

### Requirement: The correction reaches the frozen Browse stylesheet without editing it

The Browse stylesheet SHALL remain byte-identical. Because it consumes the failing token in six places, the
correction SHALL propagate through the token value alone, altering Browse's computed appearance without any
edit to the Browse source.

#### Scenario: **HARD GATE** — The frozen stylesheet is untouched

- **GIVEN** the Browse stylesheet references the corrected token in six selectors
- **WHEN** the correction is applied at the token
- **THEN** the Browse stylesheet is byte-identical to its pre-change state
- **AND** all six Browse selectors render at or above the contrast floor as a result of the token change alone

#### Scenario: Browse appearance changes without a Browse edit

- **GIVEN** the Browse stylesheet still references the corrected token by name
- **WHEN** the token value changes
- **THEN** Browse's muted text re-renders at the corrected value
- **AND** this drift is recorded as accepted rather than treated as a defect

### Requirement: The corrected token stays defined

The failing token SHALL remain declared in both themes, because the frozen Browse stylesheet references it.
Removing the declaration would leave those references invalid and break the Browse page.

#### Scenario: The token is not deleted

- **GIVEN** the frozen Browse stylesheet references the token six times
- **WHEN** the correction is applied
- **THEN** the token is still declared and still resolves in both themes
- **AND** no reference to it becomes invalid

#### Scenario: A future removal is deferred, not forgotten

- **GIVEN** the scale has three usable colour steps after the correction
- **WHEN** the token is consolidated in a later change
- **THEN** the consolidation happens only after the Browse freeze is lifted
- **AND** the deferral is recorded rather than silently forgotten

### Requirement: Contrast claims are mechanically verifiable

Every contrast value asserted by this capability SHALL be reproducible by a script that reads the shipped token
values and computes the ratios, rather than asserted by inspection.

#### Scenario: The floor is re-checkable

- **GIVEN** the muted scale values and the surface tokens are declared in the token stylesheet
- **WHEN** a script computes the contrast ratio of each scale value against each surface in both themes
- **THEN** the script reports every ratio
- **AND** any ratio below the floor is a detectable failure rather than a silent regression