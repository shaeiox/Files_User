# Spec Delta

## ADDED Requirements

### Requirement: A locked item reveals no metadata before sign-in

A row the server marks `locked: true` SHALL NOT be selectable, so the metadata card SHALL never show
size, modification date, checksum or a checksum control for it. Activating the row SHALL open the
sign-in modal instead.

#### Scenario: Anonymous user activates a locked file

- **WHEN** an anonymous visitor clicks a locked file row
- **THEN** the sign-in modal opens
- **AND** the metadata card does not open for that file

#### Scenario: Checksum request for a file that became locked

- **WHEN** a checksum request is answered with `401 AUTH_REQUIRED`
- **THEN** the card reports that sign-in is needed and the sign-in modal opens, instead of a
  generic access error
