# Spec Delta

## ADDED Requirements

### Requirement: The page leads with the latest release of the active OS family

The first screen of the Releases page SHALL show the newest release for the active tab as its most prominent element: the version in the page's largest type, plus the file name, size, modification date, a primary Download action, and the stable latest-release command for that OS family. "Newest" SHALL be the same artifact that the matching `/releaseN/latest` endpoint streams.

#### Scenario: Releases exist for the active tab

- **WHEN** the page loads on the `el9` tab and the `el9` folder holds `pvm-release-7.1.29-el9-…tgz` and `pvm-release-7.1.15-el9-…tgz`
- **THEN** the lead block shows version `7.1.29` with that file's name, size and date
- **AND** its Download action downloads exactly that file
- **AND** the lead block shows the `/release9/latest` command for the selected shell

#### Scenario: The user switches OS family

- **WHEN** the user switches to the `el8` tab
- **THEN** the lead block updates to the newest `el8` release and the `/release8/latest` command

#### Scenario: No releases for the active tab

- **WHEN** the active folder holds no release artifacts
- **THEN** the lead block shows no version or Download action
- **AND** the page shows the empty state

### Requirement: Commands are generated for a user-selected shell

The page SHALL offer a shell choice of Linux/macOS and Windows PowerShell. The download, latest-release and verify commands SHALL all target the selected shell, never mixing shells. For a given file and shell, the command SHALL be identical across selections and reloads. The choice SHALL persist per browser, defaulting to Linux/macOS.

#### Scenario: Linux/macOS selected

- **WHEN** the shell is Linux/macOS and a file is selected and verified
- **THEN** the download command uses `curl -fLO '<absolute-url>'`
- **AND** the verify command checks the saved file with `sha256sum -c`

#### Scenario: Windows PowerShell selected

- **WHEN** the shell is Windows PowerShell and a file is selected and verified
- **THEN** the download command uses `curl.exe -fLO '<absolute-url>'`
- **AND** the verify command compares `Get-FileHash -Algorithm SHA256` of the saved file against the digest and prints `True` on a match

#### Scenario: The choice is remembered

- **WHEN** the user selects Windows PowerShell and later reloads the page
- **THEN** Windows PowerShell is still selected and all commands use it

#### Scenario: Switching shell keeps the digest

- **WHEN** a digest has been fetched for the selected file and the user changes shell
- **THEN** the digest stays displayed and the verify command is regenerated for the new shell without a new checksum request

### Requirement: Rows are selectable as a whole and keyboard operable

Each release row SHALL be selectable by activating anywhere on the row, and by keyboard through a single native control per row. The selected row SHALL be indicated by more than color alone. The newest row SHALL be identified with visible text. Activating a row's Download action SHALL NOT change the selection.

#### Scenario: Pointer selection

- **WHEN** the user clicks a row's size or date cell
- **THEN** that row becomes the selected package and the commands update to it

#### Scenario: Keyboard selection

- **WHEN** the user tabs into the list and uses arrow keys
- **THEN** the selection moves between rows and the commands follow it

#### Scenario: Download does not select

- **WHEN** the user activates the Download action of a row that is not selected
- **THEN** the file downloads and the previously selected row stays selected

### Requirement: Loading, empty, error and locked states are distinct

The package list SHALL show a loading placeholder while a request is in flight, an empty state when the folder has no releases, an error state with a Retry action when the request fails for any reason other than authentication, and the locked state with an Authenticate action when authentication is required. A failed request SHALL NOT be presented as an empty folder.

#### Scenario: The request fails

- **WHEN** `GET /api/releases` returns a 5xx status or the network fails
- **THEN** the list shows an error message and a Retry action
- **AND** activating Retry re-requests the active tab

#### Scenario: Authentication is required

- **WHEN** the request returns `401`
- **THEN** the list shows the locked state and no commands reference a file

### Requirement: The active OS tab is addressable in the URL

The page SHALL read the active tab from the `os` query parameter (`el8` or `el9`) on load, and SHALL fall back to `el9` for a missing or unknown value. Switching tabs SHALL update the `os` parameter without adding a browser history entry.

#### Scenario: A shared el8 link

- **WHEN** a browser loads `/download/release?os=el8`
- **THEN** the `el8` tab is active and its releases are listed

#### Scenario: An unknown value

- **WHEN** a browser loads `/download/release?os=el7`
- **THEN** the `el9` tab is active

#### Scenario: Switching tabs

- **WHEN** the user switches from `el9` to `el8`
- **THEN** the address bar shows `?os=el8`
- **AND** pressing Back leaves the Releases page instead of returning to `el9`

### Requirement: Copy actions confirm their result accessibly

Every command block SHALL have a Copy action. After activation, the page SHALL announce success or failure through a polite live region and show the result on the button briefly.

#### Scenario: Copy succeeds

- **WHEN** the user activates Copy on the download command
- **THEN** the clipboard holds exactly the displayed command
- **AND** assistive technology announces that it was copied
