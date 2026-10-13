# Spec Delta: file-inspector

## Purpose

Defines the per-file File Metadata Card: the panel a user opens for a selected file, the real
server-derived values it is permitted to show, its open/close interaction and animation, and on-demand
SHA-256 verification computed over the file's actual bytes.

## ADDED Requirements

### Requirement: The metadata card opens when a file is selected

The metadata card SHALL open when a user selects a single file row, and SHALL remain closed when no
file is selected. Opening and closing SHALL be animated, and the card SHALL always be closable by an
explicit control as well as by changing selection.

#### Scenario: A file row is selected

- **GIVEN** a directory listing is displayed and no file is selected
- **WHEN** the user selects one file row
- **THEN** the metadata card opens for that file
- **AND** it does not block interaction with the listing

#### Scenario: The card is dismissed

- **GIVEN** the metadata card is open
- **WHEN** the user activates its close control
- **THEN** the card closes
- **AND** the selection state is cleared consistently with the closing animation

#### Scenario: A directory row is selected

- **GIVEN** a directory listing is displayed
- **WHEN** the user selects a folder row
- **THEN** the card opens for that folder
- **AND** controls that apply only to files, including checksum verification, are not offered

### Requirement: Several selected files are reachable through tabs

When more than one item is selected, the metadata card SHALL show a tab above the metadata section
with one tab per selected item, in listing order, and the card SHALL stay open rather than closing.
Activating a tab SHALL show that item's metadata. With exactly one item selected no tab strip SHALL
appear. The strip SHALL wrap rather than scroll sideways, SHALL stay bounded in height, and SHALL
remain operable at narrow viewports and in right-to-left text.

#### Scenario: A second item is selected

- **GIVEN** one item is selected and its metadata card is open
- **WHEN** the user selects a second item
- **THEN** the card stays open and a tab strip appears with one tab per selected item
- **AND** the card continues to show the item it was already showing

#### Scenario: A tab is activated

- **GIVEN** two items are selected and the card is showing the first
- **WHEN** the user activates the tab for the second
- **THEN** the metadata section shows the second item
- **AND** the activated tab is marked selected and the other is not

#### Scenario: Exactly one item is selected

- **GIVEN** exactly one item is selected
- **WHEN** the card is shown
- **THEN** no tab strip appears

#### Scenario: Tabs are used from the keyboard

- **GIVEN** the tab strip is shown
- **WHEN** a tab has focus and the user presses the arrow, Home, or End keys
- **THEN** the corresponding tab is activated

#### Scenario: A narrow viewport is used

- **GIVEN** the viewport is too narrow for the side-by-side layout
- **WHEN** several items are selected
- **THEN** the tabs wrap onto multiple lines instead of scrolling sideways
- **AND** the strip stays within a bounded height and does not overflow the page

#### Scenario: Right-to-left text is active

- **GIVEN** the active language is right-to-left
- **WHEN** the tab strip is shown
- **THEN** every tab remains inside the card and reachable

### Requirement: Checksum state never crosses between items

A checksum computed for one item SHALL NOT be displayed for another. Switching tabs SHALL clear any
computed digest, any error, and any in-flight verification, so a digest is always attributable to the
item currently shown.

#### Scenario: A digest is shown and the user switches tabs

- **GIVEN** a digest has been computed for the item currently shown
- **WHEN** the user activates another tab
- **THEN** no digest is displayed for the newly shown item
- **AND** the new item reports itself unverified

### Requirement: The metadata card shows only real server-derived values

The metadata card SHALL display only values derived from the server's own view of the file: exact size
in bytes alongside a human-readable form, last-modified timestamp, a type label, and the resolved
relative path. Values that cannot be derived SHALL be omitted rather than filled with placeholder,
sample, or illustrative text.

#### Scenario: A file has no derivable signature or scan status

- **GIVEN** the host cannot verify a digital signature or a third-party scan result for a file
- **WHEN** the metadata card renders
- **THEN** no signature field and no scan-status field is shown
- **AND** no placeholder or example text appears in their place

