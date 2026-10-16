# Spec Delta

## Purpose

Keeps the home page and search fast on large content trees by reading a cached directory
index, while making sure caching never weakens or delays any access decision.

## ADDED Requirements

### Requirement: Bounded freshness of summaries and search
Category summaries (`/api/categories`) and search results (`/api/search`) SHALL be served
from a cached directory index and SHALL reflect a filesystem change within `CONTENT_INDEX_TTL_MS`
(default 30000, range 0–600000; `0` disables the cache and walks the disk per request).

#### Scenario: New file appears
- **WHEN** a file is added to a category folder
- **THEN** within `CONTENT_INDEX_TTL_MS` that category's `fileCount` includes it and a matching search returns it

#### Scenario: Cache disabled
- **WHEN** `CONTENT_INDEX_TTL_MS=0` is set
- **THEN** every request reads the filesystem, as today

### Requirement: Access decisions never cached
Every entry taken from the index SHALL be screened with the caller's current access decision on
each request. A policy change SHALL take effect as soon as the admin snapshot refreshes, with no
added delay from the index.

#### Scenario: Folder locked after indexing
- **WHEN** the index already holds a folder, an admin then locks it, and the admin snapshot refreshes
- **THEN** the next `/api/categories` and `/api/search` responses omit or lock that folder exactly as they would without the index

#### Scenario: Different callers, same index
- **WHEN** an anonymous caller and a signed-in user with a grant request `/api/categories` back to back
- **THEN** each gets counts that include only the entries they are allowed to see

### Requirement: Index stays within the content root
The index SHALL only record entries reached by the same containment and hidden-file rules as a
direct listing. Removed paths SHALL disappear from results within the freshness bound. Download,
hash and archive routes SHALL keep resolving paths on disk per request and SHALL NOT use the
index.

#### Scenario: Hidden file not indexed
- **WHEN** a dot-file exists in a category folder
- **THEN** it is neither counted in `/api/categories` nor returned by `/api/search`

#### Scenario: Deleted file not downloadable through the index
- **WHEN** a file is deleted while still in the index and a client requests its download
- **THEN** the download answers `404`, as today

### Requirement: Response shapes unchanged
`/api/categories` and `/api/search` SHALL keep their current fields, ordering and status codes.

#### Scenario: Category shape
- **WHEN** `/api/categories` is served from the index
- **THEN** each entry has the same fields (`name`, `path`, `type`, `fileCount`, `folderCount`, `mtime`, `latestModified`, or `locked` for a self-locked category) and is sorted by name
