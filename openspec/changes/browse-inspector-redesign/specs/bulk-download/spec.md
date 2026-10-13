# Spec Delta: bulk-download

## Purpose

Defines how a user takes action on more than one Browse item at once: the selection state held across
rows, select-all semantics, real multi-file download, and server-side ZIP streaming for a selection.

## ADDED Requirements

### Requirement: Rows carry an independent selection state

Each selectable Browse row SHALL expose a selection control whose state is tracked independently of
navigating into a folder or downloading that row's file. Selecting a row SHALL NOT trigger navigation or
a download, and each row SHALL be able to hold its own state.

#### Scenario: A folder row is selected

- **GIVEN** a directory listing is displayed
- **WHEN** the user selects a folder row
- **THEN** the folder becomes part of the selection
- **AND** the user is not navigated into the folder

#### Scenario: A row that is already downloading is selected

- **GIVEN** the user activates a row's download control
- **WHEN** the same row is also selected
- **THEN** the download proceeds
- **AND** the row's selection state is tracked without altering the download target

### Requirement: Selection counts and totals reflect real data

The page SHALL report how many items are selected and the real combined size of that selection. Folders
counted into the selection SHALL contribute a count of one item each; the system SHALL NOT invent a
recursive byte total for a folder.

#### Scenario: Files are selected

- **GIVEN** three files totalling a known byte count are selected
- **WHEN** the selection summary renders
- **THEN** it reports three items selected
- **AND** it reports the combined size of those three files

#### Scenario: A folder is selected

- **GIVEN** one folder and two files are selected
- **WHEN** the selection summary renders
- **THEN** it reports three items selected
- **AND** the folder contributes no byte total of its own

### Requirement: Select-all affects only the currently visible rows

The header select-all control SHALL select the rows currently visible in the listing, after search and
filter narrowing has been applied. It SHALL NOT select rows hidden by the active search, type filter, or
extension filter, and it SHALL clear the selection when it is activated while everything visible is
already selected.

#### Scenario: A filter is active

- **GIVEN** a filter has narrowed the listing to three rows out of fourteen
- **WHEN** the user activates select-all
- **THEN** exactly the three visible rows are selected
- **AND** the filtered-out rows are not selected

#### Scenario: Everything visible is already selected

- **GIVEN** every visible row is selected
- **WHEN** the user activates select-all again
- **THEN** the selection is cleared

### Requirement: Multi-file download transfers each selected file

Downloading a multi-file selection SHALL transfer each selected file individually through the
application's existing single-file download target. The system SHALL start each transfer without
requiring the user to click again, SHALL report progress, and SHALL not report completion for a file
that failed.

#### Scenario: Several files are selected and downloaded

- **GIVEN** three files are selected
- **WHEN** the user starts the multi-file download
- **THEN** each file is requested from the application's download target
- **AND** the browser handles each response as its own download

#### Scenario: One file fails

- **GIVEN** three files are selected for download
- **WHEN** one of them cannot be delivered
- **THEN** the remaining files still transfer
- **AND** the failure is reported for the affected file only

### Requirement: ZIP download streams a real archive for the selection

The system SHALL provide a server-produced ZIP archive containing exactly the selected files, generated
by streaming the selected files' real content. The archive SHALL NOT be a pre-existing file, SHALL NOT
contain placeholder entries, and SHALL be readable by standard unzip tooling.

#### Scenario: A selection is downloaded as ZIP

- **GIVEN** three files are selected
- **WHEN** the user starts the ZIP download
- **THEN** the server produces an archive streamed to the client
- **AND** the archive contains those three files with their real content
- **AND** extracting it yields files whose contents match the originals

#### Scenario: Entry names inside the archive

- **GIVEN** two selected files share the same file name but sit in different folders
- **WHEN** the archive is produced
- **THEN** each entry keeps a distinguishing path so neither is overwritten
- **AND** both entries are present

### Requirement: Selection cannot escape the user's permitted paths

A selection SHALL be honored only for items within the directory the user is browsing. The archive
endpoint SHALL apply the same path-containment rules and hidden-file policy as the listing and download
endpoints, and SHALL refuse a selection containing any entry that is not permitted.

#### Scenario: A selection references a path outside the browsed directory

- **GIVEN** a selection request includes a path resolving outside the user's browsed directory
- **WHEN** the request is processed
- **THEN** it is refused with an authorization error
- **AND** no archive is produced

#### Scenario: A selection includes a hidden file

- **GIVEN** a selection request includes an entry the listing would hide
- **WHEN** the request is processed
- **THEN** it is refused with an authorization error
- **AND** no archive is produced

#### Scenario: A selection is made in a directory requiring authentication

- **GIVEN** the browsed directory requires authentication
- **WHEN** an unauthenticated client requests the archive
- **THEN** the request is refused
- **AND** the refusal matches the listing and single-file download endpoints

### Requirement: Bulk controls are disabled when nothing is selected

Bulk action controls SHALL be disabled and SHALL not be activatable while the selection is empty, so a
user cannot start a bulk operation that has nothing to act on.

#### Scenario: The selection is empty

- **GIVEN** no rows are selected
- **WHEN** the bulk action bar renders
- **THEN** download and copy controls are disabled
- **AND** activating them does nothing

### Requirement: The copy-file-list action produces the real selection

The "Copy File List" action SHALL place the real relative paths of the currently selected items on the
clipboard, in listing order. It SHALL NOT include filtered-out items.

#### Scenario: A filtered selection is copied

- **GIVEN** two of the visible rows are selected under an active filter
- **WHEN** the user activates Copy File List
- **THEN** exactly those two relative paths are placed on the clipboard