#### Scenario: A file's size is displayed

- **GIVEN** a file of 106430464 bytes
- **WHEN** the metadata card renders
- **THEN** both the exact byte count and a human-readable form are shown
- **AND** both are consistent with the listing row's size

### Requirement: Checksum verification runs only on explicit request

The system SHALL compute a SHA-256 checksum for a file only when a file is selected and the user
explicitly activates the checksum verification control. Listing a directory SHALL NOT trigger hashing,
and selecting a file SHALL NOT trigger hashing on its own.

#### Scenario: A user selects a file

- **GIVEN** a directory listing is displayed
- **WHEN** the user selects a file row
- **THEN** no checksum is requested from the server
- **AND** the verification control is offered in an unverified state

#### Scenario: A user requests verification

- **GIVEN** a file is selected and verification has not run
- **WHEN** the user activates the checksum verification control
- **THEN** the system computes the SHA-256 checksum over that file's bytes
- **AND** displays the resulting digest once available

#### Scenario: A directory listing is rendered

- **GIVEN** a directory is being listed
- **WHEN** the listing completes
- **THEN** no checksum is computed for any item

### Requirement: Checksums are computed over real file content

A checksum SHALL be computed by reading the file's actual bytes from storage. The digest SHALL reflect
the file's real contents, SHALL be reproducible for unchanged content, and SHALL NOT be derived from
metadata such as name, size, or timestamp.

#### Scenario: The same file is verified twice

- **GIVEN** a file whose contents have not changed
- **WHEN** verification is run twice
- **THEN** both runs report the same digest

#### Scenario: A file's contents change

- **GIVEN** a file whose contents have changed
- **WHEN** verification is run again
- **THEN** the reported digest differs from the earlier one

### Requirement: Verification failure is reported in place

When a checksum cannot be computed — because the file is unreadable, was removed, exceeds the size the
system will hash, or the path is not permitted — the system SHALL report the failure in the card without
navigating away, and SHALL NOT display a digest. A failure SHALL NOT be presented as a successful
verification.

#### Scenario: The file is too large to hash

- **GIVEN** a selected file exceeds the system's hashing size limit
- **WHEN** verification is requested
- **THEN** the card reports that the file is too large to verify
- **AND** no digest is displayed

#### Scenario: The path is not permitted

- **GIVEN** a request for a checksum on a path the user may not read
- **WHEN** the request completes
- **THEN** the request is refused with an authorization error
- **AND** no digest is returned or displayed

#### Scenario: A file is removed mid-session

- **GIVEN** a file is listed and then deleted from storage
- **WHEN** the user requests verification
- **THEN** the card reports that the file is unavailable
- **AND** the listing is not left in a falsely verified state

### Requirement: Checksum and digest are copyable and readable

A computed checksum SHALL be presented in full, SHALL be selectable as text, and SHALL be copyable to
the clipboard by an explicit control. The command-line fetch snippet SHALL be built from the file's real
download target rather than a hard-coded host name.

#### Scenario: The user copies a computed checksum

- **GIVEN** a digest has been computed for the selected file
- **WHEN** the user activates the copy control
- **THEN** the full digest is placed on the clipboard

#### Scenario: The fetch snippet is rendered

- **GIVEN** a file is selected
- **WHEN** the command-line snippet is rendered
- **THEN** it references the application's real download target
- **AND** it does not contain a hard-coded external domain name

### Requirement: The card is accessible and direction-aware

The metadata card SHALL expose an accessible name for its close control, SHALL remain operable by
keyboard alone, SHALL render correctly in both text directions, and SHALL place its copy and download
controls in the mirrored order under right-to-left.

#### Scenario: A keyboard user closes the card

- **GIVEN** the metadata card is open and focus is inside it
- **WHEN** the user activates the close control via the keyboard
- **THEN** the card closes
- **AND** focus does not remain trapped inside the dismissed card

#### Scenario: The card renders in Persian

- **GIVEN** the active language is Persian
- **WHEN** the metadata card renders
- **THEN** the layout mirrors, and values, digest, and snippet remain selectable and legible