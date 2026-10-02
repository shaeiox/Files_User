## Purpose

The Browse page is FROZEN. Phase 5 of the redesign is cancelled. This specification does not describe a
redesign — it describes the obligation to leave the page untouched.

The Browse page is the second route of the application. It renders a file and folder listing inside `#app`,
and it owns its own layout, stylesheet, and markup generator. None of it is in scope for this change.

Freezing the page is a deliberate trade-off. Phase 1 replaced the design tokens that `browse.css` consumes,
so the Browse page's palette, typography, borders, radii, and shadows will shift even though the page is not
edited. That drift is accepted. The alternative — pinning the Browse tokens to explicit fallback values — would
require adding rules to `browse.css`, which the freeze forbids.

## ADDED Requirements

### Requirement: The Browse page is frozen against all changes

The system SHALL treat the entire Browse page as immutable. `assets/css/browse.css`, `assets/js/browse.js`,
and `assets/js/file-actions.js` SHALL each remain byte-identical to their pre-redesign state for the whole
lifetime of this change. No rule may be added, modified, or removed; no render function may be altered; no
helper may be rewritten. The three files are verified only by reading them, never by editing them.

#### Scenario: A change is proposed for a Browse file

- **GIVEN** an engineer proposes an edit that would improve the Browse page's appearance
- **WHEN** the proposal is reviewed
- **THEN** the edit is rejected, because `browse.css`, `browse.js`, and `file-actions.js` are frozen
- **AND** the Browse page continues to render in its pre-redesign state

#### Scenario: Browse files are verified at the end of the change

- **GIVEN** the final phase of this change is complete
- **WHEN** `browse.css`, `browse.js`, and `file-actions.js` are compared byte-for-byte against their
  pre-redesign baselines
- **THEN** all three files match exactly
- **AND** any difference fails the phase and must be reverted before the change can ship

#### Scenario: Browse visual drift from Phase 1 token changes is accepted

- **GIVEN** Phase 1 replaced the tokens that `browse.css` consumes
- **WHEN** the Browse page is rendered afterward
- **THEN** its colors, fonts, borders, radii, and shadows reflect the new token values
- **AND** this drift is recorded as accepted, not as a defect
- **AND** no compensating rule is added to `browse.css`, because editing that file is forbidden