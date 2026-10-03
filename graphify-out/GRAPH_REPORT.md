# Graph Report - files-server-web  (2026-10-03)

## Corpus Check
- 0 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1228 nodes · 1510 edges · 99 communities (71 shown, 28 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 263 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88

## God Nodes (most connected - your core abstractions)
1. `handleRequest()` - 20 edges
2. `login()` - 20 edges
3. `serviceError()` - 20 edges
4. `Decisions` - 19 edges
5. `Code Review and Quality` - 19 edges
6. `ADDED Requirements` - 17 edges
7. `API Reference` - 16 edges
8. `Design: Project Brain Documentation` - 16 edges
9. `Git Workflow and Versioning` - 15 edges
10. `Test-Driven Development` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Logging/Security Observability` --references--> `logAccess()`  [INFERRED]
  docs/SECURITY.md → lib/logger.js
- ``GET /api/files/*`` --references--> `listPath()`  [INFERRED]
  docs/API.md → lib/files-service.js
- ``GET /api/releases`` --references--> `listLatestReleases()`  [INFERRED]
  docs/API.md → lib/files-service.js
- ``POST /api/auth/login`` --references--> `login()`  [INFERRED]
  docs/API.md → lib/auth-service.js
- `Confirmed Facts (verified against source)` --references--> `serviceError()`  [INFERRED]
  docs/ARCHITECTURE.md → lib/files-service.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Multi-page Application Structure** — 404_html_page, browse_html_page, index_html_page [INFERRED 0.85]
- **Shared JavaScript Dependencies** — browse_html_router, index_html_router, browse_html_i18n, index_html_i18n [INFERRED 0.85]

## Communities (99 total, 28 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (78): ResourceService, RFC-7515, Authentication, `GET /api/auth/status`, `POST /api/auth/logout`, Environment Variables, 4. Download Flow, 6. Authentication/Session Flow (+70 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (58): `GET /api/categories`, `GET /api/search`, 1. Application Startup, 3. File Browsing Flow, 5. Search/Categories/Releases Flows, 7. Error Flow, 8. Frontend Data Flow, Categories (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (54): API Reference, Error Response Format, `GET /404`, `GET /404.html`, `GET /api/download/*`, `GET /api/files/*`, `GET /api/health`, `GET /api/releases`, `GET /`, `GET /index.html`, `GET /browse/*` (+46 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (42): Broken Access Control, Broken Authentication, Cross-Site Scripting (XSS), Data Classification, Dependency Audit Triage, Destructive Operations on Derived Paths, File Upload Safety, Hardening Patterns (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (31): 9. Cross-Cutting Flows, Idle Timer (client-side), Logging, Rate Limiting, Existing Logging, Extending Logging / Operational Behavior, Extension Point, Rate Limiting (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (29): applyLang(), getDict(), getLang(), i18n, setupLanguageDropdown(), 10. File vs directory capability handling, 11. HTML element choice: `<a>` vs `<button>`, 12. Event propagation strategy (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): 1. Correctness, 2. Readability & Simplicity, 3. Architecture, 4. Security, 5. Performance, Change Descriptions, Change Sizing, Code Review and Quality (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (29): Browser Testing with DevTools, Common Rationalizations, DAMP Over DRY in Tests, Decision Guide, Discover the Stack First, Name Tests Descriptively, One Assertion Per Concept, Overview (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (21): API Proxying, Denied Paths (nginx), Deployment, Deployment Architecture, Health / Verification, Installation, Lifecycle, Logging (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (28): Anti-Patterns, Common Rationalizations, Compress before dropping, Confusion Management, Context Budget Management, Context Engineering, Context Packing Strategies, Level 1: Rules Files (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (26): 1. Commit Early, Commit Often, 2. Atomic Commits, 3. Descriptive Messages, 4. Keep Concerns Separate, 5. Size Your Changes, Branch Naming, Branching Strategy, Change Summaries (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (25): Accessibility, Code Quality, Common Rationalizations, Documentation, Error Budget Release Gate, Error Reporting, Feature Flag Strategy, Infrastructure (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (25): Acceptance Criteria, Assumptions (not fully verified), Completeness, Confirmed Facts (verified against source), Confirmed Facts vs. Assumptions, Consistency, Documentation Maintenance, Goals (+17 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (25): Adding a Browse File Action, Adding a Frontend Component, Adding Dependencies, API Client, API/Manual Checks, Application Startup, Authentication Checks (when `AUTH_ENABLED=true`), Documentation Consistency (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (24): 1. Contract First, 2. Consistent Error Semantics, 3. Validate at Boundaries, 4. Prefer Addition Over Modification, 5. Predictable Naming, 6. Honouring an Idempotency Key, API and Interface Design, Common Rationalizations (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (24): Accessibility Verification with DevTools, Available Tools, Browser Testing with DevTools, Clean Console Standard, Common Rationalizations, Console Analysis Patterns, Content Boundary Markers, For Network Issues (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (24): Accessibility (WCAG 2.1 AA), ARIA Labels, Avoid the AI Aesthetic, Color, Common Rationalizations, Component Architecture, Component Patterns, Design System Adherence (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (24): Common Rationalizations, Connection Pool Exhaustion, Core Web Vitals Targets, Large Bundle Size, Log every attempt, including the reverted ones, Missing Caching (Backend), Missing Image Optimization (Frontend), N+1 Queries (Backend) (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (23): Automation Beyond CI, Basic CI Pipeline, Build Cop Role, CI/CD and Automation, CI Optimization, Common Rationalizations, Dependabot / Renovate, Deployment Strategies (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (22): Adapting it, Contract, Floor guard: reference implementation, Reference (Node, ~stack-agnostic patterns), Common Rationalizations, Constraint-Driven Development, Escalation Path, Loading Constraints (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (23): Adapter Pattern, Code Is a Liability, Common Rationalizations, Compulsory vs Advisory Deprecation, Core Principles, Database Schema Migrations (Expand/Contract), Deprecation and Migration, Deprecation Planning Starts at Design Time (+15 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (22): Common Rationalizations, Contract-First Slicing, Implementation Rules, Increment Checklist, Incremental Implementation, Overview, Red Flags, Risk-First Slicing (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (21): 1. Preserve Behavior Exactly, 2. Follow Project Conventions, 3. Prefer Clarity Over Cleverness, 4. Maintain Balance, 5. Scope to What Changed, Code Simplification, Common Rationalizations, Language-Specific Guidance (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (21): Build Failure Triage, Common Rationalizations, Debugging and Error Recovery, Error-Specific Patterns, Instrumentation Guidelines, Overview, Red Flags, Runtime Error Triage (+13 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (21): ADR Lifecycle, ADR Template, API Documentation, Architecture Decision Records (ADRs), Changelog Maintenance, Common Rationalizations, Document Known Gotchas, Documentation and ADRs (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (21): API Client, Backend Changes, Component Pattern, Debugging / Troubleshooting, Development, Development Workflow, Documentation Maintenance, Frontend Changes (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (18): Environment Setup, Access Pattern, Adding Configuration, Documentation to Update, How Configuration Is Loaded, Secrets and Configuration, fs, loadEnv() (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Example, Interaction with Other Skills, Interview Me, Loading Constraints, Output, Overview, Red Flags (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Output Files, Overview, Parallelization Opportunities, Plan Document Template, Planning and Task Breakdown, Red Flags, See Also (+10 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (17): Example 1: Vague Early-Stage Concept (Full 3-Phase Session), Example 2: Feature Idea Within an Existing Product (Codebase-Aware), Example 3: Process/Workflow Idea (Non-Product), Ideation Session Examples, Key Assumptions to Validate, MVP Scope, Not Doing (and Why), Open Questions (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (15): Common Rationalizations, Cross-model escalation, Doubt-Driven Development, Interaction with Other Skills, Loading Constraints, Overview, Red Flags, Step 1: CLAIM — Surface what stands (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (15): CloudAvid Brand, 404 Error Page, File Portal, Internationalization, Browse Page, Client-side Router, Autocomplete, Internationalization (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (14): Anti-patterns to Avoid, Detailed Instructions, How It Works, Idea Refine, Output, Phase 1: Understand & Expand (Divergent), Phase 2: Evaluate & Converge, Phase 3: Sharpen & Ship (+6 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (14): 1. Surface Assumptions, 2. Manage Confusion Actively, 3. Push Back When Warranted, 4. Enforce Simplicity, 5. Maintain Scope Discipline, 6. Verify, Don't Assume, Core Operating Behaviors, Failure Modes to Avoid (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (13): Common Rationalizations, Keeping the Spec Alive, Overview, Phase 0: Scope Check, Phase 1: Specify, Phase 2: Plan, Phase 3: Tasks, Phase 4: Implement (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (12): Common Rationalizations, Overview, Red Flags, Retrieval Safety: Treat Fetched Content as Data, Source-Driven Development, Step 1: Detect Stack and Versions, Step 2: Fetch Official Documentation, Step 3: Implement Following Documented Patterns (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (11): 1. User Value, 2. Feasibility, 3. Differentiation, Assumption Audit, Core Evaluation Dimensions, Decision Framework, Might Be True (Nice to Have), Must Be True (Dealbreakers) (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (11): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): Assumptions, Capabilities, Confirmed Requirements (from Phase 1 evidence — EXTRACTED), Expected User-Visible Behavior, Impact, Modified Capabilities, New Capabilities, Proposal: Browse Files File Actions (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (10): 10. Extension Documentation Strategy, 8. Deployment Documentation Strategy, 9. Development Documentation Strategy, Approach, Coverage, Design: Project Brain Documentation, Environment Variables, Repository vs. Production Distinction (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (10): dependencies, bcrypt, dotenv, description, main, name, private, scripts (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (10): ADDED Requirements, Requirement: Directory action rendering, Requirement: Event propagation is controlled, Requirement: File action rendering, Requirement: Independent action definitions, Scenario: Action controls are separate elements from the name link, Scenario: Download control with correct target, Scenario: No unintended parent-handler navigation (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (8): Analogous Inspiration, Constraint-Based Ideation, First Principles Thinking, How Might We (HMW), Ideation Frameworks Reference, Jobs to Be Done (JTBD), Pre-mortem, SCAMPER

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (8): 1. File Actions Module Foundation, 2. Styling & Layout Preparation (`browse.css`), 3. Browse Integration, 4. Individual Action Behavior, 5. Accessibility, 6. Validation & Manual Testing, 7. Documentation Alignment, Tasks: Browse Files File Actions

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (9): 4. Architecture Documentation Strategy, Backend Module Structure, Environment Variables, Evidence Requirements, Extension Points, Frontend SPA Structure, Implementation Detail Verification, Request Routing (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.52
Nodes (5): perfBlocked(), start(), stop(), sync(), IdleTimer

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (7): 14. Security, Performance, Compatibility, and Migration Considerations, Compatibility, Graphify Independence, Migration, Performance, Runtime Behavior, Security

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (6): 15. Implementation Phase Mapping, Dependency Summary, Phase 1: Core Architecture (no dependencies), Phase 2: Data Flows & Security (depends on Phase 1), Phase 3: Operations & Development (depends on Phase 1), Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3)

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (6): 1. Design Overview, Document Relationships, Documentation Architecture, Intended Audience, Purpose, Why This Structure

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): Phase 1: Core Architecture (no dependencies), Phase 2: Data Flows & Security (depends on Phase 1), Phase 3: Operations & Development (depends on Phase 1), Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3), Tasks: Project Brain Documentation

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (5): Requirement: Hover and focus visibility of actions, Scenario: Hidden state does not break keyboard access, Scenario: Persistently visible without hover capability, Scenario: Reveal on keyboard focus within the row, Scenario: Reveal on row hover (pointer devices)

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (5): 12. Confirmed Facts, Assumptions, and Unresolved Details, Assumptions (not fully verified), Confirmed Facts (verified against source), Tool-Generated Inferences (NOT to be presented as facts), Unresolved Implementation Details

### Community 53 - "Community 53"
Cohesion: 0.50
Nodes (5): bcrypt, Node.js Crypto Module, Password Hashing Script, Server Entry Point, Server Setup Instructions

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (4): Requirement: Action applicability derived from item data, Scenario: Directory items expose Open only, Scenario: File items expose Download only, Scenario: No parallel capability model

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (4): Requirement: Action click isolation from name link and row, Scenario: Download activates exactly one download, Scenario: Open navigates exactly once, Scenario: Rows remain non-clickable

### Community 56 - "Community 56"
Cohesion: 0.50
Nodes (4): Requirement: Action URLs built only via ResourceService primitives, Scenario: Browse href comes from the service, Scenario: Download href comes from the service, Scenario: No duplicated URL construction

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (4): Requirement: Dedicated File Actions module boundary, Scenario: Action logic lives outside browse.js, Scenario: BrowsePage integrates through a single call point, Scenario: Module is loaded and available before rendering

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (4): Requirement: Keyboard operability with visible focus, Scenario: Keyboard activation performs the action, Scenario: Tab reaches action controls, Scenario: Visible focus indicator

### Community 59 - "Community 59"
Cohesion: 0.50
Nodes (4): Requirement: Localized extensibility for future actions, Scenario: Adding a declarative future action does not touch BrowsePage, Scenario: BrowsePage responsibilities remain unchanged, Scenario: Minimal module surface

### Community 60 - "Community 60"
Cohesion: 0.50
Nodes (4): 11. Source Reference Strategy, Format, Reference Convention, Why Not Line Numbers

### Community 61 - "Community 61"
Cohesion: 0.50
Nodes (4): 13. Maintenance and Consistency Strategy, Maintenance Mapping, Review Checklist, Role of Phase 4 Final Review

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (4): 2. Documentation Boundaries, Boundary Rules, Cross-Reference Convention, Source-of-Truth Rules

### Community 63 - "Community 63"
Cohesion: 0.50
Nodes (4): 3. Repository-to-Documentation Mapping, Confirmed Repository Structures, Frontend Script Loading Order (confirmed from `index.html`), Module Dependency Graph (confirmed from `require()` calls)

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (4): 5. API Documentation Strategy, Coverage, Structure, Verification Requirement

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (3): Requirement: Accessible names for action controls, Scenario: Accessible name includes verb and item name, Scenario: Decorative icons hidden from assistive technology

### Community 67 - "Community 67"
Cohesion: 0.67
Nodes (3): Requirement: Actions available in both view modes, Scenario: Grid view placement, Scenario: List view placement

### Community 68 - "Community 68"
Cohesion: 0.67
Nodes (3): Requirement: Existing Browse controls preserved, Scenario: Filtering and sorting operate on rows with actions, Scenario: View mode toggle preserves actions

### Community 69 - "Community 69"
Cohesion: 0.67
Nodes (3): Requirement: Existing file-name link behavior preserved, Scenario: Directory name link unchanged, Scenario: File name link unchanged

### Community 70 - "Community 70"
Cohesion: 0.67
Nodes (3): Requirement: Router interaction compatibility, Scenario: Download bypasses SPA navigation, Scenario: Open performs SPA navigation

### Community 71 - "Community 71"
Cohesion: 0.67
Nodes (3): 6. Data Flow Documentation Strategy, Representation, Verification

## Knowledge Gaps
- **779 isolated node(s):** `nginx/API Routing`, `Static-File and SPA Boundaries`, ``GET /api/health``, ``GET /__health``, `Assumptions (not fully verified)` (+774 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 836 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Extending` connect `Community 13` to `Community 0`, `Community 1`, `Community 4`, `Community 8`, `Community 26`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Design: Project Brain Documentation` connect `Community 40` to `Community 64`, `Community 0`, `Community 71`, `Community 45`, `Community 47`, `Community 48`, `Community 49`, `Community 52`, `Community 60`, `Community 61`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `serviceError()` connect `Community 1` to `Community 2`, `Community 5`, `Community 40`, `Community 12`, `Community 52`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `handleRequest()` (e.g. with `API Reference` and `Extension Points`) actually correct?**
  _`handleRequest()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `login()` (e.g. with `ResourceService` and ``POST /api/auth/login``) actually correct?**
  _`login()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `serviceError()` (e.g. with `Error Response Format` and `Confirmed Facts (verified against source)`) actually correct?**
  _`serviceError()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `nginx/API Routing`, `Static-File and SPA Boundaries`, ``GET /api/health`` to the rest of the system?**
  _779 weakly-connected nodes found - possible documentation gaps or missing edges._