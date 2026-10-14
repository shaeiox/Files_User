# Graph Report - files-server-web  (2026-10-14)

## Corpus Check
- 177 files · ~392,697 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 24 file(s) not represented in the graph (top: .woff2 10, .css 7, (none) 5)

## Summary
- 3181 nodes · 3907 edges · 292 communities (263 shown, 29 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 471 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c86140b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- login
- files-service.js
- api-router.js
- Hardening Controls
- logAccess
- getDict
- Code Review and Quality
- Test-Driven Development
- Deployment
- Context Engineering
- Git Workflow and Versioning
- Shipping and Launch
- Proposal: Project Brain Documentation
- Extending
- API and Interface Design
- Browser Testing with DevTools
- Frontend UI Engineering
- Performance Optimization
- CI/CD and Automation
- Constraint-Driven Development
- Deprecation and Migration
- Incremental Implementation
- Code Simplification
- Debugging and Error Recovery
- Documentation and ADRs
- Development
- server.js
- Interview Me
- Planning and Task Breakdown
- ReOrder: Keep Your Regulars Ordering Direct
- Doubt-Driven Development
- Index Page
- Idea Refine
- Using Agent Skills
- Spec-Driven Development
- Source-Driven Development
- Refinement & Evaluation Criteria
- openspec-explore/SKILL.md
- Proposal: Browse File Action Icon
- opsx-explore.md
- Design: Project Brain Documentation
- package.json
- ADDED Requirements
- Ideation Frameworks Reference
- Tasks: Browse File Action Icon
- 4. Architecture Documentation Strategy
- ADR-010: Vendored Lenis for smooth scrolling, gated by perf and reduced-motion
- 14. Security, Performance, Compatibility, and Migration Considerations
- 15. Implementation Phase Mapping
- 1. Design Overview
- Tasks: Project Brain Documentation
- Requirement: Hover and focus visibility of actions
- 12. Confirmed Facts, Assumptions, and Unresolved Details
- docs/README.md
- Requirement: Action applicability derived from item data
- Requirement: Click isolation across icon, name, and File Action
- Requirement: Item target URLs built only via ResourceService primitives
- Requirement: Dedicated File Actions module boundary
- Requirement: Keyboard operability with visible focus
- Requirement: Localized extensibility for future actions
- 11. Source Reference Strategy
- 13. Maintenance and Consistency Strategy
- 2. Documentation Boundaries
- 3. Repository-to-Documentation Mapping
- 5. API Documentation Strategy
- Spec Delta: file-actions
- Requirement: Accessible names for item targets
- Requirement: Targets available in both view modes
- ADDED Requirements
- Requirement: Existing file-name link behavior preserved
- Requirement: Router interaction compatibility
- 6. Data Flow Documentation Strategy
- autocomplete.js
- reset
- browse.js
- file-actions.js
- home.js
- router.js
- PerformanceMonitor
- verify-contrast.js
- idea-refine.sh
- Avid Logo Dark
- Fylad Logo
- ISO Icon
- Log Logo
- AVID Download Logo (Dark)
- Logo 2 Light
- Template Icon
- admin-db.js
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- Requirements
- ADDED Requirements
- Requirements
- Locked Decisions
- ADDED Requirements
- client
- archive-service.check.js
- Secrets and Configuration
- auth-service.js
- ADDED Requirements
- ADDED Requirements
- Requirements
- Design: Accessibility & UX Debt Clearance
- compareVersions
- ADDED Requirements
- pathRequiresAuth
- admin-fixture.js
- lenis.min.js
- listLatestReleases
- overflow
- ref_path
- ADDED Requirements
- streamDownload
- hash-service.check.js
- Decisions
- Design: Enterprise UI Redesign ("Obsidian Kinetic")
- Requirement: Content routes accept HTTP Basic credentials
- Requirement: Every navbar control is operable by keyboard
- archive-service.js
- Design: Browse Files Item Targets and File Actions
- access-policy.test.js
- Architecture
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- Requirement: In integration mode, release protection comes from the admin folder lock
- cli-auth.test.js
- auth.test.js
- endpoints.test.js
- signJwt
- ADR-012: In-memory rate limiting and brute-force lockout
- ADDED Requirements
- Integration: CloudAvid File Portal ↔ Dimension Files Manager
- Style Guide
- Change: Accessibility & UX Debt Clearance
- ADDED Requirements
- Tasks: Accessibility & UX Debt Clearance
- browse/DESIGN.md
- release/DESIGN.md
- ADR-009: Runtime performance tiers gate visual effects
- ADR-011: Self-hosted WOFF2 fonts to satisfy CSP `font-src 'self'`
- ADDED Requirements
- legacy-auth.test.js
- 9. Cross-Cutting Flows
- ADR-001: No web framework — plain `node:http`
- ADR-006: Vanilla JS SPA with no build step
- ADR-008: CSS custom properties as the design-token layer, no preprocessor
- Decisions
- Decisions
- Requirement: Hero Section Freeze
- API Reference
- ADR-005: Three-layer path containment for the filesystem boundary
- ADR-007: nginx serves static assets and proxies `/api/`
- ADDED Requirements
- ADDED Requirements
- Requirement: Breakpoint behaviours that remove functionality are preserved
- Decisions
- Data Flows
- ADR-002: The filesystem is the datastore
- Extending Frontend Behavior
- Tasks
- Proposal: Browse Page Inspector Redesign
- Requirement: Locked rows show a lock and open sign-in instead of downloading
- Alternatives Considered
- loadUsersSync
- Verification After an Extension
- Project Brain Documentation
- Process
- Requirement: Complete File Action ownership
- Requirement: Primary Browse icon is an additional navigation target
- Proposal
- Tasks
- Requirement: Language switch rebuilds all dynamic text
- Proposal
- Proposed Documentation Files
- Proposal
- Verification Requirement
- Observability and Instrumentation
- Tasks
- ADDED Requirements
- 2. Token Architecture
- 6. Home Page Mapping
- ADDED Requirements
- Requirement: The Enterprise Footer is real, bilingual shell content
- ADDED Requirements
- Requirement: Loading, empty, and error states keep their shape and behaviour
- Requirement: The autocomplete dropdown keeps its mechanism and internal scroll
- Requirement: Login from a locked folder shows the folder without a reload
- Tasks
- makeClearCookieHeader
- Production Process
- Development Workflow
- Adding or Changing an API Endpoint
- Core Principles
- main
- Requirement: Row layout compatibility with the existing column structure
- Requirement: Locked rows are excluded from bulk actions until sign-in
- Requirement: A locked item reveals no metadata before sign-in
- 3. Font Loading Strategy
- Enterprise Footer Mapping
- Requirement: The bottom grid, releases UI, and status bar are removed
- Requirement: The category filter and sort controls keep their contract
- Requirement: The full search flow is preserved end to end
- Requirement: The login modal stays callable after the pruning
- Requirement: Localised formatting follows the selected language
- Requirement: The three translation attributes keep their distinct behaviours
- Requirement: Translation is reapplied after every route render
- Requirement: Filter and performance menus open via a class on their wrapper
- Requirement: The performance toast and debug panel keep their behaviour and layering
- Requirement: Every new direction-sensitive rule is mirrored or authored logically
- Requirement: Low and potato tiers actually remove the effects
- Requirement: The protected files are untouched
- Requirement: The tier is selected before paint and honours reduced motion
- Tasks
- scrollTo
- Architecture Decision Records
- Requirement: Directory items expose no dedicated File Action
- 1. Architecture Direction
- 4. Backdrop Strategy
- Requirement: Home markup edits stay within the whitelist
- Requirement: Resource cards are driven exclusively by the data layer
- Requirement: The search field keeps its autocomplete host
- Requirement: New strings require both an attribute and both dictionaries
- Requirement: The Enterprise Footer keys are added in Phase 8
- Requirement: The two dictionaries remain structurally parallel
- Requirement: Modal controls keep their ids and semantics
- Requirement: Overlays render correctly across breakpoints, themes, and directions
- Requirement: The login modal's 250 ms contract is preserved
- Requirement: Both directions render correctly
- Requirement: Every new effect has a low-tier and a potato-tier override
- Confirmed Facts vs. Assumptions
- Frontend Development
- Release & Versioning
- Requirement: Event isolation is achieved structurally, not by speculative cancellation
- Requirement: Independent action definitions
- Requirement: Availability windows are enforced for everyone
- Requirement: Folder policies apply to everything inside the folder
- Requirement: Invalid or unreadable policy data fails closed
- 9. Performance / RTL / Responsive Strategy
- Requirement: Every surviving Home id survives unchanged
- Requirement: Pre-existing Home defects are neither fixed nor worsened
- Requirement: The logo wipe contract survives
- Requirement: The search field identity is unchanged
- Requirement: The view toggle and refresh control keep their behaviour
- Requirement: No existing dictionary entry is modified
- Requirement: Pre-existing localisation defects are neither fixed nor worsened
- Requirement: No accessibility improvement is introduced into the modal
- Requirement: Overlay effects are tier-gated
- Requirement: The authentication-required lock keeps its control chain
- Requirement: The language menu remains hover-only
- Requirement: The modal attaches to the document body
- Requirement: The single-instance guard is preserved
- Requirement: All six breakpoints are preserved exactly
- Requirement: Focus visibility survives the restyle
- Requirement: Hover-capability fallback is preserved
- Requirement: No new global or per-render listener is introduced
- Requirement: The Browse freeze holds for the whole change
- Requirement: The performance tier cache still round-trips
- Spec Delta
- Requirement: A path with no applicable policy keeps existing portal behavior
- Requirement: Access is decided before the filesystem is consulted
- Requirement: Admin policy changes take effect within the synchronization interval
- Requirement: An explicit deny always blocks that user
- Requirement: Another name for a governed file is governed too
- Requirement: Categories and counts reflect only allowed content
- Requirement: Direct downloads are enforced
- Requirement: Each policy is checked against its own grants
- Requirement: Listings show only allowed entries and the entries that carry a lock
- Requirement: Portal paths map directly to admin client paths
- Requirement: Release listings and latest-release URLs are enforced
- Requirement: Search applies the listing rules before limits
- Requirement: The combined decision is hidden, then locked, then allow
- Requirement: Unpublished items are hidden from everyone
- Requirement: ZIP archives contain only allowed files
- Requirement: The performance monitor's surfaces survive
- file-inspector.js
- releases.js
- idle-timer.js
- bcrypt

## God Nodes (most connected - your core abstractions)
1. `pathRequiresAuth()` - 34 edges
2. `login()` - 27 edges
3. `resolveInsideRoot()` - 25 edges
4. `handleRequest()` - 23 edges
5. `verifySession()` - 22 edges
6. `ADDED Requirements` - 22 edges
7. `listLatestReleases()` - 21 edges
8. `API Reference` - 21 edges
9. `serviceError()` - 20 edges
10. `client()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `6.6 Content discipline` --references--> `getDict()`  [INFERRED]
  openspec/changes/enterprise-ui-redesign/design.md → assets/js/i18n.js
- `6. Bidirectional parity, motion, i18n, and documentation` --references--> `applyLang()`  [INFERRED]
  openspec/changes/archive/2026-10-13-browse-inspector-redesign/tasks.md → assets/js/i18n.js
- `D4. The icon target's accessible name is an action label, distinct from the name link's` --references--> `applyLang()`  [INFERRED]
  openspec/changes/browse-file-actions/design.md → assets/js/i18n.js
- `Responsive behaviour` --references--> `overflow()`  [INFERRED]
  openspec/changes/enterprise-ui-redesign/design.md → assets/js/vendor/lenis.min.js
- `Locked Invariants` --references--> `overflow()`  [INFERRED]
  openspec/changes/enterprise-ui-redesign/proposal.md → assets/js/vendor/lenis.min.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Multi-page Application Structure** — 404_html_page, browse_html_page, index_html_page [INFERRED 0.85]
- **Shared JavaScript Dependencies** — browse_html_router, index_html_router, browse_html_i18n, index_html_i18n [INFERRED 0.85]

## Communities (292 total, 29 thin omitted)

### Community 0 - "login"
Cohesion: 0.17
Nodes (22): ResourceService, `GET /api/auth/status`, Session Verification, Auth Issues, Adding Authentication-Protected Behavior, Documentation to Update, Extension Points, Where Auth Is Implemented (+14 more)

### Community 1 - "files-service.js"
Cohesion: 0.13
Nodes (34): `GET /api/categories`, `GET /api/files/*`, 3. File Browsing Flow, Decision, Code Conventions, Error Handling Pattern, Observed Conventions, Adding a New File Operation (+26 more)

### Community 2 - "api-router.js"
Cohesion: 0.15
Nodes (20): Adding/Changing API Behavior, Documentation to Update, accessPolicy, adminDb, archiveService, authService, filesService, handleRequest() (+12 more)

### Community 3 - "Hardening Controls"
Cohesion: 0.05
Nodes (42): Broken Access Control, Broken Authentication, Cross-Site Scripting (XSS), Data Classification, Dependency Audit Triage, Destructive Operations on Derived Paths, File Upload Safety, Hardening Patterns (+34 more)

### Community 4 - "logAccess"
Cohesion: 0.23
Nodes (14): Logging Pattern, Existing Logging, Extending Logging / Operational Behavior, Extension Point, 5. Usernames logged in plaintext (LOW), Logging/Security Observability, error(), info() (+6 more)

### Community 5 - "getDict"
Cohesion: 0.33
Nodes (10): applyLang(), getDict(), getLang(), i18n, setupLanguageDropdown(), Accessibility behavior (revised), 10.1 New keys, 10.2 Structural parallelism (+2 more)

### Community 6 - "Code Review and Quality"
Cohesion: 0.07
Nodes (29): 1. Correctness, 2. Readability & Simplicity, 3. Architecture, 4. Security, 5. Performance, Change Descriptions, Change Sizing, Code Review and Quality (+21 more)

### Community 7 - "Test-Driven Development"
Cohesion: 0.07
Nodes (29): Browser Testing with DevTools, Common Rationalizations, DAMP Over DRY in Tests, Decision Guide, Discover the Stack First, Name Tests Descriptively, One Assertion Per Concept, Overview (+21 more)

### Community 8 - "Deployment"
Cohesion: 0.12
Nodes (16): API Proxying, Binding, Denied Paths (nginx), Deployment, Deployment Architecture, Frontend Assets in Production, Health / Verification, Installation (+8 more)

### Community 9 - "Context Engineering"
Cohesion: 0.07
Nodes (28): Anti-Patterns, Common Rationalizations, Compress before dropping, Confusion Management, Context Budget Management, Context Engineering, Context Packing Strategies, Level 1: Rules Files (+20 more)

### Community 10 - "Git Workflow and Versioning"
Cohesion: 0.15
Nodes (12): Change Summaries, Common Rationalizations, Git Workflow and Versioning, Handling Generated Files, Overview, Pre-Commit Hygiene, Red Flags, The Save Point Pattern (+4 more)

### Community 11 - "Shipping and Launch"
Cohesion: 0.08
Nodes (25): Accessibility, Code Quality, Common Rationalizations, Documentation, Error Budget Release Gate, Error Reporting, Feature Flag Strategy, Infrastructure (+17 more)

### Community 12 - "Proposal: Project Brain Documentation"
Cohesion: 0.08
Nodes (25): Acceptance Criteria, Assumptions (not fully verified), Completeness, Confirmed Facts (verified against source), Confirmed Facts vs. Assumptions, Consistency, Documentation Maintenance, Goals (+17 more)

### Community 13 - "Extending"
Cohesion: 0.18
Nodes (11): Adding Dependencies, Documentation Update Matrix, Extending, Extending Security-Sensitive Behavior, Installation, Non-Extension Boundaries, Notes, Purpose and Extension Model (+3 more)

### Community 14 - "API and Interface Design"
Cohesion: 0.08
Nodes (24): 1. Contract First, 2. Consistent Error Semantics, 3. Validate at Boundaries, 4. Prefer Addition Over Modification, 5. Predictable Naming, 6. Honouring an Idempotency Key, API and Interface Design, Common Rationalizations (+16 more)

### Community 15 - "Browser Testing with DevTools"
Cohesion: 0.08
Nodes (24): Accessibility Verification with DevTools, Available Tools, Browser Testing with DevTools, Clean Console Standard, Common Rationalizations, Console Analysis Patterns, Content Boundary Markers, For Network Issues (+16 more)

### Community 16 - "Frontend UI Engineering"
Cohesion: 0.08
Nodes (24): Accessibility (WCAG 2.1 AA), ARIA Labels, Avoid the AI Aesthetic, Color, Common Rationalizations, Component Architecture, Component Patterns, Design System Adherence (+16 more)

### Community 17 - "Performance Optimization"
Cohesion: 0.08
Nodes (24): Common Rationalizations, Connection Pool Exhaustion, Core Web Vitals Targets, Large Bundle Size, Log every attempt, including the reverted ones, Missing Caching (Backend), Missing Image Optimization (Frontend), N+1 Queries (Backend) (+16 more)

### Community 18 - "CI/CD and Automation"
Cohesion: 0.08
Nodes (23): Automation Beyond CI, Basic CI Pipeline, Build Cop Role, CI/CD and Automation, CI Optimization, Common Rationalizations, Dependabot / Renovate, Deployment Strategies (+15 more)

### Community 19 - "Constraint-Driven Development"
Cohesion: 0.08
Nodes (22): Adapting it, Contract, Floor guard: reference implementation, Reference (Node, ~stack-agnostic patterns), Common Rationalizations, Constraint-Driven Development, Escalation Path, Loading Constraints (+14 more)

### Community 20 - "Deprecation and Migration"
Cohesion: 0.08
Nodes (23): Adapter Pattern, Code Is a Liability, Common Rationalizations, Compulsory vs Advisory Deprecation, Core Principles, Database Schema Migrations (Expand/Contract), Deprecation and Migration, Deprecation Planning Starts at Design Time (+15 more)

### Community 21 - "Incremental Implementation"
Cohesion: 0.09
Nodes (22): Common Rationalizations, Contract-First Slicing, Implementation Rules, Increment Checklist, Incremental Implementation, Overview, Red Flags, Risk-First Slicing (+14 more)

### Community 22 - "Code Simplification"
Cohesion: 0.09
Nodes (21): 1. Preserve Behavior Exactly, 2. Follow Project Conventions, 3. Prefer Clarity Over Cleverness, 4. Maintain Balance, 5. Scope to What Changed, Code Simplification, Common Rationalizations, Language-Specific Guidance (+13 more)

### Community 23 - "Debugging and Error Recovery"
Cohesion: 0.09
Nodes (21): Build Failure Triage, Common Rationalizations, Debugging and Error Recovery, Error-Specific Patterns, Instrumentation Guidelines, Overview, Red Flags, Runtime Error Triage (+13 more)

### Community 24 - "Documentation and ADRs"
Cohesion: 0.09
Nodes (21): ADR Lifecycle, ADR Template, API Documentation, Architecture Decision Records (ADRs), Changelog Maintenance, Common Rationalizations, Document Known Gotchas, Documentation and ADRs (+13 more)

### Community 25 - "Development"
Cohesion: 0.29
Nodes (7): Development, Documentation Maintenance, Generated and Non-Source Paths, Installation, Local Setup, Prerequisites, Repository Structure

### Community 26 - "server.js"
Cohesion: 0.18
Nodes (9): accessPolicy, adminDb, apiRouter, configProblems, filesService, http, { loadEnv }, logger (+1 more)

### Community 27 - "Interview Me"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Example, Interaction with Other Skills, Interview Me, Loading Constraints, Output, Overview, Red Flags (+10 more)

### Community 28 - "Planning and Task Breakdown"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Output Files, Overview, Parallelization Opportunities, Plan Document Template, Planning and Task Breakdown, Red Flags, See Also (+10 more)

### Community 29 - "ReOrder: Keep Your Regulars Ordering Direct"
Cohesion: 0.11
Nodes (17): Example 1: Vague Early-Stage Concept (Full 3-Phase Session), Example 2: Feature Idea Within an Existing Product (Codebase-Aware), Example 3: Process/Workflow Idea (Non-Product), Ideation Session Examples, Key Assumptions to Validate, MVP Scope, Not Doing (and Why), Open Questions (+9 more)

### Community 30 - "Doubt-Driven Development"
Cohesion: 0.12
Nodes (15): Common Rationalizations, Cross-model escalation, Doubt-Driven Development, Interaction with Other Skills, Loading Constraints, Overview, Red Flags, Step 1: CLAIM — Surface what stands (+7 more)

### Community 31 - "Index Page"
Cohesion: 0.14
Nodes (15): CloudAvid Brand, 404 Error Page, File Portal, Internationalization, Browse Page, Client-side Router, Autocomplete, Internationalization (+7 more)

### Community 32 - "Idea Refine"
Cohesion: 0.13
Nodes (14): Anti-patterns to Avoid, Detailed Instructions, How It Works, Idea Refine, Output, Phase 1: Understand & Expand (Divergent), Phase 2: Evaluate & Converge, Phase 3: Sharpen & Ship (+6 more)

### Community 33 - "Using Agent Skills"
Cohesion: 0.13
Nodes (14): 1. Surface Assumptions, 2. Manage Confusion Actively, 3. Push Back When Warranted, 4. Enforce Simplicity, 5. Maintain Scope Discipline, 6. Verify, Don't Assume, Core Operating Behaviors, Failure Modes to Avoid (+6 more)

### Community 34 - "Spec-Driven Development"
Cohesion: 0.14
Nodes (13): Common Rationalizations, Keeping the Spec Alive, Overview, Phase 0: Scope Check, Phase 1: Specify, Phase 2: Plan, Phase 3: Tasks, Phase 4: Implement (+5 more)

### Community 35 - "Source-Driven Development"
Cohesion: 0.15
Nodes (12): Common Rationalizations, Overview, Red Flags, Retrieval Safety: Treat Fetched Content as Data, Source-Driven Development, Step 1: Detect Stack and Versions, Step 2: Fetch Official Documentation, Step 3: Implement Following Documented Patterns (+4 more)

### Community 36 - "Refinement & Evaluation Criteria"
Cohesion: 0.17
Nodes (11): 1. User Value, 2. Feasibility, 3. Differentiation, Assumption Audit, Core Evaluation Dimensions, Decision Framework, Might Be True (Nice to Have), Must Be True (Dealbreakers) (+3 more)

### Community 37 - "openspec-explore/SKILL.md"
Cohesion: 0.17
Nodes (11): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do (+3 more)

### Community 38 - "Proposal: Browse File Action Icon"
Cohesion: 0.14
Nodes (13): Capabilities, Current behavior, Desired behavior, Expected user-visible behavior, Impact, Modified Capabilities, New Capabilities, Proposal: Browse File Action Icon (+5 more)

### Community 39 - "opsx-explore.md"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 40 - "Design: Project Brain Documentation"
Cohesion: 0.18
Nodes (10): 10. Extension Documentation Strategy, 8. Deployment Documentation Strategy, 9. Development Documentation Strategy, Approach, Coverage, Design: Project Brain Documentation, Environment Variables, Repository vs. Production Distinction (+2 more)

### Community 41 - "package.json"
Cohesion: 0.12
Nodes (15): dependencies, bcrypt, dotenv, lenis, description, main, name, private (+7 more)

### Community 42 - "ADDED Requirements"
Cohesion: 0.29
Nodes (7): ADDED Requirements, Requirement: Existing Browse controls preserved, Requirement: File action rendering, Scenario: Download control survives directory-action removal, Scenario: Download control with correct target, Scenario: Filtering and sorting operate on rows with targets, Scenario: Non-row Browse states unchanged

### Community 43 - "Ideation Frameworks Reference"
Cohesion: 0.22
Nodes (8): Analogous Inspiration, Constraint-Based Ideation, First Principles Thinking, How Might We (HMW), Ideation Frameworks Reference, Jobs to Be Done (JTBD), Pre-mortem, SCAMPER

### Community 44 - "Tasks: Browse File Action Icon"
Cohesion: 0.14
Nodes (13): Phase 1 — OpenSpec requirements and design reconciliation (foundation), Phase 2 — Browse primary icon target, Phase 3.5 — File Action logic consolidation: analysis & OpenSpec (COMPLETE), Phase 3.6 — File Action ownership consolidation (enforcement), Phase 3 — Directory File Action removal and layout verification, Phase 4 — Integration, regression, and accessibility verification, Phase 5 — Documentation alignment, Phase boundaries at a glance (+5 more)

### Community 45 - "4. Architecture Documentation Strategy"
Cohesion: 0.22
Nodes (9): 4. Architecture Documentation Strategy, Backend Module Structure, Environment Variables, Evidence Requirements, Extension Points, Frontend SPA Structure, Implementation Detail Verification, Request Routing (+1 more)

### Community 46 - "ADR-010: Vendored Lenis for smooth scrolling, gated by perf and reduced-motion"
Cohesion: 0.25
Nodes (10): perfBlocked(), start(), stop(), sync(), ADR-010: Vendored Lenis for smooth scrolling, gated by perf and reduced-motion, Consequences, Context, Date (+2 more)

### Community 47 - "14. Security, Performance, Compatibility, and Migration Considerations"
Cohesion: 0.29
Nodes (7): 14. Security, Performance, Compatibility, and Migration Considerations, Compatibility, Graphify Independence, Migration, Performance, Runtime Behavior, Security

### Community 48 - "15. Implementation Phase Mapping"
Cohesion: 0.33
Nodes (6): 15. Implementation Phase Mapping, Dependency Summary, Phase 1: Core Architecture (no dependencies), Phase 2: Data Flows & Security (depends on Phase 1), Phase 3: Operations & Development (depends on Phase 1), Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3)

### Community 49 - "1. Design Overview"
Cohesion: 0.33
Nodes (6): 1. Design Overview, Document Relationships, Documentation Architecture, Intended Audience, Purpose, Why This Structure

### Community 50 - "Tasks: Project Brain Documentation"
Cohesion: 0.33
Nodes (5): Phase 1: Core Architecture (no dependencies), Phase 2: Data Flows & Security (depends on Phase 1), Phase 3: Operations & Development (depends on Phase 1), Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3), Tasks: Project Brain Documentation

### Community 51 - "Requirement: Hover and focus visibility of actions"
Cohesion: 0.33
Nodes (6): Requirement: Hover and focus visibility of actions, Scenario: Browse icon is always visible, Scenario: Hidden state does not break keyboard access, Scenario: Persistently visible without hover capability, Scenario: Reveal on keyboard focus within the row, Scenario: Reveal on row hover (pointer devices)

### Community 52 - "12. Confirmed Facts, Assumptions, and Unresolved Details"
Cohesion: 0.40
Nodes (5): 12. Confirmed Facts, Assumptions, and Unresolved Details, Assumptions (not fully verified), Confirmed Facts (verified against source), Tool-Generated Inferences (NOT to be presented as facts), Unresolved Implementation Details

### Community 53 - "docs/README.md"
Cohesion: 0.40
Nodes (3): Node.js Crypto Module, Server Entry Point, Server Setup Instructions

### Community 54 - "Requirement: Action applicability derived from item data"
Cohesion: 0.40
Nodes (5): Requirement: Action applicability derived from item data, Scenario: Directory items expose no File Action, Scenario: File items expose Download only, Scenario: Icon target follows the same type-derived rule as the name link, Scenario: No parallel capability model

### Community 55 - "Requirement: Click isolation across icon, name, and File Action"
Cohesion: 0.33
Nodes (6): Requirement: Click isolation across icon, name, and File Action, Scenario: Activating the icon navigates once, Scenario: Activating the name navigates once, Scenario: Background of a target does not trigger navigation, Scenario: File Action performs only its own action, Scenario: Rows remain non-clickable

### Community 56 - "Requirement: Item target URLs built only via ResourceService primitives"
Cohesion: 0.50
Nodes (4): Requirement: Item target URLs built only via ResourceService primitives, Scenario: Browse href comes from the service, Scenario: Download href comes from the service, Scenario: No duplicated URL construction

### Community 57 - "Requirement: Dedicated File Actions module boundary"
Cohesion: 0.40
Nodes (5): Requirement: Dedicated File Actions module boundary, Scenario: Action logic lives outside browse.js, Scenario: BrowsePage integrates through a single call point, Scenario: Module is loaded and available before rendering, Scenario: Primary target stays BrowsePage-owned

### Community 58 - "Requirement: Keyboard operability with visible focus"
Cohesion: 0.40
Nodes (5): Requirement: Keyboard operability with visible focus, Scenario: Keyboard activation performs the target's behavior, Scenario: No redundant tab stop, Scenario: Tab reaches the icon target, Scenario: Visible focus indicator on every target

### Community 59 - "Requirement: Localized extensibility for future actions"
Cohesion: 0.40
Nodes (5): Requirement: Localized extensibility for future actions, Scenario: Adding a declarative future action does not touch BrowsePage, Scenario: BrowsePage responsibilities remain unchanged, Scenario: Directory-scoped actions remain re-addable, Scenario: Minimal module surface

### Community 60 - "11. Source Reference Strategy"
Cohesion: 0.50
Nodes (4): 11. Source Reference Strategy, Format, Reference Convention, Why Not Line Numbers

### Community 61 - "13. Maintenance and Consistency Strategy"
Cohesion: 0.50
Nodes (4): 13. Maintenance and Consistency Strategy, Maintenance Mapping, Review Checklist, Role of Phase 4 Final Review

### Community 62 - "2. Documentation Boundaries"
Cohesion: 0.50
Nodes (4): 2. Documentation Boundaries, Boundary Rules, Cross-Reference Convention, Source-of-Truth Rules

### Community 63 - "3. Repository-to-Documentation Mapping"
Cohesion: 0.50
Nodes (4): 3. Repository-to-Documentation Mapping, Confirmed Repository Structures, Frontend Script Loading Order (confirmed from `index.html`), Module Dependency Graph (confirmed from `require()` calls)

### Community 64 - "5. API Documentation Strategy"
Cohesion: 0.50
Nodes (4): 5. API Documentation Strategy, Coverage, Structure, Verification Requirement

### Community 65 - "Spec Delta: file-actions"
Cohesion: 0.50
Nodes (3): Confirmed product requirements governing this delta, Purpose, Spec Delta: file-actions

### Community 66 - "Requirement: Accessible names for item targets"
Cohesion: 0.33
Nodes (6): Requirement: Accessible names for item targets, Scenario: Decorative icons hidden from assistive technology, Scenario: File Action accessible name includes verb and item name, Scenario: Icon target has an accessible name, Scenario: Icon target is distinguishable from the name link, Scenario: Name link accessible name unchanged

### Community 67 - "Requirement: Targets available in both view modes"
Cohesion: 0.40
Nodes (5): Requirement: Targets available in both view modes, Scenario: Directory rows navigate in both modes, Scenario: Grid view placement, Scenario: List view placement, Scenario: View mode toggle preserves targets

### Community 68 - "ADDED Requirements"
Cohesion: 0.04
Nodes (48): ADDED Requirements, Capability: Navbar, Purpose, Requirement: Dropdown open mechanisms are preserved exactly, Requirement: Every navbar id and data attribute survives, Requirement: New navbar effects are tier-gated and direction-mirrored, Requirement: No new global theme or keyboard mechanism is introduced, Requirement: No new navigation destinations are fabricated (+40 more)

### Community 69 - "Requirement: Existing file-name link behavior preserved"
Cohesion: 0.33
Nodes (6): Requirement: Existing file-name link behavior preserved, Scenario: Directory name link unchanged, Scenario: Each target activates independently, Scenario: File name link unchanged, Scenario: Name link semantics preserved, Scenario: Name link target and icon target agree

### Community 70 - "Requirement: Router interaction compatibility"
Cohesion: 0.40
Nodes (5): Requirement: Router interaction compatibility, Scenario: Directory targets perform SPA navigation, Scenario: Download marker is required on every file target, Scenario: File icon target bypasses SPA navigation, Scenario: Router source is not modified

### Community 71 - "6. Data Flow Documentation Strategy"
Cohesion: 0.67
Nodes (3): 6. Data Flow Documentation Strategy, Representation, Verification

### Community 73 - "reset"
Cohesion: 0.24
Nodes (10): CavBanner, checkOverflow(), constructor(), emit(), internalStart(), internalStop(), o(), reset() (+2 more)

### Community 78 - "PerformanceMonitor"
Cohesion: 0.50
Nodes (3): PerformanceMonitor, off(), on()

### Community 79 - "verify-contrast.js"
Cohesion: 0.13
Nodes (16): Theme, blockVar(), DARK, fs, LIGHT, luminance(), MUTED, oklchToRgb() (+8 more)

### Community 99 - "admin-db.js"
Cohesion: 0.07
Nodes (42): adminDb, ALLOW, callerId(), decide(), defaultRank(), evaluate(), filterVisible(), FORBIDDEN (+34 more)

### Community 100 - "ADDED Requirements"
Cohesion: 0.05
Nodes (39): ADDED Requirements, Purpose, REMOVED Requirements, Requirement: Browse layout is bidirectional and mirrors under RTL, Requirement: Browse motion respects reduced-motion and performance tiers, Requirement: Browse styling uses only the project's own design tokens, Requirement: Browse supports keyboard operation, Requirement: Browser-side states are preserved (+31 more)

### Community 101 - "ADDED Requirements"
Cohesion: 0.05
Nodes (38): ADDED Requirements, Capability: Backdrop, Purpose, Requirement: Backdrop restyling does not disturb the hero overhang, Requirement: Every backdrop effect is gated by performance tier, Requirement: No animation is introduced without a motion guard, Requirement: No new element is added and `.aura-vignette` is left alone, Requirement: Obsidian Kinetic appearance is achieved with tokens (+30 more)

### Community 102 - "ADDED Requirements"
Cohesion: 0.05
Nodes (37): ADDED Requirements, Purpose, Requirement: Admin data is synchronized within a bounded interval, Requirement: Admin "Revoke sessions" ends portal sessions, Requirement: Disabled accounts cannot log in, Requirement: Identity checks fail closed, Requirement: Integration mode authenticates only against admin user records, Requirement: Passwords are verified in the admin hash format (+29 more)

### Community 103 - "Requirements"
Cohesion: 0.05
Nodes (37): browse-page Specification, Purpose, Requirement: Browse layout is bidirectional and mirrors under RTL, Requirement: Browse motion respects reduced-motion and performance tiers, Requirement: Browse styling uses only the project's own design tokens, Requirement: Browse supports keyboard operation, Requirement: Browser-side states are preserved, Requirement: Existing search behavior is preserved (+29 more)

### Community 104 - "ADDED Requirements"
Cohesion: 0.05
Nodes (36): ADDED Requirements, Purpose, Requirement: Checksum and digest are copyable and readable, Requirement: Checksum state never crosses between items, Requirement: Checksum verification runs only on explicit request, Requirement: Checksums are computed over real file content, Requirement: Several selected files are reachable through tabs, Requirement: The card is accessible and direction-aware (+28 more)

### Community 105 - "Requirements"
Cohesion: 0.05
Nodes (36): file-inspector Specification, Purpose, Requirement: Checksum and digest are copyable and readable, Requirement: Checksum state never crosses between items, Requirement: Checksum verification runs only on explicit request, Requirement: Checksums are computed over real file content, Requirement: Several selected files are reachable through tabs, Requirement: The card is accessible and direction-aware (+28 more)

### Community 106 - "Locked Decisions"
Cohesion: 0.06
Nodes (33): Affected files by phase, Core Surfaces (dark theme — primary), D10 — Home Page Pruning & Enterprise Footer, D1 — CSS Strategy, D2 — Sidebar, D3 — Mock Data, D4 — Theme ("Obsidian Kinetic"), D5 — Backdrop (+25 more)

### Community 107 - "ADDED Requirements"
Cohesion: 0.06
Nodes (31): ADDED Requirements, Capability: Typography, Purpose, Requirement: Font faces declare swap and explicit weights, Requirement: Fonts are self-hosted from the application origin, Requirement: Remote Google Fonts links are removed from `index.html`, Requirement: The five existing font tokens re-point to the self-hosted families, Requirement: Typography scale tokens are consumed by later phases (+23 more)

### Community 108 - "client"
Cohesion: 0.08
Nodes (20): client(), anon(), as(), assert, { createFixture, applyEnv, client }, fx, { test, before, after }, anon() (+12 more)

### Community 109 - "archive-service.check.js"
Cohesion: 0.07
Nodes (19): BrowseIcons, BulkDownload, archiveService, BIG, { execFileSync }, fs, has(), os (+11 more)

### Community 110 - "Secrets and Configuration"
Cohesion: 0.11
Nodes (28): Environment Variables, Environment Configuration, Environment Notes, Filesystem / Content Layout, Prerequisites, Production-Relevant Variables, Debugging / Troubleshooting, Environment Setup (+20 more)

### Community 111 - "auth-service.js"
Cohesion: 0.12
Nodes (24): RFC-7515, RFC-7617, Brute-Force Lockout, Password Handling, adminDb, base64urlDecode(), clearFailedAttempts(), crypto (+16 more)

### Community 112 - "ADDED Requirements"
Cohesion: 0.07
Nodes (26): ADDED Requirements, Purpose, Requirement: Bulk controls are disabled when nothing is selected, Requirement: Multi-file download transfers each selected file, Requirement: Rows carry an independent selection state, Requirement: Select-all affects only the currently visible rows, Requirement: Selection cannot escape the user's permitted paths, Requirement: Selection counts and totals reflect real data (+18 more)

### Community 113 - "ADDED Requirements"
Cohesion: 0.07
Nodes (26): ADDED Requirements, Capability: Design Tokens, Purpose, Requirement: Authoritative palette values, Requirement: Dark and light themes are structurally parallel, Requirement: Legacy token names survive as aliases, Requirement: New scales are declared and consumed, Requirement: No structural change to the token file (+18 more)

### Community 114 - "Requirements"
Cohesion: 0.07
Nodes (26): bulk-download Specification, Purpose, Requirement: Bulk controls are disabled when nothing is selected, Requirement: Multi-file download transfers each selected file, Requirement: Rows carry an independent selection state, Requirement: Select-all affects only the currently visible rows, Requirement: Selection cannot escape the user's permitted paths, Requirement: Selection counts and totals reflect real data (+18 more)

### Community 115 - "Design: Accessibility & UX Debt Clearance"
Cohesion: 0.08
Nodes (25): 10. Verification Approach, 1. Method, 2.1 Root cause, 2.2 Fix, 2.3 Hover dead zone (defect 3), 2.4 `role="tablist"` (J3), 2.5 Stale `aria-current`, 2.6 Touch targets (+17 more)

### Community 116 - "compareVersions"
Cohesion: 0.08
Nodes (22): compareVersions(), extractVersion(), Decisions, Design, Goals / Non-Goals, Migration Plan, Open Questions, Risks / Trade-offs (+14 more)

### Community 117 - "ADDED Requirements"
Cohesion: 0.08
Nodes (24): ADDED Requirements, Requirement: Commands are generated for a user-selected shell, Requirement: Copy actions confirm their result accessibly, Requirement: Loading, empty, error and locked states are distinct, Requirement: Rows are selectable as a whole and keyboard operable, Requirement: The active OS tab is addressable in the URL, Requirement: The page leads with the latest release of the active OS family, Scenario: A shared el8 link (+16 more)

### Community 118 - "pathRequiresAuth"
Cohesion: 0.10
Nodes (24): Authentication, Command-line clients (HTTP Basic), ADR-004: Auth gates only `RELEASE_PVM`, not the whole portal, Alternatives Considered, Consequences, Context, Date, Decision (+16 more)

### Community 119 - "admin-fixture.js"
Cohesion: 0.10
Nodes (18): adminDb, assert, { createFixture, applyEnv }, crypto, fixture(), fixtures, fs, os (+10 more)

### Community 120 - "lenis.min.js"
Cohesion: 0.13
Nodes (11): advance(), cleanUpClassName(), destroy(), isLocked(), isScrolling(), isStopped(), n(), r() (+3 more)

### Community 121 - "listLatestReleases"
Cohesion: 0.16
Nodes (22): limit(), `GET /api/releases`, `GET /api/search`, 5. Search/Categories/Releases Flows, Categories, Releases, Search, Decision (+14 more)

### Community 122 - "overflow"
Cohesion: 0.12
Nodes (21): overflow(), 11. Contract Preservation Map, Appendix A — Browse Page Redesign — Final Report Template (CANCELLED), Appendix A — Cancelled: Browse Page Redesign (D9/I22), Phase 1 — Design Tokens + Fonts, Phase 1 — Final Report Template, Phase 2 — Backdrop & Shell Base, Phase 2 — Final Report Template (+13 more)

### Community 123 - "ref_path"
Cohesion: 0.10
Nodes (14): fs, path, c, fs, path, trace, assert, ctx (+6 more)

### Community 124 - "ADDED Requirements"
Cohesion: 0.09
Nodes (21): ADDED Requirements, Purpose, Requirement: A selected release can be checksum-verified on demand, Requirement: Per-OS latest-release endpoints stream the highest-version artifact, Requirement: Selecting a release generates a deterministic CLI download command, Requirement: The latest-release endpoints honor the release auth gate, Requirement: The package list offers el8 and el9 tabs that switch release folders, Requirement: The Releases page renders as a clean root route reachable only through the navbar (+13 more)

### Community 125 - "streamDownload"
Cohesion: 0.17
Nodes (20): `GET /api/download/*`, `GET /`, `GET /index.html`, `GET /browse/*`, `GET /download/release`, 2. HTTP Request Routing, Application Headers, HTTP/Security Headers, nginx Headers, securityHeaders(), fs (+12 more)

### Community 126 - "hash-service.check.js"
Cohesion: 0.12
Nodes (15): `GET /api/hash/*`, crypto, fs, hashService, os, path, results, ROOT (+7 more)

### Community 127 - "Decisions"
Cohesion: 0.10
Nodes (19): Context, D10. RTL parity uses explicit `[dir="rtl"]` mirroring, D11. Motion is transform/opacity only, gated by the existing tier system, D12. Both endpoints inherit rate limiting and the auth gate for free, D1. Two new frontend IIFEs; `BrowsePage` owns lifecycle only, D2. The metadata card is a persistent container, not part of the row render, D3. Row selection uses delegated clicks that yield to existing targets, D4. Hash verification is a separate `GET`, streamed, with a size cap (+11 more)

### Community 128 - "Design: Enterprise UI Redesign ("Obsidian Kinetic")"
Cohesion: 0.10
Nodes (19): 12. Rejected Alternatives, 13.1 Validation evidence, 13. Deviations from the Authoring Prompt, 5.1 Floating pill, not full-bleed, 5.2 Structure mapping, 5.3 Preserved navbar contracts, 5. Navbar Mapping, 7. Browse Page Mapping - CANCELLED (D9/I22) (+11 more)

### Community 129 - "Requirement: Content routes accept HTTP Basic credentials"
Cohesion: 0.10
Nodes (19): ADDED Requirements, Purpose, Requirement: Content routes accept HTTP Basic credentials, Requirement: Credentials are accepted only over a secure transport, Requirement: Non-browser clients are challenged; browsers are not, Requirement: Passwords never appear in commands, history or logs, Scenario: Anonymous visitors keep the plain command, Scenario: Basic auth does not create a session (+11 more)

### Community 130 - "Requirement: Every navbar control is operable by keyboard"
Cohesion: 0.11
Nodes (18): ADDED Requirements, Capability: Navbar, Purpose, Requirement: Every navbar control is operable by keyboard, Requirement: Primary navbar controls meet the touch-target recommendation, Requirement: The current-page indicator is truthful, Requirement: The navigation group declares only semantics it implements, Scenario: `aria-expanded` reflects the real state (+10 more)

### Community 131 - "archive-service.js"
Cohesion: 0.16
Nodes (14): ADR-0001, `GET /api/download-zip`, archiveError(), createArchive(), { createDeflateRaw, crc32 }, deflateEntry(), dosDateTime(), entryNameFor() (+6 more)

### Community 132 - "Design: Browse Files Item Targets and File Actions"
Cohesion: 0.11
Nodes (17): 0. What changed from the previous revision of this design, Architecture Sizing, Click flows, Compatibility considerations, Context, CSS / layout ownership (revised), D11. Complete File Action ownership is confirmed as already satisfied; no helper movement is required, D11a. The action track is pinned so column alignment is content-independent (+9 more)

### Community 133 - "access-policy.test.js"
Cohesion: 0.12
Nodes (16): accessPolicy, adminDb, ANON, assert, authService, { createFixture, applyEnv, client }, decide(), filesService (+8 more)

### Community 134 - "Architecture"
Cohesion: 0.12
Nodes (17): Architecture, Backend Dependency Relationships, Backend Module Structure, Browse Row Targets and File Actions, Dedicated File Actions, Extension Points, Frontend Cross-Cutting Conventions, Frontend Script Loading Order (+9 more)

### Community 135 - "ADDED Requirements"
Cohesion: 0.12
Nodes (15): ADDED Requirements, Capability: Contrast, Purpose, Requirement: Contrast claims are mechanically verifiable, Requirement: No user-visible text renders below the AA contrast floor, Requirement: The corrected token stays defined, Requirement: The correction reaches the frozen Browse stylesheet without editing it, Scenario: A future removal is deferred, not forgotten (+7 more)

### Community 136 - "ADDED Requirements"
Cohesion: 0.12
Nodes (15): ADDED Requirements, Capability: Mobile Navigation, Purpose, Requirement: Primary navigation is reachable below 900px, Requirement: Revealed links remain valid navigation targets, Requirement: The control does not inherit the navbar's known defects, Requirement: The disclosure control is operable and truthfully described, Scenario: Activation works without a pointing device (+7 more)

### Community 137 - "ADDED Requirements"
Cohesion: 0.12
Nodes (15): ADDED Requirements, Capability: Search Accessibility, Purpose, Requirement: The exception to the Hero freeze stays narrow, Requirement: The highlighted result is announced, Requirement: The search field is exposed as a combobox, Scenario: Blurring without a query collapses the panel, Scenario: **HARD GATE** — Only attributes are added inside the Hero (+7 more)

### Community 138 - "Requirement: In integration mode, release protection comes from the admin folder lock"
Cohesion: 0.12
Nodes (15): ADDED Requirements, Purpose, Requirement: In integration mode, release protection comes from the admin folder lock, Requirement: Legacy mode keeps the `.env` release gate, Requirement: The Release page opens the login modal whenever login is required, Scenario: Administrator locks the release folder, Scenario: Administrator unlocks the release folder, Scenario: Direct visit to the Release page (+7 more)

### Community 139 - "cli-auth.test.js"
Cohesion: 0.14
Nodes (9): assert, { createFixture, client }, fx, { test, after }, assert, { createFixture, client }, fx, http (+1 more)

### Community 140 - "auth.test.js"
Cohesion: 0.14
Nodes (12): adminDb, afterSync(), assert, authService, { createFixture, applyEnv, client, adminHashPassword }, crypto, fs, fx (+4 more)

### Community 141 - "endpoints.test.js"
Cohesion: 0.14
Nodes (13): adminDb, afterSync(), anon(), as(), assert, { createFixture, applyEnv, client }, crypto, { execFileSync } (+5 more)

### Community 142 - "signJwt"
Cohesion: 0.18
Nodes (14): ADR-003: Hand-rolled HS256 JWT instead of a library, Alternatives Considered, Consequences, Context, Date, Decision, `jose`, `jsonwebtoken` (+6 more)

### Community 143 - "ADR-012: In-memory rate limiting and brute-force lockout"
Cohesion: 0.14
Nodes (14): ADR-012: In-memory rate limiting and brute-force lockout, Alternatives Considered, Brute-force lockout, Consequences, Context, Database-backed lockout (persist attempts), Date, Decision (+6 more)

### Community 144 - "ADDED Requirements"
Cohesion: 0.14
Nodes (13): ADDED Requirements, Capability: Footer Localisation, Purpose, Requirement: Existing dictionary entries are untouched, Requirement: Footer links expose a localised accessible name, Requirement: The hook is inert on elements that cannot use it, Scenario: A language switch updates the names, Scenario: Accessible names follow the language (+5 more)

### Community 145 - "Integration: CloudAvid File Portal ↔ Dimension Files Manager"
Cohesion: 0.15
Nodes (12): 1. Configuration, 2. What the portal reads, 3.1 One policy, one caller, 3.2 Folders and combination, 3.3 Owner decisions (where the admin spec was silent or contradictory), 3. Access rules, 4.1 In the portal UI, 4. What each endpoint does (+4 more)

### Community 146 - "Style Guide"
Cohesion: 0.15
Nodes (13): 1. The CSS Layer Model, 2. Token Contract, 3. Typography, 4. Theming, 5. Performance Modes, 6. RTL Support, 7. Frozen Regions, 8. Accessibility Conventions (+5 more)

### Community 147 - "Change: Accessibility & UX Debt Clearance"
Cohesion: 0.15
Nodes (12): Change: Accessibility & UX Debt Clearance, D1 - Capability boundaries and build order, D2 - Contrast is fixed at the token, not at the call sites, D3 - Mobile navigation is a disclosure, not a drawer, D4 - Search semantics take an explicit Hero-freeze exception, Impact, Locked Decisions, Locked Invariants (+4 more)

### Community 148 - "ADDED Requirements"
Cohesion: 0.15
Nodes (12): ADDED Requirements, Capability: Document Outline, Purpose, Requirement: Heading level changes preserve appearance, Requirement: The corrected outline does not alter frozen source, Requirement: The heading outline contains no skipped levels, Scenario: Exactly one top-level heading per page, Scenario: **HARD GATE** — Browse markup is untouched (+4 more)

### Community 149 - "Tasks: Accessibility & UX Debt Clearance"
Cohesion: 0.15
Nodes (12): Build Order (D1, locked), Final Verification (all phases), Phase 10 — Self-Host Third-Party Assets, Phase 1 — Navbar Keyboard, Semantics & Targets, Phase 2 — Contrast Floor, Phase 3 — Search Combobox Semantics, Phase 4 — Document Outline, Phase 5 — Footer Link Localisation (+4 more)

### Community 150 - "browse/DESIGN.md"
Cohesion: 0.15
Nodes (12): Brand & Style, Buttons & Key Triggers, Cards & Container Panels, Colors, Components, Elevation & Depth, High-Density Data Lists & Tables, Inputs & Command Palette (+4 more)

### Community 151 - "release/DESIGN.md"
Cohesion: 0.15
Nodes (12): Brand & Style, Buttons & Key Triggers, Cards & Container Panels, Colors, Components, Elevation & Depth, High-Density Data Lists & Tables, Inputs & Command Palette (+4 more)

### Community 152 - "ADR-009: Runtime performance tiers gate visual effects"
Cohesion: 0.17
Nodes (12): ADR-009: Runtime performance tiers gate visual effects, Alternatives Considered, Build-time / UA-string branching, Consequences, Context, Date, Decision, `@media (prefers-reduced-transparency)`, hover, and pointer queries (+4 more)

### Community 153 - "ADR-011: Self-hosted WOFF2 fonts to satisfy CSP `font-src 'self'`"
Cohesion: 0.17
Nodes (12): ADR-011: Self-hosted WOFF2 fonts to satisfy CSP `font-src 'self'`, Alternatives Considered, Consequences, Context, Date, Decision, Google Fonts / Bunny Fonts / Fontsource CDN, Local fonts installed on the server, served via `font-src 'self'` (+4 more)

### Community 154 - "ADDED Requirements"
Cohesion: 0.17
Nodes (11): ADDED Requirements, Capability: Content Strategy, Purpose, Requirement: Removed copy does not leave dead dictionary entries, Requirement: The content decision is reversible and recorded, Requirement: The footer links are not redundant with the navbar, Scenario: **HARD GATE** — Dictionaries stay intact and free of dead entries, Scenario: **HARD GATE** — No duplicated destinations (+3 more)

### Community 155 - "legacy-auth.test.js"
Cohesion: 0.17
Nodes (11): { applyEnv, client }, assert, authService, dir, fs, http, os, path (+3 more)

### Community 156 - "9. Cross-Cutting Flows"
Cohesion: 0.18
Nodes (10): 9. Cross-Cutting Flows, Idle Timer (client-side), Logging, Path Containment (per filesystem request), Performance Tier Adaptation, Rate Limiting, Theme and Direction Initialization, Rate Limiting (+2 more)

### Community 157 - "ADR-001: No web framework — plain `node:http`"
Cohesion: 0.18
Nodes (11): ADR-001: No web framework — plain `node:http`, Alternatives Considered, Build a mini-framework in-repo, Consequences, Context, Date, Decision, Express (+3 more)

### Community 158 - "ADR-006: Vanilla JS SPA with no build step"
Cohesion: 0.18
Nodes (11): ADR-006: Vanilla JS SPA with no build step, Alpine.js / htmx / petite-vue (no build, CDN script), Alternatives Considered, Consequences, Context, Date, Decision, ES modules (`<script type="module">`) (+3 more)

### Community 159 - "ADR-008: CSS custom properties as the design-token layer, no preprocessor"
Cohesion: 0.18
Nodes (11): ADR-008: CSS custom properties as the design-token layer, no preprocessor, Alternatives Considered, Consequences, Context, Date, Decision, JS-injected theme tokens, PostCSS with custom-properties plugin (+3 more)

### Community 160 - "Decisions"
Cohesion: 0.18
Nodes (11): D10. Header row and skeleton rows are unaffected, D1. The primary Browse icon target lives in BrowsePage, not in FileActions, D2. The icon anchor is nested **inside** the existing `.f-icon` cell, not substituted for it, D3. Two sibling anchors, not one merged anchor, D4. The icon target's accessible name is an action label, distinct from the name link's, D5. `FileActions.render()` keeps returning the container for every item; only its *controls* change, D6. Removal of the `open` action definition, not just its suppression, D7. No `stopPropagation()` / `preventDefault()` in the Browse row (+3 more)

### Community 161 - "Decisions"
Cohesion: 0.18
Nodes (10): D1. Agreed semantics (owner decisions, 2026-10-14), D2. Path mapping: `/` + relative path, D3. One snapshot of the admin data, refreshed by TTL, D4. Decision function, D7. Frontend, Decisions, Design, Goals / Non-Goals (+2 more)

### Community 162 - "Requirement: Hero Section Freeze"
Cohesion: 0.18
Nodes (11): Requirement: Hero Section Freeze, Scenario: Hero autocomplete still binds, Scenario: Hero DOM is byte-identical after redesign [HARD GATE], Scenario: Hero token drift is compensated, Scenario: No CSS rule targets a frozen selector, Scenario: The Hero-emitting code path is untouched, Scenario: The `--hero-grad` token is not repointed, Scenario: The Hero's keyboard shortcut is unchanged (+3 more)

### Community 163 - "API Reference"
Cohesion: 0.20
Nodes (10): API Reference, Blocked Paths, Error Response Format, `GET /404`, `GET /404.html`, `GET /api/health`, `GET /__health`, `GET /release9/latest`, `GET /release8/latest`, `POST /api/auth/login` (+2 more)

### Community 164 - "ADR-005: Three-layer path containment for the filesystem boundary"
Cohesion: 0.20
Nodes (10): ADR-005: Three-layer path containment for the filesystem boundary, Alternatives Considered, Canonicalize then check (resolve + realpath, one layer), chroot / container / mount namespace isolation, Consequences, Context, Date, `sendfile`/stream without full resolution (+2 more)

### Community 165 - "ADR-007: nginx serves static assets and proxies `/api/`"
Cohesion: 0.20
Nodes (10): ADR-007: nginx serves static assets and proxies `/api/`, Alternatives Considered, CDN in front of nginx, Consequences, Context, Date, Dev server (Vite) with HMR, nginx for TLS only, proxy everything to Node (+2 more)

### Community 166 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Capability: Overlays and States, Purpose, Requirement: No banned content appears in overlays or states, Requirement: The three overlay hidden-state mechanisms are not unified, Scenario: Each overlay keeps its own hidden-state combination, Scenario: No banned claim is present, Scenario: No fabricated content appears in states (+1 more)

### Community 167 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Capability: Performance, RTL, and Responsive Parity, Purpose, Requirement: Every new animation has a motion guard, Requirement: No banned content ships, Scenario: Every new animation is guarded, Scenario: **HARD GATE** — No banned string appears in shipped files, Scenario: No fabricated card data appears in the rendered output (+1 more)

### Community 168 - "Requirement: Breakpoint behaviours that remove functionality are preserved"
Cohesion: 0.20
Nodes (10): Requirement: Breakpoint behaviours that remove functionality are preserved, Scenario: **HARD GATE** — Mobile navigation removal is preserved, Scenario: Hero positioning declarations are byte-identical, Scenario: Hero responsive breakpoints are preserved [HARD GATE], Scenario: No alternative mobile navigation exists, Scenario: The grid reflow is preserved, Scenario: The listing column collapse is preserved, Scenario: The mobile view toggle suppression is preserved (+2 more)

### Community 169 - "Decisions"
Cohesion: 0.20
Nodes (9): D1 — Bugs 1 and 3 are fixed where they originate, D2 — Release protection uses the existing admin folder lock, not a new setting, D3 — "Logged in" for a CLI means valid Basic credentials on the request, D4 — Challenge only non-browser clients, D5 — Commands shown to users, Decisions, Design, Limitations (to accept before implementation) (+1 more)

### Community 170 - "Data Flows"
Cohesion: 0.22
Nodes (9): 1. Application Startup, 4. Download Flow, 4a. Bulk Selection and Download Flows, 7. Error Flow, 8. Frontend Data Flow, Checksum verification, Data Flows, Multi-file download (+1 more)

### Community 171 - "ADR-002: The filesystem is the datastore"
Cohesion: 0.22
Nodes (9): ADR-002: The filesystem is the datastore, Alternatives Considered, Consequences, Context, Date, Elasticsearch / Meilisearch, In-memory cache with mtime invalidation, SQLite index (+1 more)

### Community 172 - "Extending Frontend Behavior"
Cohesion: 0.22
Nodes (9): Adding a Dedicated Browse File Action, Adding a Frontend Component, Adding a Stylesheet or Design Token, API Client, Browse Row Targets: Two Separate Categories, Existing Modules, Extending Frontend Behavior, Module Loading (+1 more)

### Community 173 - "Tasks"
Cohesion: 0.22
Nodes (8): 1. Backend: latest-release endpoints and auth gate, 2. Routing: clean root entry for the page, 3. Releases page UI (template → production logic), 4. Navbar integration, 5. Documentation, 6. Integration verification, Tasks, Workflow follow-up

### Community 174 - "Proposal: Browse Page Inspector Redesign"
Cohesion: 0.22
Nodes (8): Capabilities, Explicitly out of this change, Impact, Modified Capabilities, New Capabilities, Proposal: Browse Page Inspector Redesign, What Changes, Why

### Community 175 - "Requirement: Locked rows show a lock and open sign-in instead of downloading"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: A direct download that needs sign-in opens the sign-in modal, Requirement: Locked rows show a lock and open sign-in instead of downloading, Scenario: Anonymous user activates a locked file, Scenario: Session expired before the download, Scenario: Sign-in succeeds, Scenario: Sign-in succeeds but access is still not allowed, Spec Delta

### Community 176 - "Alternatives Considered"
Cohesion: 0.25
Nodes (8): i(), scroll(), Alternatives Considered, Bundle Lenis via npm (it *is* in `package.json`), CSS-only scroll-driven animations (`animation-timeline: view()` / `scroll()`), CSS `scroll-behavior: smooth`, Native inertia on macOS / trackpad scrolling, No smooth scroll; ship native

### Community 177 - "loadUsersSync"
Cohesion: 0.36
Nodes (8): `data/users.json` Schema, 8. Pre-existing observations (not part of this change), Resolved Items, findUser(), loadUsers(), loadUsersSync(), saveUsers(), usersFileKey()

### Community 178 - "Verification After an Extension"
Cohesion: 0.25
Nodes (8): API/Manual Checks, Application Startup, Authentication Checks (when `AUTH_ENABLED=true`), Documentation Consistency, Filesystem/Content Checks, Frontend/Manual Checks, Production Checks, Verification After an Extension

### Community 179 - "Project Brain Documentation"
Cohesion: 0.25
Nodes (8): Architecture Decision Records, Intended Audience, Known Issues, Maintenance, Project Brain Documentation, Reference Documents, Source of Truth, Start Here

### Community 180 - "Process"
Cohesion: 0.25
Nodes (8): 1. Define "working" before instrumenting, 2. Pick the right signal for each question, 4. Metrics, 5. Distributed tracing, 6. Alerting, 7. Verify the telemetry itself, Process, Writing Runbooks

### Community 181 - "Requirement: Complete File Action ownership"
Cohesion: 0.25
Nodes (8): Requirement: Complete File Action ownership, Scenario: Action applicability is not duplicated, Scenario: Action-specific icons are produced inside the module, Scenario: Action-specific labels are produced inside the module, Scenario: Action-specific URLs are produced inside the module, Scenario: No action markup originates outside the module, Scenario: Primary icon label remains BrowsePage-owned, Scenario: Shared general-purpose helpers are not relocated for ownership reasons

### Community 182 - "Requirement: Primary Browse icon is an additional navigation target"
Cohesion: 0.25
Nodes (8): Requirement: Primary Browse icon is an additional navigation target, Scenario: Icon is interactive, not decorative, Scenario: Icon on a directory item navigates, Scenario: Icon on a file item downloads, Scenario: Icon resolves to the same target as the name link, Scenario: Name link remains an independent target, Scenario: No duplicate navigation from the two targets, Scenario: Targets are not nested inside one another

### Community 183 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 184 - "Tasks"
Cohesion: 0.25
Nodes (7): 1. Test harness, 2. Admin data snapshot (`lib/admin-db.js`), 3. Decision function (`lib/access-policy.js`), 6. Frontend, 7. Integration check, Tasks, Workflow follow-up

### Community 185 - "Requirement: Language switch rebuilds all dynamic text"
Cohesion: 0.25
Nodes (8): Requirement: Language switch rebuilds all dynamic text, Scenario: Browser history is not polluted by a language change, Scenario: **HARD GATE** — Browse page text is rebuilt, Scenario: **HARD GATE** — Language switch rebuilds all dynamic text, Scenario: The active option in the menu is marked, Scenario: The current-language label updates, Scenario: The direction attribute follows the language, Scenario: The selection persists

### Community 186 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Non-goals, Proposal, What Changes

### Community 187 - "Proposed Documentation Files"
Cohesion: 0.25
Nodes (8): API.md, ARCHITECTURE.md, DATAFLOWS.md, DEPLOYMENT.md, DEVELOPMENT.md, EXTENDING.md, Proposed Documentation Files, SECURITY.md

### Community 188 - "Proposal"
Cohesion: 0.25
Nodes (7): Capabilities, Impact, Modified Capabilities, New Capabilities, Proposal, What Changes, Why

### Community 189 - "Verification Requirement"
Cohesion: 0.38
Nodes (7): Session/Cookie Security, buildSessionCookie(), makeSessionCookieHeader(), 7. Security Documentation Strategy, Source References, Topics to Cover, Verification Requirement

### Community 190 - "Observability and Instrumentation"
Cohesion: 0.29
Nodes (6): Common Rationalizations, Observability and Instrumentation, Overview, Red Flags, Verification, When to Use

### Community 191 - "Tasks"
Cohesion: 0.29
Nodes (6): 2. Page layout and preserved logic, 3. Selection and bulk actions, 5. Metadata card and hash verification, 6. Bidirectional parity, motion, i18n, and documentation, Tasks, Workflow follow-up

### Community 192 - "ADDED Requirements"
Cohesion: 0.29
Nodes (7): ADDED Requirements, Requirement: Each policy yields allow, locked or hidden for a caller, Requirement: Hashes are computed only for allowed files, Requirement: Legacy mode is unchanged, Scenario: Decision table, Scenario: Hash of a hidden file, Scenario: Integration not configured

### Community 193 - "2. Token Architecture"
Cohesion: 0.29
Nodes (7): 2.1 Post-redesign `tokens.css` structure, 2.2 Authoritative tokens (D4, verbatim), 2.3 New scales, 2.4 Legacy-token alias bridge, 2.5 Deprecation, 2.6 Light theme, 2. Token Architecture

### Community 194 - "6. Home Page Mapping"
Cohesion: 0.29
Nodes (7): 6.1 Section-by-section, 6.2 Id and hook preservation, 6.3 `.input-wrap` ancestor — load-bearing, 6.4 Auth modal call sites, 6.5 Markup edit whitelist, 6.6 Content discipline, 6. Home Page Mapping

### Community 195 - "ADDED Requirements"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Capability: Home Page, Purpose, Requirement: The results panel keeps its internal scroll container, Scenario: Results scroll inside the panel, Scenario: The maximum height is unchanged

### Community 196 - "Requirement: The Enterprise Footer is real, bilingual shell content"
Cohesion: 0.29
Nodes (7): Requirement: The Enterprise Footer is real, bilingual shell content, Scenario: Both languages render, Scenario: Every footer string is translatable, Scenario: The footer collapses responsively, Scenario: The footer introduces no overflow, Scenario: The footer renders in the application shell, Scenario: The placeholder is gone

### Community 197 - "ADDED Requirements"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Capability: i18n Keys, Purpose, Requirement: No banned content appears in any localised string, Scenario: No banned claim is present in either dictionary, Scenario: No fabricated count or date is present in either dictionary

### Community 198 - "Requirement: Loading, empty, and error states keep their shape and behaviour"
Cohesion: 0.29
Nodes (7): Requirement: Loading, empty, and error states keep their shape and behaviour, Scenario: Empty states clear the row container, Scenario: Skeleton rows keep their count and hooks, Scenario: Skeletons are replaced, not appended, Scenario: The busy attribute is preserved on skeletons, Scenario: The empty state can be dismissed, Scenario: The error variant remains reachable

### Community 199 - "Requirement: The autocomplete dropdown keeps its mechanism and internal scroll"
Cohesion: 0.29
Nodes (7): Requirement: The autocomplete dropdown keeps its mechanism and internal scroll, Scenario: A closed dropdown does not intercept pointer input, Scenario: A file suggestion downloads and a directory suggestion navigates, Scenario: An outside click closes the dropdown, Scenario: Keyboard navigation tracks the active suggestion, Scenario: The dropdown opens and closes by its own class, Scenario: The item list scrolls internally

### Community 200 - "Requirement: Login from a locked folder shows the folder without a reload"
Cohesion: 0.29
Nodes (6): ADDED Requirements, Requirement: Login from a locked folder shows the folder without a reload, Scenario: Failed login keeps the sign-in state, Scenario: Idle logout re-renders correctly, Scenario: Sign in from a locked folder, Spec Delta

### Community 201 - "Tasks"
Cohesion: 0.29
Nodes (6): 1. State and command generation (`assets/js/releases.js`), 2. Markup and interaction, 3. Visual rebuild (`assets/css/release.css`), 4. Integration verification, Tasks, Workflow follow-up

### Community 202 - "makeClearCookieHeader"
Cohesion: 0.40
Nodes (6): `POST /api/auth/logout`, 6. Authentication/Session Flow, Login, Logout, buildClearCookie(), makeClearCookieHeader()

### Community 203 - "Production Process"
Cohesion: 0.33
Nodes (6): Lifecycle, Process Supervision, Production Process, Startup, Startup, start()

### Community 204 - "Development Workflow"
Cohesion: 0.33
Nodes (6): Backend Changes, Change Workflow (OpenSpec), Development Workflow, Frontend Changes, Manual Verification, No Build Step

### Community 205 - "Adding or Changing an API Endpoint"
Cohesion: 0.33
Nodes (6): Adding or Changing an API Endpoint, Classifying the Auth Requirement, How Responses/Errors Are Produced, Pattern, Where Domain/File Operations Belong, Where Routing Is Handled

### Community 206 - "Core Principles"
Cohesion: 0.33
Nodes (6): 1. Commit Early, Commit Often, 2. Atomic Commits, 3. Descriptive Messages, 4. Keep Concerns Separate, 5. Size Your Changes, Core Principles

### Community 207 - "main"
Cohesion: 0.33
Nodes (6): Branch Naming, Branching Strategy, Feature Branches, Trunk-Based Development (Recommended), main(), seed()

### Community 208 - "Requirement: Row layout compatibility with the existing column structure"
Cohesion: 0.33
Nodes (6): Requirement: Row layout compatibility with the existing column structure, Scenario: Existing column rules still address the correct columns, Scenario: Header and rows stay aligned, Scenario: Icon cell survives becoming interactive, Scenario: No layout shift from revealing the icon target, Scenario: No wrap or overflow in narrow viewports

### Community 209 - "Requirement: Locked rows are excluded from bulk actions until sign-in"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: Locked rows are excluded from bulk actions until sign-in, Scenario: A selected file becomes unpublished, Scenario: Select-all with a locked row, Spec Delta

### Community 210 - "Requirement: A locked item reveals no metadata before sign-in"
Cohesion: 0.33
Nodes (5): ADDED Requirements, Requirement: A locked item reveals no metadata before sign-in, Scenario: Anonymous user activates a locked file, Scenario: Checksum request for a file that became locked, Spec Delta

### Community 211 - "3. Font Loading Strategy"
Cohesion: 0.33
Nodes (6): 3.1 Files added, 3.2 `@font-face` declarations, 3.3 Token re-pointing, 3.4 Google Fonts link removal, 3.5 RTL, 3. Font Loading Strategy

### Community 212 - "Enterprise Footer Mapping"
Cohesion: 0.33
Nodes (6): Enterprise Footer Mapping, Location: shell, not route, Obsidian Kinetic styling, Responsive behaviour, Strictly bilingual, Structure: four columns plus a copyright bar

### Community 213 - "Requirement: The bottom grid, releases UI, and status bar are removed"
Cohesion: 0.33
Nodes (6): Requirement: The bottom grid, releases UI, and status bar are removed, Scenario: `showLoginModal` survives the pruning, Scenario: The deleted CSS is absent, Scenario: The deleted DOM elements are absent, Scenario: The deleted JavaScript is absent, Scenario: The pruned Home page renders without error

### Community 214 - "Requirement: The category filter and sort controls keep their contract"
Cohesion: 0.33
Nodes (6): Requirement: The category filter and sort controls keep their contract, Scenario: An outside click closes all filter menus, Scenario: Selecting an option closes the menu, Scenario: Selecting an option updates the label and the grid, Scenario: The category menu is rebuilt after load, Scenario: The sort option vocabulary is unchanged

### Community 215 - "Requirement: The full search flow is preserved end to end"
Cohesion: 0.33
Nodes (6): Requirement: The full search flow is preserved end to end, Scenario: Escape clears the results, Scenario: Result rows keep their shape, Scenario: Submitting runs the search and reveals the panel, Scenario: The panel scrolls into view, Scenario: The stop control cancels

### Community 216 - "Requirement: The login modal stays callable after the pruning"
Cohesion: 0.33
Nodes (6): Requirement: The login modal stays callable after the pruning, Scenario: No new global is introduced, Scenario: `showLoginModal` is still defined and exported, Scenario: The Browse locked state opens the modal, Scenario: The cross-module alias resolves, Scenario: The releases locked state no longer exists as a trigger

### Community 217 - "Requirement: Localised formatting follows the selected language"
Cohesion: 0.33
Nodes (6): Requirement: Localised formatting follows the selected language, Scenario: A zero-byte directory shows the placeholder, Scenario: Action verbs remain localised and distinguishable, Scenario: Dates follow the selected locale, Scenario: Sizes follow the selected locale, Scenario: Zero-byte items render a localised zero

### Community 218 - "Requirement: The three translation attributes keep their distinct behaviours"
Cohesion: 0.33
Nodes (6): Requirement: The three translation attributes keep their distinct behaviours, Scenario: A missing dictionary value leaves the element alone, Scenario: An element with no attribute is untouched, Scenario: Inner-markup translation still replaces markup, Scenario: Placeholder translation still replaces the placeholder, Scenario: Text-content translation still replaces text

### Community 219 - "Requirement: Translation is reapplied after every route render"
Cohesion: 0.33
Nodes (6): Requirement: Translation is reapplied after every route render, Scenario: A route change re-applies the language, Scenario: An in-page not-found message is localised, Scenario: The authentication-required message is localised, Scenario: The document title is localised per route, Scenario: The modal's own strings are localised

### Community 220 - "Requirement: Filter and performance menus open via a class on their wrapper"
Cohesion: 0.33
Nodes (6): Requirement: Filter and performance menus open via a class on their wrapper, Scenario: An outside click closes open filter menus, Scenario: Closed menus are never removed from layout, Scenario: **HARD GATE** — The open class is applied to the wrapper, Scenario: Selecting an option closes the menu, Scenario: The performance menu closes on outside click

### Community 221 - "Requirement: The performance toast and debug panel keep their behaviour and layering"
Cohesion: 0.33
Nodes (6): Requirement: The performance toast and debug panel keep their behaviour and layering, Scenario: Stacking order is unchanged, Scenario: The debug panel clears the navbar, Scenario: The debug panel mirrors for direction, Scenario: The toast mirrors for direction, Scenario: The toast shows and dismisses

### Community 222 - "Requirement: Every new direction-sensitive rule is mirrored or authored logically"
Cohesion: 0.33
Nodes (6): Requirement: Every new direction-sensitive rule is mirrored or authored logically, Scenario: Existing mirrored rules still apply, Scenario: **HARD GATE** — Every direction-sensitive rule has a mirror, Scenario: **HARD GATE** — RTL mirrors breadcrumb chevron, Scenario: Logical properties are preferred for new rules, Scenario: Physical side properties are inventoried

### Community 223 - "Requirement: Low and potato tiers actually remove the effects"
Cohesion: 0.33
Nodes (6): Requirement: Low and potato tiers actually remove the effects, Scenario: High and medium tiers keep the full treatment, Scenario: Low tier suppresses animation, Scenario: Perf tier `low` disables backdrop blur, Scenario: Perf tier `potato` disables backdrop blur, Scenario: Potato tier suppresses animation

### Community 224 - "Requirement: The protected files are untouched"
Cohesion: 0.33
Nodes (6): Requirement: The protected files are untouched, Scenario: **HARD GATE** — The protected client modules are unchanged, Scenario: **HARD GATE** — The server library is byte-identical, Scenario: The dead page is byte-identical, Scenario: The reference file is byte-identical, Scenario: The server contract and security headers are unchanged

### Community 225 - "Requirement: The tier is selected before paint and honours reduced motion"
Cohesion: 0.33
Nodes (6): Requirement: The tier is selected before paint and honours reduced motion, Scenario: Invalid cached values are discarded, Scenario: Reduced motion forces the low tier, Scenario: Smooth scrolling is disabled at the low tiers, Scenario: The cached tier's validity window is unchanged, Scenario: The tier is applied before first paint

### Community 226 - "Tasks"
Cohesion: 0.33
Nodes (5): 1. Frontend bugs, 2. Release access from the Admin UI, 3. CLI authentication, 4. Close-out, Tasks

### Community 227 - "scrollTo"
Cohesion: 0.40
Nodes (5): preventNextNativeScrollEvent(), scrollTo(), setScroll(), u(), Phase 8 — Cross-Browser Mobile Responsiveness

### Community 228 - "Architecture Decision Records"
Cohesion: 0.40
Nodes (5): Architecture Decision Records, Format, Index, Lifecycle, Relationship to `docs/`

### Community 229 - "Requirement: Directory items expose no dedicated File Action"
Cohesion: 0.40
Nodes (5): Requirement: Directory items expose no dedicated File Action, Scenario: Directory icon is the equivalent alternative, Scenario: Directory name link still navigates, Scenario: Directory row has no File Action control, Scenario: File rows are unaffected

### Community 230 - "1. Architecture Direction"
Cohesion: 0.40
Nodes (5): 1.1 Zero-build, token-first, 1.2 Two-layer separation, 1.3 Contract-preserving edits, 1.4 Phase independence, 1. Architecture Direction

### Community 231 - "4. Backdrop Strategy"
Cohesion: 0.40
Nodes (5): 4.1 Approach, 4.2 Stacking preservation, 4.3 Performance gating, 4.4 Rejected, 4. Backdrop Strategy

### Community 232 - "Requirement: Home markup edits stay within the whitelist"
Cohesion: 0.40
Nodes (5): Requirement: Home markup edits stay within the whitelist, Scenario: Each edit falls inside the whitelist, Scenario: No text content read by JavaScript is altered, Scenario: No URL construction is added, Scenario: The XSS surface is not widened

### Community 233 - "Requirement: Resource cards are driven exclusively by the data layer"
Cohesion: 0.40
Nodes (5): Requirement: Resource cards are driven exclusively by the data layer, Scenario: Card content matches the API response, Scenario: Icons come from the existing icon resolver, Scenario: No banned claim appears, Scenario: Reference card data is absent

### Community 234 - "Requirement: The search field keeps its autocomplete host"
Cohesion: 0.40
Nodes (5): Requirement: The search field keeps its autocomplete host, Scenario: **HARD GATE** — The autocomplete host is intact, Scenario: The dropdown is created when absent, Scenario: The dropdown's stacking ceiling is preserved, Scenario: The hero's overflow escape hatch survives

### Community 235 - "Requirement: New strings require both an attribute and both dictionaries"
Cohesion: 0.40
Nodes (5): Requirement: New strings require both an attribute and both dictionaries, Scenario: A dynamic label would be interpolated from a dictionary, Scenario: A key present in only one dictionary is a defect, Scenario: A static label would carry a translation attribute, Scenario: No new keys are required

### Community 236 - "Requirement: The Enterprise Footer keys are added in Phase 8"
Cohesion: 0.40
Nodes (5): Requirement: The Enterprise Footer keys are added in Phase 8, Scenario: Every footer attribute resolves in English, Scenario: Proper nouns are not translated, Scenario: The footer re-renders on a language switch, Scenario: The Persian dictionary carries the same footer keys

### Community 237 - "Requirement: The two dictionaries remain structurally parallel"
Cohesion: 0.40
Nodes (5): Requirement: The two dictionaries remain structurally parallel, Scenario: Additions land at mirrored positions, Scenario: No existing key is deleted, renamed, or reworded, Scenario: Only the direction and language codes differ by design, Scenario: The sorted key sets are identical

### Community 238 - "Requirement: Modal controls keep their ids and semantics"
Cohesion: 0.40
Nodes (5): Requirement: Modal controls keep their ids and semantics, Scenario: All modal ids resolve, Scenario: Input autocomplete hints are preserved, Scenario: The close control mirrors for direction, Scenario: The panel clips its decorative layer

### Community 239 - "Requirement: Overlays render correctly across breakpoints, themes, and directions"
Cohesion: 0.40
Nodes (5): Requirement: Overlays render correctly across breakpoints, themes, and directions, Scenario: All six breakpoints render every overlay, Scenario: Both directions render every overlay, Scenario: Both themes render every overlay, Scenario: Dropdowns stay anchored to their triggers

### Community 240 - "Requirement: The login modal's 250 ms contract is preserved"
Cohesion: 0.40
Nodes (5): Requirement: The login modal's 250 ms contract is preserved, Scenario: **HARD GATE** — Both transitions are 250 ms, Scenario: **HARD GATE** — The close delay matches the transition duration, Scenario: The closed state is inert but still present, Scenario: The open sequence is unchanged

### Community 241 - "Requirement: Both directions render correctly"
Cohesion: 0.40
Nodes (5): Requirement: Both directions render correctly, Scenario: Bidirectional text renders correctly, Scenario: Direction switches cleanly at runtime, Scenario: Icon-only direction is correct, Scenario: The layout mirrors without overlap

### Community 242 - "Requirement: Every new effect has a low-tier and a potato-tier override"
Cohesion: 0.40
Nodes (5): Requirement: Every new effect has a low-tier and a potato-tier override, Scenario: Existing overrides still win over restyled rules, Scenario: **HARD GATE** — Every effect-bearing selector has a low-tier override, Scenario: **HARD GATE** — Every effect-bearing selector has a potato-tier override, Scenario: The enumeration is complete

### Community 243 - "Confirmed Facts vs. Assumptions"
Cohesion: 0.50
Nodes (4): Assumptions (not fully verified), Confirmed Facts (verified against source), Confirmed Facts vs. Assumptions, Unresolved

### Community 244 - "Frontend Development"
Cohesion: 0.50
Nodes (4): API Client, Component Pattern, Frontend Development, Module Loading

### Community 245 - "Release & Versioning"
Cohesion: 0.50
Nodes (4): Keep a changelog written for humans, Release & Versioning, Semantic Versioning, Tag the release, and let the tag be the source of truth

### Community 246 - "Requirement: Event isolation is achieved structurally, not by speculative cancellation"
Cohesion: 0.50
Nodes (4): Requirement: Event isolation is achieved structurally, not by speculative cancellation, Scenario: Cancellation is only added against demonstrated need, Scenario: No structural cause of double activation, Scenario: No unintended parent-handler navigation

### Community 247 - "Requirement: Independent action definitions"
Cohesion: 0.50
Nodes (4): Requirement: Independent action definitions, Scenario: File Action controls are separate elements, Scenario: File actions are distinct definitions, Scenario: Primary icon is not a File Action definition

### Community 248 - "Requirement: Availability windows are enforced for everyone"
Cohesion: 0.50
Nodes (4): Requirement: Availability windows are enforced for everyone, Scenario: Expired, Scenario: Not yet available, Scenario: Open-ended window

### Community 249 - "Requirement: Folder policies apply to everything inside the folder"
Cohesion: 0.50
Nodes (4): Requirement: Folder policies apply to everything inside the folder, Scenario: File inside an unpublished folder, Scenario: Folder row recorded as a file, Scenario: Stricter child policy

### Community 250 - "Requirement: Invalid or unreadable policy data fails closed"
Cohesion: 0.50
Nodes (4): Requirement: Invalid or unreadable policy data fails closed, Scenario: Database lost at runtime, Scenario: Newer schema at startup, Scenario: Unknown access mode

### Community 251 - "9. Performance / RTL / Responsive Strategy"
Cohesion: 0.50
Nodes (4): 9.1 Perf-tier parity (I12), 9.2 RTL parity (I13), 9.3 Responsive parity, 9. Performance / RTL / Responsive Strategy

### Community 252 - "Requirement: Every surviving Home id survives unchanged"
Cohesion: 0.50
Nodes (4): Requirement: Every surviving Home id survives unchanged, Scenario: All surviving Home ids are still present, Scenario: The deleted ids are genuinely gone, Scenario: The diff introduces no unexpected id change

### Community 253 - "Requirement: Pre-existing Home defects are neither fixed nor worsened"
Cohesion: 0.50
Nodes (4): Requirement: Pre-existing Home defects are neither fixed nor worsened, Scenario: No new per-render global listener is introduced, Scenario: The hard-coded sort labels remain untouched, Scenario: The persisted-state label mismatch is not made worse

### Community 254 - "Requirement: The logo wipe contract survives"
Cohesion: 0.50
Nodes (4): Requirement: The logo wipe contract survives, Scenario: Both logo layers exist, Scenario: The decorative shader layer stays hidden from assistive technology, Scenario: The wipe animation still plays on theme change

### Community 255 - "Requirement: The search field identity is unchanged"
Cohesion: 0.50
Nodes (4): Requirement: The search field identity is unchanged, Scenario: No second shortcut handler is added, Scenario: The reference design's shortcut field is not adopted, Scenario: The shortcut focuses the existing field

### Community 256 - "Requirement: The view toggle and refresh control keep their behaviour"
Cohesion: 0.50
Nodes (4): Requirement: The view toggle and refresh control keep their behaviour, Scenario: The active-state class is exclusive, Scenario: The refresh control spins and clears, Scenario: The view toggle restyles the grid

### Community 257 - "Requirement: No existing dictionary entry is modified"
Cohesion: 0.50
Nodes (4): Requirement: No existing dictionary entry is modified, Scenario: The Browse keys are untouched, Scenario: The Home keys are untouched, Scenario: The navigation keys are untouched

### Community 258 - "Requirement: Pre-existing localisation defects are neither fixed nor worsened"
Cohesion: 0.50
Nodes (4): Requirement: Pre-existing localisation defects are neither fixed nor worsened, Scenario: No new hard-coded user-facing text is introduced, Scenario: The hard-coded sort labels remain untouched, Scenario: The message-grammar defect is not made worse

### Community 259 - "Requirement: No accessibility improvement is introduced into the modal"
Cohesion: 0.50
Nodes (4): Requirement: No accessibility improvement is introduced into the modal, Scenario: Focus is not restored on close, Scenario: No escape-key handler is added, Scenario: No focus trap is added

### Community 260 - "Requirement: Overlay effects are tier-gated"
Cohesion: 0.50
Nodes (4): Requirement: Overlay effects are tier-gated, Scenario: Every overlay effect has both tier overrides, Scenario: Low tier disables the overlay blur, Scenario: The modal backdrop blur is gated

### Community 261 - "Requirement: The authentication-required lock keeps its control chain"
Cohesion: 0.50
Nodes (4): Requirement: The authentication-required lock keeps its control chain, Scenario: Responsive size collapses are preserved, Scenario: The activate control's fallback chain is intact, Scenario: The lock state keeps its semantic hooks

### Community 262 - "Requirement: The language menu remains hover-only"
Cohesion: 0.50
Nodes (4): Requirement: The language menu remains hover-only, Scenario: **HARD GATE** — The hover-only mechanism is unchanged, Scenario: Hovering still opens the menu, Scenario: The expanded-state attribute is still unmaintained

### Community 263 - "Requirement: The modal attaches to the document body"
Cohesion: 0.50
Nodes (4): Requirement: The modal attaches to the document body, Scenario: **HARD GATE** — The overlay is a child of the document body, Scenario: The modal survives a route change, Scenario: The mount's contents are replaced normally

### Community 264 - "Requirement: The single-instance guard is preserved"
Cohesion: 0.50
Nodes (4): Requirement: The single-instance guard is preserved, Scenario: All three open sites reach the same modal, Scenario: **HARD GATE** — Repeated opens produce one overlay, Scenario: The guard runs before any DOM work

### Community 265 - "Requirement: All six breakpoints are preserved exactly"
Cohesion: 0.50
Nodes (4): Requirement: All six breakpoints are preserved exactly, Scenario: Every breakpoint renders, Scenario: The breakpoint set is unchanged, Scenario: The content-width scaling is preserved

### Community 266 - "Requirement: Focus visibility survives the restyle"
Cohesion: 0.50
Nodes (4): Requirement: Focus visibility survives the restyle, Scenario: Every interactive element shows a focus indicator, Scenario: Focus-driven reveals still work, Scenario: Hover styling does not remove keyboard access

### Community 267 - "Requirement: Hover-capability fallback is preserved"
Cohesion: 0.50
Nodes (4): Requirement: Hover-capability fallback is preserved, Scenario: **HARD GATE** — Controls stay keyboard reachable on hoverless devices, Scenario: The hoverless media query is preserved, Scenario: The row hover reveal is unchanged

### Community 268 - "Requirement: No new global or per-render listener is introduced"
Cohesion: 0.50
Nodes (4): Requirement: No new global or per-render listener is introduced, Scenario: **HARD GATE** — No new global is added, Scenario: **HARD GATE** — No new per-render global listener is added, Scenario: Reference design shortcut handlers are not adopted

### Community 269 - "Requirement: The Browse freeze holds for the whole change"
Cohesion: 0.50
Nodes (4): Requirement: The Browse freeze holds for the whole change, Scenario: Browse responsive behavior is not modified, Scenario: **HARD GATE** — The three Browse files are byte-identical, Scenario: No performance or RTL work is applied to Browse

### Community 270 - "Requirement: The performance tier cache still round-trips"
Cohesion: 0.50
Nodes (4): Requirement: The performance tier cache still round-trips, Scenario: Automatic detection remains available, Scenario: Selecting a tier persists, Scenario: The persisted tier is restored on the next load

### Community 272 - "Requirement: A path with no applicable policy keeps existing portal behavior"
Cohesion: 0.67
Nodes (3): Requirement: A path with no applicable policy keeps existing portal behavior, Scenario: Policy deleted but permission rows remain, Scenario: Ungoverned file

### Community 273 - "Requirement: Access is decided before the filesystem is consulted"
Cohesion: 0.67
Nodes (3): Requirement: Access is decided before the filesystem is consulted, Scenario: Missing and hidden look the same, Scenario: Nonexistent path under a locked folder

### Community 274 - "Requirement: Admin policy changes take effect within the synchronization interval"
Cohesion: 0.67
Nodes (3): Requirement: Admin policy changes take effect within the synchronization interval, Scenario: File unpublished while being served, Scenario: Grant added

### Community 275 - "Requirement: An explicit deny always blocks that user"
Cohesion: 0.67
Nodes (3): Requirement: An explicit deny always blocks that user, Scenario: Deny on a folder, Scenario: Deny on a public file

### Community 276 - "Requirement: Another name for a governed file is governed too"
Cohesion: 0.67
Nodes (3): Requirement: Another name for a governed file is governed too, Scenario: Link into an unpublished folder, Scenario: Windows trailing dot

### Community 277 - "Requirement: Categories and counts reflect only allowed content"
Cohesion: 0.67
Nodes (3): Requirement: Categories and counts reflect only allowed content, Scenario: Counts exclude governed files, Scenario: Locked file is not counted for anonymous

### Community 278 - "Requirement: Direct downloads are enforced"
Cohesion: 0.67
Nodes (3): Requirement: Direct downloads are enforced, Scenario: Direct URL to a denied file, Scenario: Direct URL to a file in a locked folder

### Community 279 - "Requirement: Each policy is checked against its own grants"
Cohesion: 0.67
Nodes (3): Requirement: Each policy is checked against its own grants, Scenario: Grant on a restricted folder, Scenario: Restricted file inside a granted folder

### Community 280 - "Requirement: Listings show only allowed entries and the entries that carry a lock"
Cohesion: 0.67
Nodes (3): Requirement: Listings show only allowed entries and the entries that carry a lock, Scenario: Anonymous listing, Scenario: Logged-in listing

### Community 281 - "Requirement: Portal paths map directly to admin client paths"
Cohesion: 0.67
Nodes (3): Requirement: Portal paths map directly to admin client paths, Scenario: Nested file, Scenario: Root-level file

### Community 282 - "Requirement: Release listings and latest-release URLs are enforced"
Cohesion: 0.67
Nodes (3): Requirement: Release listings and latest-release URLs are enforced, Scenario: Newest release is unpublished, Scenario: Only locked releases

### Community 283 - "Requirement: Search applies the listing rules before limits"
Cohesion: 0.67
Nodes (3): Requirement: Search applies the listing rules before limits, Scenario: Hidden match, Scenario: Match inside a locked folder

### Community 284 - "Requirement: The combined decision is hidden, then locked, then allow"
Cohesion: 0.67
Nodes (3): Requirement: The combined decision is hidden, then locked, then allow, Scenario: Locked folder over a public file, Scenario: Locked folder over a restricted, ungranted file

### Community 285 - "Requirement: Unpublished items are hidden from everyone"
Cohesion: 0.67
Nodes (3): Requirement: Unpublished items are hidden from everyone, Scenario: Granted user and an unpublished file, Scenario: Locked and unpublished

### Community 286 - "Requirement: ZIP archives contain only allowed files"
Cohesion: 0.67
Nodes (3): Requirement: ZIP archives contain only allowed files, Scenario: Locked file in the selection, Scenario: One hidden file in the selection

### Community 287 - "Requirement: The performance monitor's surfaces survive"
Cohesion: 0.67
Nodes (3): Requirement: The performance monitor's surfaces survive, Scenario: The debug panel shortcut still toggles the panel, Scenario: The monitor still observes page performance

## Knowledge Gaps
- **2011 isolated node(s):** `idea-refine.sh script`, `Autocomplete`, `BrowsePage`, `FileActions`, `FileInspector` (+2006 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2165 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `overflow()` connect `overflow` to `Requirement: The Enterprise Footer is real, bilingual shell content`, `ADDED Requirements`, `Locked Decisions`, `Enterprise Footer Mapping`, `lenis.min.js`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `pathRequiresAuth()` (e.g. with `Authentication` and ``GET /release9/latest`, `GET /release8/latest``) actually correct?**
  _`pathRequiresAuth()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **What connects `idea-refine.sh script`, `Autocomplete`, `BrowsePage` to the rest of the system?**
  _2011 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `files-service.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13445378151260504 - nodes in this community are weakly interconnected._
- **Why does `pathRequiresAuth()` connect `pathRequiresAuth` to `login`, `files-service.js`, `api-router.js`, `API Reference`, `Decisions`, `Data Flows`, `Locked Decisions`, `Requirement: In integration mode, release protection comes from the admin folder lock`, `Adding or Changing an API Endpoint`, `Secrets and Configuration`, `auth-service.js`, `Tasks`, `Proposal: Browse Page Inspector Redesign`, `compareVersions`, `Proposal`, `Verification Requirement`, `Decisions`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `login()` (e.g. with `ResourceService` and `Command-line clients (HTTP Basic)`) actually correct?**
  _`login()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Should `api-router.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._