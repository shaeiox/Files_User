# Graph Report - files-server-web  (2026-10-01)

## Corpus Check
- 72 files · ~217,315 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1223 nodes · 1500 edges · 97 communities (69 shown, 28 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 260 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- auth-service.js
- api-router.js
- files-service.js
- server.js
- Index Page
- package.json
- Decisions
- Server Setup Instructions
- Process
- autocomplete.js
- banner.js
- browse.js
- home.js
- router.js
- performance-monitor.js
- theme.js
- idle-timer.js
- Avid Logo Dark
- Fylad Logo
- ISO Icon
- Log Logo
- AVID Download Logo (Dark)
- Logo 2 Light
- Template Icon
- Hardening Controls
- Proposal: Project Brain Documentation
- Extending
- Deployment
- Code Review and Quality
- Test-Driven Development
- Context Engineering
- Git Workflow and Versioning
- Shipping and Launch
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
- login
- Interview Me
- Planning and Task Breakdown
- ReOrder: Keep Your Regulars Ordering Direct
- Doubt-Driven Development
- Security
- Secrets and Configuration
- Idea Refine
- Using Agent Skills
- Spec-Driven Development
- Source-Driven Development
- Refinement & Evaluation Criteria
- openspec-explore/SKILL.md
- Proposal: Browse Files File Actions
- opsx-explore.md
- Design: Project Brain Documentation
- ADDED Requirements
- Ideation Frameworks Reference
- Tasks: Browse Files File Actions
- 4. Architecture Documentation Strategy
- 14. Security, Performance, Compatibility, and Migration Considerations
- 15. Implementation Phase Mapping
- 1. Design Overview
- Tasks: Project Brain Documentation
- Requirement: Hover and focus visibility of actions
- 12. Confirmed Facts, Assumptions, and Unresolved Details
- Requirement: Action applicability derived from item data
- Requirement: Action click isolation from name link and row
- Requirement: Action URLs built only via ResourceService primitives
- Requirement: Dedicated File Actions module boundary
- Requirement: Keyboard operability with visible focus
- Requirement: Localized extensibility for future actions
- 11. Source Reference Strategy
- 13. Maintenance and Consistency Strategy
- 2. Documentation Boundaries
- 3. Repository-to-Documentation Mapping
- 5. API Documentation Strategy
- Spec Delta: file-actions
- Requirement: Accessible names for action controls
- Requirement: Actions available in both view modes
- Requirement: Existing Browse controls preserved
- Requirement: Existing file-name link behavior preserved
- Requirement: Router interaction compatibility

## God Nodes (most connected - your core abstractions)
1. `handleRequest()` - 20 edges
2. `serviceError()` - 20 edges
3. `login()` - 20 edges
4. `Code Review and Quality` - 19 edges
5. `Decisions` - 19 edges
6. `ADDED Requirements` - 17 edges
7. `API Reference` - 16 edges
8. `Design: Project Brain Documentation` - 16 edges
9. `verifySession()` - 15 edges
10. `Test-Driven Development` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Backend Changes` --references--> `handleRequest()`  [INFERRED]
  docs/DEVELOPMENT.md → lib/api-router.js
- `Verification Requirement` --references--> `sendJSON()`  [INFERRED]
  openspec/changes/project-brain-documentation/design.md → lib/http-utils.js
- `Risks / Trade-offs` --references--> `serveSPA()`  [INFERRED]
  openspec/changes/browse-file-actions/design.md → lib/static-handler.js
- `Assumptions` --references--> `serveSPA()`  [INFERRED]
  openspec/changes/browse-file-actions/proposal.md → lib/static-handler.js
- ``GET /api/categories`` --references--> `listCategories()`  [INFERRED]
  docs/API.md → lib/files-service.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Multi-page Application Structure** — 404_html_page, browse_html_page, index_html_page [INFERRED 0.85]
- **Shared JavaScript Dependencies** — browse_html_router, index_html_router, browse_html_i18n, index_html_i18n [INFERRED 0.85]

## Communities (97 total, 28 thin omitted)

### Community 0 - "auth-service.js"
Cohesion: 0.06
Nodes (74): ResourceService, RFC-7515, `GET /api/auth/status`, `POST /api/auth/logout`, Environment Variables, 6. Authentication/Session Flow, Login, Logout (+66 more)

### Community 1 - "api-router.js"
Cohesion: 0.05
Nodes (64): API Reference, Authentication, Error Response Format, `GET /404`, `GET /404.html`, `GET /api/categories`, `GET /api/download/*`, `GET /api/files/*`, `GET /api/health` (+56 more)

### Community 2 - "files-service.js"
Cohesion: 0.08
Nodes (56): 1. Application Startup, 3. File Browsing Flow, 4. Download Flow, 5. Search/Categories/Releases Flows, 7. Error Flow, 8. Frontend Data Flow, Categories, Data Flows (+48 more)

### Community 3 - "server.js"
Cohesion: 0.05
Nodes (42): Broken Access Control, Broken Authentication, Cross-Site Scripting (XSS), Data Classification, Dependency Audit Triage, Destructive Operations on Derived Paths, File Upload Safety, Hardening Patterns (+34 more)

### Community 4 - "Index Page"
Cohesion: 0.05
Nodes (37): c_pro_files_server_web_lib_load_env_loadenv, 9. Cross-Cutting Flows, Idle Timer (client-side), Logging, Rate Limiting, Existing Logging, Extending Logging / Operational Behavior, Extension Point (+29 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (29): applyLang(), getDict(), getLang(), i18n, setupLanguageDropdown(), 10. File vs directory capability handling, 11. HTML element choice: `<a>` vs `<button>`, 12. Event propagation strategy (+21 more)

### Community 6 - "Decisions"
Cohesion: 0.09
Nodes (23): API Proxying, Denied Paths (nginx), Deployment, Deployment Architecture, Environment Configuration, Health / Verification, Installation, Lifecycle (+15 more)

### Community 7 - "Server Setup Instructions"
Cohesion: 0.07
Nodes (29): 1. Correctness, 2. Readability & Simplicity, 3. Architecture, 4. Security, 5. Performance, Change Descriptions, Change Sizing, Code Review and Quality (+21 more)

### Community 8 - "Process"
Cohesion: 0.07
Nodes (29): Browser Testing with DevTools, Common Rationalizations, DAMP Over DRY in Tests, Decision Guide, Discover the Stack First, Name Tests Descriptively, One Assertion Per Concept, Overview (+21 more)

### Community 9 - "autocomplete.js"
Cohesion: 0.08
Nodes (28): API Client, Backend Changes, Component Pattern, Development, Development Workflow, Documentation Maintenance, Environment Setup, Frontend Changes (+20 more)

### Community 10 - "banner.js"
Cohesion: 0.07
Nodes (28): Anti-Patterns, Common Rationalizations, Compress before dropping, Confusion Management, Context Budget Management, Context Engineering, Context Packing Strategies, Level 1: Rules Files (+20 more)

### Community 11 - "browse.js"
Cohesion: 0.07
Nodes (26): 1. Commit Early, Commit Often, 2. Atomic Commits, 3. Descriptive Messages, 4. Keep Concerns Separate, 5. Size Your Changes, Branch Naming, Branching Strategy, Change Summaries (+18 more)

### Community 12 - "home.js"
Cohesion: 0.08
Nodes (25): Accessibility, Code Quality, Common Rationalizations, Documentation, Error Budget Release Gate, Error Reporting, Feature Flag Strategy, Infrastructure (+17 more)

### Community 13 - "router.js"
Cohesion: 0.08
Nodes (25): Acceptance Criteria, Assumptions (not fully verified), Completeness, Confirmed Facts (verified against source), Confirmed Facts vs. Assumptions, Consistency, Documentation Maintenance, Goals (+17 more)

### Community 14 - "performance-monitor.js"
Cohesion: 0.08
Nodes (25): Adding a Browse File Action, Adding a Frontend Component, Adding Dependencies, API Client, API/Manual Checks, Application Startup, Authentication Checks (when `AUTH_ENABLED=true`), Documentation Consistency (+17 more)

### Community 15 - "theme.js"
Cohesion: 0.08
Nodes (24): 1. Contract First, 2. Consistent Error Semantics, 3. Validate at Boundaries, 4. Prefer Addition Over Modification, 5. Predictable Naming, 6. Honouring an Idempotency Key, API and Interface Design, Common Rationalizations (+16 more)

### Community 16 - "idle-timer.js"
Cohesion: 0.08
Nodes (24): Accessibility Verification with DevTools, Available Tools, Browser Testing with DevTools, Clean Console Standard, Common Rationalizations, Console Analysis Patterns, Content Boundary Markers, For Network Issues (+16 more)

### Community 17 - "Avid Logo Dark"
Cohesion: 0.08
Nodes (24): Accessibility (WCAG 2.1 AA), ARIA Labels, Avoid the AI Aesthetic, Color, Common Rationalizations, Component Architecture, Component Patterns, Design System Adherence (+16 more)

### Community 18 - "Fylad Logo"
Cohesion: 0.08
Nodes (24): Common Rationalizations, Connection Pool Exhaustion, Core Web Vitals Targets, Large Bundle Size, Log every attempt, including the reverted ones, Missing Caching (Backend), Missing Image Optimization (Frontend), N+1 Queries (Backend) (+16 more)

### Community 19 - "ISO Icon"
Cohesion: 0.08
Nodes (23): Automation Beyond CI, Basic CI Pipeline, Build Cop Role, CI/CD and Automation, CI Optimization, Common Rationalizations, Dependabot / Renovate, Deployment Strategies (+15 more)

### Community 20 - "Log Logo"
Cohesion: 0.08
Nodes (22): Adapting it, Contract, Floor guard: reference implementation, Reference (Node, ~stack-agnostic patterns), Common Rationalizations, Constraint-Driven Development, Escalation Path, Loading Constraints (+14 more)

### Community 21 - "AVID Download Logo (Dark)"
Cohesion: 0.08
Nodes (23): Adapter Pattern, Code Is a Liability, Common Rationalizations, Compulsory vs Advisory Deprecation, Core Principles, Database Schema Migrations (Expand/Contract), Deprecation and Migration, Deprecation Planning Starts at Design Time (+15 more)

### Community 22 - "Logo 2 Light"
Cohesion: 0.09
Nodes (22): Common Rationalizations, Contract-First Slicing, Implementation Rules, Increment Checklist, Incremental Implementation, Overview, Red Flags, Risk-First Slicing (+14 more)

### Community 23 - "Template Icon"
Cohesion: 0.09
Nodes (21): 1. Preserve Behavior Exactly, 2. Follow Project Conventions, 3. Prefer Clarity Over Cleverness, 4. Maintain Balance, 5. Scope to What Changed, Code Simplification, Common Rationalizations, Language-Specific Guidance (+13 more)

### Community 24 - "Hardening Controls"
Cohesion: 0.09
Nodes (21): Build Failure Triage, Common Rationalizations, Debugging and Error Recovery, Error-Specific Patterns, Instrumentation Guidelines, Overview, Red Flags, Runtime Error Triage (+13 more)

### Community 25 - "Proposal: Project Brain Documentation"
Cohesion: 0.09
Nodes (21): ADR Lifecycle, ADR Template, API Documentation, Architecture Decision Records (ADRs), Changelog Maintenance, Common Rationalizations, Document Known Gotchas, Documentation and ADRs (+13 more)

### Community 26 - "Extending"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Example, Interaction with Other Skills, Interview Me, Loading Constraints, Output, Overview, Red Flags (+10 more)

### Community 27 - "Deployment"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Output Files, Overview, Parallelization Opportunities, Plan Document Template, Planning and Task Breakdown, Red Flags, See Also (+10 more)

### Community 28 - "Code Review and Quality"
Cohesion: 0.11
Nodes (17): Example 1: Vague Early-Stage Concept (Full 3-Phase Session), Example 2: Feature Idea Within an Existing Product (Codebase-Aware), Example 3: Process/Workflow Idea (Non-Product), Ideation Session Examples, Key Assumptions to Validate, MVP Scope, Not Doing (and Why), Open Questions (+9 more)

### Community 29 - "Test-Driven Development"
Cohesion: 0.12
Nodes (15): Common Rationalizations, Cross-model escalation, Doubt-Driven Development, Interaction with Other Skills, Loading Constraints, Overview, Red Flags, Step 1: CLAIM — Surface what stands (+7 more)

### Community 30 - "Context Engineering"
Cohesion: 0.14
Nodes (15): CloudAvid Brand, 404 Error Page, File Portal, Internationalization, Browse Page, Client-side Router, Autocomplete, Internationalization (+7 more)

### Community 31 - "Git Workflow and Versioning"
Cohesion: 0.13
Nodes (14): Anti-patterns to Avoid, Detailed Instructions, How It Works, Idea Refine, Output, Phase 1: Understand & Expand (Divergent), Phase 2: Evaluate & Converge, Phase 3: Sharpen & Ship (+6 more)

### Community 32 - "Shipping and Launch"
Cohesion: 0.13
Nodes (14): 1. Surface Assumptions, 2. Manage Confusion Actively, 3. Push Back When Warranted, 4. Enforce Simplicity, 5. Maintain Scope Discipline, 6. Verify, Don't Assume, Core Operating Behaviors, Failure Modes to Avoid (+6 more)

### Community 33 - "API and Interface Design"
Cohesion: 0.14
Nodes (13): Common Rationalizations, Keeping the Spec Alive, Overview, Phase 0: Scope Check, Phase 1: Specify, Phase 2: Plan, Phase 3: Tasks, Phase 4: Implement (+5 more)

### Community 34 - "Browser Testing with DevTools"
Cohesion: 0.15
Nodes (12): Common Rationalizations, Overview, Red Flags, Retrieval Safety: Treat Fetched Content as Data, Source-Driven Development, Step 1: Detect Stack and Versions, Step 2: Fetch Official Documentation, Step 3: Implement Following Documented Patterns (+4 more)

### Community 35 - "Frontend UI Engineering"
Cohesion: 0.17
Nodes (11): 1. User Value, 2. Feasibility, 3. Differentiation, Assumption Audit, Core Evaluation Dimensions, Decision Framework, Might Be True (Nice to Have), Must Be True (Dealbreakers) (+3 more)

### Community 36 - "Performance Optimization"
Cohesion: 0.17
Nodes (11): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do (+3 more)

### Community 37 - "CI/CD and Automation"
Cohesion: 0.17
Nodes (11): Assumptions, Capabilities, Confirmed Requirements (from Phase 1 evidence — EXTRACTED), Expected User-Visible Behavior, Impact, Modified Capabilities, New Capabilities, Proposal: Browse Files File Actions (+3 more)

### Community 38 - "Constraint-Driven Development"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, Planning a Change, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 39 - "Deprecation and Migration"
Cohesion: 0.18
Nodes (10): 10. Extension Documentation Strategy, 8. Deployment Documentation Strategy, 9. Development Documentation Strategy, Approach, Coverage, Design: Project Brain Documentation, Environment Variables, Repository vs. Production Distinction (+2 more)

### Community 40 - "Incremental Implementation"
Cohesion: 0.18
Nodes (10): dependencies, bcrypt, dotenv, description, main, name, private, scripts (+2 more)

### Community 41 - "Code Simplification"
Cohesion: 0.20
Nodes (10): ADDED Requirements, Requirement: Directory action rendering, Requirement: Event propagation is controlled, Requirement: File action rendering, Requirement: Independent action definitions, Scenario: Action controls are separate elements from the name link, Scenario: Download control with correct target, Scenario: No unintended parent-handler navigation (+2 more)

### Community 42 - "Debugging and Error Recovery"
Cohesion: 0.22
Nodes (8): Analogous Inspiration, Constraint-Based Ideation, First Principles Thinking, How Might We (HMW), Ideation Frameworks Reference, Jobs to Be Done (JTBD), Pre-mortem, SCAMPER

### Community 43 - "Documentation and ADRs"
Cohesion: 0.22
Nodes (8): 1. File Actions Module Foundation, 2. Styling & Layout Preparation (`browse.css`), 3. Browse Integration, 4. Individual Action Behavior, 5. Accessibility, 6. Validation & Manual Testing, 7. Documentation Alignment, Tasks: Browse Files File Actions

### Community 44 - "login"
Cohesion: 0.22
Nodes (9): 4. Architecture Documentation Strategy, Backend Module Structure, Environment Variables, Evidence Requirements, Extension Points, Frontend SPA Structure, Implementation Detail Verification, Request Routing (+1 more)

### Community 45 - "Interview Me"
Cohesion: 0.29
Nodes (7): 14. Security, Performance, Compatibility, and Migration Considerations, Compatibility, Graphify Independence, Migration, Performance, Runtime Behavior, Security

### Community 46 - "Planning and Task Breakdown"
Cohesion: 0.33
Nodes (6): 15. Implementation Phase Mapping, Dependency Summary, Phase 1: Core Architecture (no dependencies), Phase 2: Data Flows & Security (depends on Phase 1), Phase 3: Operations & Development (depends on Phase 1), Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3)

### Community 47 - "ReOrder: Keep Your Regulars Ordering Direct"
Cohesion: 0.33
Nodes (6): 1. Design Overview, Document Relationships, Documentation Architecture, Intended Audience, Purpose, Why This Structure

### Community 48 - "Doubt-Driven Development"
Cohesion: 0.33
Nodes (5): Phase 1: Core Architecture (no dependencies), Phase 2: Data Flows & Security (depends on Phase 1), Phase 3: Operations & Development (depends on Phase 1), Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3), Tasks: Project Brain Documentation

### Community 49 - "Security"
Cohesion: 0.40
Nodes (5): Requirement: Hover and focus visibility of actions, Scenario: Hidden state does not break keyboard access, Scenario: Persistently visible without hover capability, Scenario: Reveal on keyboard focus within the row, Scenario: Reveal on row hover (pointer devices)

### Community 50 - "Secrets and Configuration"
Cohesion: 0.40
Nodes (5): 12. Confirmed Facts, Assumptions, and Unresolved Details, Assumptions (not fully verified), Confirmed Facts (verified against source), Tool-Generated Inferences (NOT to be presented as facts), Unresolved Implementation Details

### Community 51 - "Idea Refine"
Cohesion: 0.50
Nodes (5): bcrypt, Node.js Crypto Module, Password Hashing Script, Server Entry Point, Server Setup Instructions

### Community 52 - "Using Agent Skills"
Cohesion: 0.50
Nodes (4): Requirement: Action applicability derived from item data, Scenario: Directory items expose Open only, Scenario: File items expose Download only, Scenario: No parallel capability model

### Community 53 - "Spec-Driven Development"
Cohesion: 0.50
Nodes (4): Requirement: Action click isolation from name link and row, Scenario: Download activates exactly one download, Scenario: Open navigates exactly once, Scenario: Rows remain non-clickable

### Community 54 - "Source-Driven Development"
Cohesion: 0.50
Nodes (4): Requirement: Action URLs built only via ResourceService primitives, Scenario: Browse href comes from the service, Scenario: Download href comes from the service, Scenario: No duplicated URL construction

### Community 55 - "Refinement & Evaluation Criteria"
Cohesion: 0.50
Nodes (4): Requirement: Dedicated File Actions module boundary, Scenario: Action logic lives outside browse.js, Scenario: BrowsePage integrates through a single call point, Scenario: Module is loaded and available before rendering

### Community 56 - "openspec-explore/SKILL.md"
Cohesion: 0.50
Nodes (4): Requirement: Keyboard operability with visible focus, Scenario: Keyboard activation performs the action, Scenario: Tab reaches action controls, Scenario: Visible focus indicator

### Community 57 - "Proposal: Browse Files File Actions"
Cohesion: 0.50
Nodes (4): Requirement: Localized extensibility for future actions, Scenario: Adding a declarative future action does not touch BrowsePage, Scenario: BrowsePage responsibilities remain unchanged, Scenario: Minimal module surface

### Community 58 - "opsx-explore.md"
Cohesion: 0.50
Nodes (4): 11. Source Reference Strategy, Format, Reference Convention, Why Not Line Numbers

### Community 59 - "Design: Project Brain Documentation"
Cohesion: 0.50
Nodes (4): 13. Maintenance and Consistency Strategy, Maintenance Mapping, Review Checklist, Role of Phase 4 Final Review

### Community 60 - "ADDED Requirements"
Cohesion: 0.50
Nodes (4): 2. Documentation Boundaries, Boundary Rules, Cross-Reference Convention, Source-of-Truth Rules

### Community 61 - "Ideation Frameworks Reference"
Cohesion: 0.50
Nodes (4): 3. Repository-to-Documentation Mapping, Confirmed Repository Structures, Frontend Script Loading Order (confirmed from `index.html`), Module Dependency Graph (confirmed from `require()` calls)

### Community 62 - "Tasks: Browse Files File Actions"
Cohesion: 0.50
Nodes (4): 5. API Documentation Strategy, Coverage, Structure, Verification Requirement

### Community 64 - "14. Security, Performance, Compatibility, and Migration Considerations"
Cohesion: 0.67
Nodes (3): Requirement: Accessible names for action controls, Scenario: Accessible name includes verb and item name, Scenario: Decorative icons hidden from assistive technology

### Community 65 - "15. Implementation Phase Mapping"
Cohesion: 0.67
Nodes (3): Requirement: Actions available in both view modes, Scenario: Grid view placement, Scenario: List view placement

### Community 66 - "1. Design Overview"
Cohesion: 0.67
Nodes (3): Requirement: Existing Browse controls preserved, Scenario: Filtering and sorting operate on rows with actions, Scenario: View mode toggle preserves actions

### Community 67 - "Tasks: Project Brain Documentation"
Cohesion: 0.67
Nodes (3): Requirement: Existing file-name link behavior preserved, Scenario: Directory name link unchanged, Scenario: File name link unchanged

### Community 68 - "Requirement: Hover and focus visibility of actions"
Cohesion: 0.67
Nodes (3): Requirement: Router interaction compatibility, Scenario: Download bypasses SPA navigation, Scenario: Open performs SPA navigation

### Community 69 - "12. Confirmed Facts, Assumptions, and Unresolved Details"
Cohesion: 0.67
Nodes (3): 6. Data Flow Documentation Strategy, Representation, Verification

## Knowledge Gaps
- **780 isolated node(s):** `crypto`, `failedAttempts`, `fs`, `path`, `{ hashPassword }` (+775 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 837 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Design: Project Brain Documentation` connect `Deprecation and Migration` to `auth-service.js`, `12. Confirmed Facts, Assumptions, and Unresolved Details`, `login`, `Interview Me`, `Planning and Task Breakdown`, `ReOrder: Keep Your Regulars Ordering Direct`, `Secrets and Configuration`, `opsx-explore.md`, `Design: Project Brain Documentation`, `ADDED Requirements`, `Ideation Frameworks Reference`, `Tasks: Browse Files File Actions`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `serviceError()` connect `files-service.js` to `api-router.js`, `package.json`, `Deprecation and Migration`, `router.js`, `Secrets and Configuration`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `Deployment` connect `Decisions` to `files-service.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `handleRequest()` (e.g. with `API Reference` and `Extension Points`) actually correct?**
  _`handleRequest()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `serviceError()` (e.g. with `Error Response Format` and `Confirmed Facts (verified against source)`) actually correct?**
  _`serviceError()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `login()` (e.g. with `ResourceService` and ``POST /api/auth/login``) actually correct?**
  _`login()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `crypto`, `failedAttempts`, `fs` to the rest of the system?**
  _780 weakly-connected nodes found - possible documentation gaps or missing edges._