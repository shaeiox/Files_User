# Spec Delta

## Purpose

Defines how wide the application shell and each route's content may be: fluid side gutters, a
per-route maximum width, alignment between the navbar, content and footer, and a readable measure for
running text.

## ADDED Requirements

### Requirement: The page container has fluid side gutters

The page container SHALL span the viewport minus a side gutter on each side. On viewports wider than
768px the gutter SHALL scale with the viewport width between a fixed minimum and maximum. At 768px and
below, the gutters SHALL be no wider than they are today, and the page SHALL never scroll horizontally.

#### Scenario: Desktop viewport

- **WHEN** any route renders at a viewport 1920px wide
- **THEN** each side gutter is wider than at 1280px and no wider than the documented maximum

#### Scenario: Small viewport

- **WHEN** any route renders at a viewport 375px wide
- **THEN** each side gutter is at most 8px
- **AND** the document has no horizontal scroll

### Requirement: Data-dense routes fill the available width

The Browse and Releases routes SHALL extend their content to the full width between the gutters, up
to an ultra-wide ceiling of 2560px of content width. They SHALL NOT be held to the home route's cap.

#### Scenario: Browse on a wide display

- **WHEN** the Browse route renders at a viewport 1920px wide
- **THEN** the file table's outer edges sit at the side gutters, with no additional empty margin

#### Scenario: Releases on an ultra-wide display

- **WHEN** the Releases route renders at a viewport 3440px wide
- **THEN** the content width is 2560px and the content is horizontally centred

### Requirement: The home route keeps a capped content width

The Home route SHALL keep a maximum content width of 1400px so that its hero continues to read as a
single composition with no wide empty band between text and visual.

#### Scenario: Home on a wide display

- **WHEN** the Home route renders at a viewport 1920px wide
- **THEN** the content width is 1400px and the content is horizontally centred

### Requirement: The shell aligns with the active route's content

The navbar and footer SHALL share the active route's content width, so their outer edges align with
the content edges on every route. Navigating between routes SHALL update the shell width with the
content, without a frame where they disagree.

#### Scenario: Navigating from Home to Browse at a wide viewport

- **WHEN** the user navigates from Home to Browse at a viewport 1920px wide
- **THEN** the navbar's and footer's outer edges move to the Browse content edges
- **AND** they stay aligned with the content edges after the transition ends

### Requirement: Running text keeps a readable measure

Headings, descriptions and other running text SHALL keep their character-based maximum widths when
the layout widens. Only layout tracks such as grids, tables and panels SHALL grow with the container.

#### Scenario: Wide Releases header

- **WHEN** the Releases route renders at a viewport 2560px wide
- **THEN** the header description line is no longer than its existing character cap

### Requirement: The Browse table distributes extra width across its columns

On wide viewports, the Browse table's type, modified and size columns SHALL widen along with the file
name column, so the extra width is not given to the file name column alone. The header row and every
data row SHALL keep identical column boundaries at every width.

#### Scenario: Wide Browse table

- **WHEN** the Browse table renders in detailed list mode at a viewport 1920px wide
- **THEN** the type, modified and size columns are wider than at 1280px
- **AND** the header cells line up with the cells of every row
