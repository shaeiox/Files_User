# Spec Delta

## Purpose

Defines the home route: the hero composition, the resource grid and its hierarchy, the filter, sort
and view controls, the search-results surface, the page's empty and error states, and the feedback
a user receives when they download a file from it.

## ADDED Requirements

### Requirement: The hero presents one composition, not two disconnected halves

The hero SHALL read as a single composition. Text and its supporting visual SHALL be close enough to
be read as one arrangement at every viewport, and the page's content container SHALL NOT be wide
enough to leave a large empty band between them.

#### Scenario: The hero renders at a wide desktop viewport

- **GIVEN** the viewport is at least 1440px wide
- **WHEN** the hero renders
- **THEN** no empty band wider than roughly a third of the hero separates its text from its visual
- **AND** the two read as one arrangement rather than as separate blocks

#### Scenario: The hero renders on a narrow viewport

- **GIVEN** the viewport is at most 1024px wide
- **WHEN** the hero renders
- **THEN** the visual and the text stack in a single column
- **AND** neither is positioned outside the page flow or clipped

### Requirement: Every resource card carries its own distinct description

Each resource card SHALL show a description specific to that resource. Two cards SHALL NOT render
the same description text.

#### Scenario: Two resources are listed

- **GIVEN** the resource list contains two or more entries
- **WHEN** the grid renders
- **THEN** each card's description describes that specific resource
- **AND** no two cards render identical description text

#### Scenario: A resource has no description available

- **GIVEN** a resource carries no description from its source
- **WHEN** its card renders
- **THEN** the description element is omitted rather than filled with placeholder prose
- **AND** the card's title and metadata remain readable

### Requirement: The resource grid communicates hierarchy

The resource grid SHALL present at least one resource with a distinct, wider treatment so the
section carries internal hierarchy rather than presenting every resource as an equal peer.

#### Scenario: The grid renders

- **GIVEN** the resource list contains more than three entries
- **WHEN** the grid renders
- **THEN** at least one entry occupies a visibly wider or taller cell than the others
- **AND** the wider entry is positioned first in the reading order

### Requirement: Filtering, sorting, and view changes are visually continuous

When a user changes the active category filter, the active sort order, or the view mode, the cards
that remain SHALL move to their new positions or appearance rather than being destroyed and
instantly recreated.

#### Scenario: The sort order changes

- **GIVEN** seven resource cards are displayed
- **WHEN** the user changes the sort order
- **THEN** each card animates from its previous position to its new one
- **AND** the same cards are still present, not replaced by new elements

#### Scenario: The view mode changes

- **GIVEN** resource cards are displayed in one view mode
- **WHEN** the user switches view mode
- **THEN** the outgoing cards fade and scale down before the layout changes
- **AND** the incoming cards fade in, rather than the grid snapping with no transition

#### Scenario: A category filter excludes a card

- **GIVEN** seven resource cards are displayed
- **WHEN** the user selects a category that matches two of them
- **THEN** the five excluded cards animate out rather than disappearing instantly
- **AND** the two remaining cards are still operable immediately after

### Requirement: Search results report their own progress

A recursive search SHALL report how many items have been found, and the results SHALL arrive in a way
that acknowledges the search is progressing rather than appearing all at once after an unknown delay.

#### Scenario: A search returns many results

- **GIVEN** a search that returns more than ten results
- **WHEN** the results arrive
- **THEN** the result count updates as results are added
- **AND** the visible rows reveal progressively, with the reveal capped so total time stays bounded

#### Scenario: A search returns no results

- **GIVEN** a search matching nothing
- **WHEN** the search completes
- **THEN** a composed empty state is shown that names the query the user entered
- **AND** it offers a way to clear the query or widen the search

#### Scenario: A search is repeated

- **GIVEN** a results panel has already been shown once
- **WHEN** the user runs a second search
- **THEN** the results reveal again with the same feedback as the first search
- **AND** the reveal does not depend on state left over from the first run

### Requirement: A download from the home page reports its outcome

A single-file download initiated from the home page SHALL report what is happening to the user while
it runs and SHALL report failure in the interface rather than through a blocking browser dialog.

#### Scenario: A download starts

- **GIVEN** a user activates a download control on the home page
- **WHEN** the transfer begins
- **THEN** the control reports that a check or transfer is in progress
- **AND** the rest of the interface remains interactive

#### Scenario: A download fails

- **GIVEN** a download request fails or the server is unreachable
- **WHEN** the failure is reported
- **THEN** the failure appears in the interface in the visitor's active language
- **AND** no blocking browser alert dialog is raised
- **AND** the control returns to its resting state so it can be retried

### Requirement: Error states render with a visible boundary

Any page-level error state SHALL render with a visible border or boundary in both themes, so it is
distinguishable from an empty result.

#### Scenario: A resource load fails

- **GIVEN** the resource list cannot be loaded
- **WHEN** the error state renders
- **THEN** a visible boundary is drawn around it in both themes
- **AND** the boundary is not silently dropped by a reference to an undefined token

### Requirement: No visible string is filler or untranslated

Every user-visible string on the home route SHALL be specific to its context and SHALL render in the
visitor's active language.

#### Scenario: A failure message is produced

- **GIVEN** an error condition occurs during a download
- **WHEN** its message is rendered
- **THEN** the message comes from the active language's dictionary
- **AND** no string is hardcoded in a single language inside the behaviour code

#### Scenario: The page's editorial copy is reviewed

- **GIVEN** the hero status label and the footer's descriptive paragraph
- **WHEN** each is read
- **THEN** neither is a placeholder or a keyword list
- **AND** any factual claim within them, such as a stated company age, is accurate