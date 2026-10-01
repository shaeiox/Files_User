# Graph Report - files-server-web  (2026-10-01)

## Corpus Check
- 40 files · ~107,499 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .css 5, (none) 2, .log 1)

## Summary
- 178 nodes · 274 edges · 24 communities (8 shown, 16 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth & Resource Service
- API Router & Middleware
- Files Service & Versioning
- Env & Config Loading
- UI Pages & Shared Concepts
- Package & Dependencies
- Internationalization
- Security & Hashing
- Rate Limiting
- Autocomplete
- Banner Component
- Browse Page
- Home Page
- Router
- Performance Monitor
- Theme
- Idle Timer
- Avid Logo Dark
- Fylad Logo
- ISO Icon
- Log Logo
- AVID Download Logo
- Logo 2 Light
- Template Icon

## God Nodes (most connected - your core abstractions)
1. `login()` - 12 edges
2. `handleRequest()` - 10 edges
3. `Index Page` - 9 edges
4. `getRoot()` - 8 edges
5. `walk()` - 8 edges
6. `serviceError()` - 7 edges
7. `listPath()` - 7 edges
8. `listLatestReleases()` - 7 edges
9. `assertCategoryStructure()` - 6 edges
10. `sendText()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Client-side Router` --semantically_similar_to--> `Client-side Router`  [INFERRED] [semantically similar]
  browse.html → index.html
- `Internationalization` --semantically_similar_to--> `Internationalization`  [INFERRED] [semantically similar]
  browse.html → index.html
- `ResourceService` --indirect_call--> `login()`  [INFERRED]
  assets/js/services/resource-service.js → lib/auth-service.js
- `404 Error Page` --references--> `Index Page`  [EXTRACTED]
  404.html → index.html
- `handleRequest()` --calls--> `isSecureRequest()`  [EXTRACTED]
  lib/api-router.js → lib/http-utils.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Multi-page Application Structure** — 404_html_page, browse_html_page, index_html_page [INFERRED 0.85]
- **Shared JavaScript Dependencies** — browse_html_router, index_html_router, browse_html_i18n, index_html_i18n [INFERRED 0.85]

## Communities (24 total, 16 thin omitted)

### Community 0 - "Auth & Resource Service"
Cohesion: 0.09
Nodes (37): ResourceService, RFC-7515, base64urlDecode(), base64urlEncode(), buildClearCookie(), buildSessionCookie(), checkLockout(), clearFailedAttempts() (+29 more)

### Community 1 - "API Router & Middleware"
Cohesion: 0.16
Nodes (24): authService, filesService, handleRequest(), logger, path, rateLimiter, { sendJSON, sendText, sendServiceError, readJsonBody, isSecureRequest }, { serveSPA, serve404, serveStatic, streamDownload } (+16 more)

### Community 2 - "Files Service & Versioning"
Cohesion: 0.18
Nodes (26): assertCategoryStructure(), calculateReleaseBrowsePath(), compareVersions(), extractVersion(), fs, fsSync, getDownloadTarget(), getRoot() (+18 more)

### Community 3 - "Env & Config Loading"
Cohesion: 0.10
Nodes (14): fs, loadEnv(), parseEnvText(), path, c, ref_fs, ref_http, ref_path (+6 more)

### Community 4 - "UI Pages & Shared Concepts"
Cohesion: 0.14
Nodes (15): CloudAvid Brand, 404 Error Page, File Portal, Internationalization, Browse Page, Client-side Router, Autocomplete, Internationalization (+7 more)

### Community 5 - "Package & Dependencies"
Cohesion: 0.18
Nodes (10): dependencies, bcrypt, dotenv, description, main, name, private, scripts (+2 more)

### Community 6 - "Internationalization"
Cohesion: 0.67
Nodes (5): applyLang(), getDict(), getLang(), i18n, setupLanguageDropdown()

### Community 7 - "Security & Hashing"
Cohesion: 0.50
Nodes (5): bcrypt, Node.js Crypto Module, Password Hashing Script, Server Entry Point, Server Setup Instructions

## Knowledge Gaps
- **65 isolated node(s):** `Autocomplete`, `CavBanner`, `BrowsePage`, `HomePage`, `i18n` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 82 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `bcrypt` connect `Auth & Resource Service` to `Package & Dependencies`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `login()` (e.g. with `ResourceService` and `auth-service.js`) actually correct?**
  _`login()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Autocomplete`, `CavBanner`, `BrowsePage` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Resource Service` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._
- **Should `Env & Config Loading` be split into smaller, more focused modules?**
  _Cohesion score 0.10476190476190476 - nodes in this community are weakly interconnected._
- **Should `UI Pages & Shared Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._