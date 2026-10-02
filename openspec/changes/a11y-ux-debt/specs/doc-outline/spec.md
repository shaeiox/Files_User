# Capability: Document Outline

## Purpose

The application renders a document outline that skips heading levels, which breaks navigation for users who
move through a page by heading rather than by reading it linearly.

Three sequences are wrong today:

| Page | Current | Defect |
|---|---|---|
| Home | `h1` (hero) → `h3` (resource cards) | skips `h2` |
| Home loading state | `h1` (hero) → `h3` (skeleton placeholders) | skips `h2` |
| Shell | routed `h1` → `h4` (footer columns) | skips `h2` and `h3` |

A screen reader user hears "heading level 1", then "heading level 3", with nothing between. The visual styling is
already correct; only the semantic levels are wrong, so this capability changes tag names and adds no visual
difference.

Scope boundary: the Browse page already uses a single correct `h1` and its source is frozen, so it is left
alone. Visual appearance, font sizes, and spacing are unchanged.

## ADDED Requirements

### Requirement: The heading outline contains no skipped levels

Heading levels within a page SHALL descend without skipping. A level 3 heading SHALL be preceded by a level 2
or level 1 heading; a level 4 heading SHALL be preceded by a level 3 or lower heading.

#### Scenario: **HARD GATE** — No skipped level remains on any page

- **GIVEN** a user navigating by heading through the Home page or the shell
- **WHEN** the rendered heading sequence is walked in document order
- **THEN** no heading is preceded by a level more than one step above it
- **AND** the resource grid and the footer both sit under a level 2 heading

#### Scenario: Exactly one top-level heading per page

- **GIVEN** each route renders its own top-level heading into the shell
- **WHEN** a page finishes rendering
- **THEN** exactly one level 1 heading is present in the document
- **AND** the shell contributes no additional level 1 heading

### Requirement: Heading level changes preserve appearance

Changing a heading's semantic level SHALL NOT alter how it looks. The existing visual treatment is authored
against class selectors, so promoting or demoting a tag SHALL leave rendering identical.

#### Scenario: Re-levelled headings render identically

- **GIVEN** resource card titles and footer column titles carry visual styling via their classes
- **WHEN** their semantic levels are corrected
- **THEN** their computed font size, weight, colour, letter spacing, and margins are unchanged
- **AND** no new stylesheet rule is required to preserve the old appearance

#### Scenario: The outline is stable across the loading transition

- **GIVEN** the resource grid shows placeholder rows before results arrive
- **WHEN** the placeholder markup and the loaded markup are compared
- **THEN** both use the same heading level for equivalent content
- **AND** the heading structure does not shift when data arrives

### Requirement: The corrected outline does not alter frozen source

The Browse page's markup is frozen. Its heading structure SHALL remain as authored, and the shell outline
SHALL be corrected without changing which route owns its top-level heading.

#### Scenario: **HARD GATE** — Browse markup is untouched

- **GIVEN** the Browse page already renders a single correct top-level heading
- **WHEN** this capability is applied
- **THEN** no Browse source file is modified
- **AND** the Browse page's heading structure is unchanged

#### Scenario: Route ownership of the top-level heading is preserved

- **GIVEN** each routed page emits its own top-level heading
- **WHEN** the shell footer headings are re-levelled
- **THEN** the shell adds no competing top-level heading
- **AND** the routed page's heading remains the only one at that level