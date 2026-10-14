# Spec Delta

## ADDED Requirements

### Requirement: Locked rows show a lock and open sign-in instead of downloading

A listing or search row the server marks `locked: true` SHALL render with a lock indicator and no
size or date. Activating it SHALL open the existing sign-in modal instead of downloading the file or
entering the folder. After a successful sign-in, the page SHALL reload the listing without a full
page load.

#### Scenario: Anonymous user activates a locked file

- **GIVEN** an anonymous visitor viewing a folder that holds a locked file
- **WHEN** the visitor activates the locked row
- **THEN** the sign-in modal opens
- **AND** no download starts

#### Scenario: Sign-in succeeds

- **WHEN** the visitor signs in from that modal
- **THEN** the listing reloads in place
- **AND** the row shows its size and date and no lock if the visitor is now allowed

#### Scenario: Sign-in succeeds but access is still not allowed

- **WHEN** the visitor signs in but the file is `restricted` without a grant for them
- **THEN** the reloaded listing no longer shows the row

### Requirement: A direct download that needs sign-in opens the sign-in modal

When a file download started from the page is answered with `401 AUTH_REQUIRED`, the page SHALL open
the sign-in modal and SHALL NOT navigate to a raw error response.

#### Scenario: Session expired before the download

- **GIVEN** a logged-in user whose session has expired
- **WHEN** the user downloads a locked file from the listing
- **THEN** the sign-in modal opens instead of a JSON error page
