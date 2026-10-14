# Spec Delta

## ADDED Requirements

### Requirement: Locked rows are excluded from bulk actions until sign-in

Rows marked `locked: true` SHALL NOT be selectable for multi-file download or ZIP, and select-all
SHALL skip them. A ZIP request answered with `401 AUTH_REQUIRED` SHALL open the sign-in modal; one
answered with `404` SHALL report that the selection is no longer available.

#### Scenario: Select-all with a locked row

- **GIVEN** an anonymous visitor viewing two allowed files and one locked file
- **WHEN** the visitor uses select-all
- **THEN** only the two allowed files are selected

#### Scenario: A selected file becomes unpublished

- **GIVEN** a selection made before an administrator unpublished one of its files
- **WHEN** the ZIP is requested after the synchronization interval
- **THEN** the server refuses it with `404`
- **AND** the page reports that the selection is no longer available, and no archive is saved
