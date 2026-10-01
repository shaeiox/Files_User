# Tasks: Browse File Action Icon

Incremental delivery: each phase is independently verifiable, leaves the application working, and does not
implement any later phase's work. Phases 1-3 are **complete and verified**; Phases 2 and 3 passed their
validation. Phase 3.5 (the File Action ownership analysis) is complete. Phases 3.6, 4, and 5 are **not yet
started**.

## Pre-change state (already implemented before this plan)

Retained for history — do **not** redo:

- `assets/js/file-actions.js` — the dedicated FileActions module (IIFE, `render(item, d)`, flat `ACTIONS`
  array with `open` and `download`).
- `assets/css/browse.css` — the sixth grid track, `.f-actions` / `.f-action` rules, hover/focus-within
  reveal, `(hover: none)` fallback, and the narrow-mode third track.
- `assets/js/browse.js` — the `FileActions.render()` call as row child 6 and the empty `thead` sixth cell.
- `assets/js/i18n.js` — `btnOpen` / `btnDownload` in en and fa.
- `index.html` — the `file-actions.js` script tag before `browse.js` and `router.js`.
- `docs/ARCHITECTURE.md`, `docs/EXTENDING.md` — module table entries for `file-actions.js`.

**Validation status note (updated):** browser tooling turned out to be available (Chrome via CDP), so the
"browser tooling was unavailable" caveat recorded by the previous plan no longer applies. Part of the
manual browser checklist has since been executed outside this plan. That run **confirmed one defect** — the
list-view column misalignment described in `design.md` R16 — which falsified D5's layout-safety rationale
and blocked Phase 4 sign-off. R16 has since been **analysed (R16.1), fixed (R16.2), and documented**. Phase 4
is therefore unblocked.

**R16 provenance correction:** the misalignment was **pre-existing**, not introduced by this change. Measured
against the pre-Phase-2/3 baseline (`4a00bef`), rows carried exactly one action each and were mutually
aligned, while `thead` was 26px out from both. Phase 3's removal of the `open` action **relocated** the
mismatch from `thead`↔rows to directory↔file rows; magnitude and mechanism were unchanged. See `design.md`
R16p.

---

## Phase 1 — OpenSpec requirements and design reconciliation (foundation)

**Objective:** Reconcile the change's requirements, design, and proposal with the three confirmed product
requirements, so that no later phase has to invent behavior.

**Prerequisites:** None.

**Files/modules expected to change (planning artifacts only):**

- Edit `openspec/changes/browse-file-actions/proposal.md`
- Edit `openspec/changes/browse-file-actions/specs/file-actions/spec.md`
- Edit `openspec/changes/browse-file-actions/design.md`
- Edit `openspec/changes/browse-file-actions/tasks.md` (this file)

**Allowed scope:** OpenSpec artifacts only. No application source, CSS, HTML, i18n, router, service, or
backend edits. No tests. No commits.

**Tasks:**

- [x] 1.1 Verify the current Browse row structure from source (children 1-6, `linkAttr`, `svgIcon()`,
  `FileActions.render()` call site, grid template, `nth-child` rules, router interceptor, `data-file`
  contract) and record it as evidence in the proposal
- [x] 1.2 Replace the contradictory `Directory action rendering` requirement with `Directory items expose
  no dedicated File Action` (control absent; name link and icon both still navigate)
- [x] 1.3 Add the `Primary Browse icon is an additional navigation target` requirement — clickable icon,
  same target as the name link, name link independently clickable, no duplicate navigation, no nested
  interactive elements
- [x] 1.4 Preserve and amend the conflicting scenarios in `Independent action definitions` and
  `Action applicability derived from item data` so no scenario still promises a directory Open action
- [x] 1.5 Extend `Existing file-name link behavior preserved` with same-destination agreement, independent
  activation, and name-link semantics preservation
- [x] 1.6 Rewrite the click-isolation and propagation requirements so the **icon** is included, and remove
  the prescriptive `preventDefault`/`stopPropagation` language in favor of observable outcomes
- [x] 1.7 Extend `Accessible names for item targets` and `Keyboard operability with visible focus` to cover
  the interactive icon, including a distinguishable name, no redundant tab stop, and preserved name-link
  semantics
- [x] 1.8 Extend `Targets available in both view modes` and add `Row layout compatibility with the existing
  column structure` covering the `nth-child(3|4|5)` coupling, header alignment, and narrow-viewport
  behavior
- [x] 1.9 Extend `Router interaction compatibility` and `Item target URLs built only via ResourceService
  primitives` to cover the icon target and the mandatory `data-file` marker
- [x] 1.10 Update `design.md` with the revised architecture: the two target categories and their owners,
  decisions D1-D10 (icon target in BrowsePage, anchor nested inside `.f-icon`, two sibling anchors, icon
  label reuse, container-always-emitted, `open` definition deletion, no event cancellation, mandatory
  `data-file`, CSS scope, header/skeleton invariance), the superseded-decision table, the revised data and
  event flows, and the corrected risk register
- [x] 1.11 Update `proposal.md` with current vs. desired behavior, the rationale for both the icon target and
  the directory-action removal, the preservation list, and the revised impact table
- [x] 1.12 Record the validation debt above and restructure the remaining work into Phases 2-5
- [x] 1.13 Run `openspec validate browse-file-actions --strict` and record the result

**Expected files/modules:** the four OpenSpec artifacts listed above. No application module is touched.

**Validation:** `openspec validate "browse-file-actions" --strict` reports the change is valid; `git status`
shows only `openspec/changes/browse-file-actions/**` modified; `git diff --name-only` lists no file under
`assets/`, `lib/`, or `index.html`.

**Completion condition:** The spec contains no scenario that contradicts confirmed requirements 1-3; all
thirteen pre-existing requirements are either preserved or explicitly replaced with a recorded rationale;
the design names an owner for every touched concern; this task plan matches the revised requirements.

**Applicable Agent Skills:** `spec-driven-development` (requirement/scenario authoring), `planning-and-task-breakdown`
(phase slicing, per-phase verification and checkpoints), `code-review-and-quality` (challenge contradictions and
unnecessary scope), `doubt-driven-development` (adversarial pass over conflicts and hidden requirements),
`api-and-interface-design` (target/attribute contract with the router and ResourceService).

---

## Phase 2 — Browse primary icon target

**Objective:** Make the existing Browse icon an interactive target that reaches the same destination as the
item's existing name link, for directories and files, without changing anything else.

**Prerequisites:** Phase 1 complete. Design decisions D1-D4, D7, D8, D9 applied.

**Files/modules expected to change:**

- Edit `assets/js/browse.js` — `renderFilesList()` row template only
- Edit `assets/css/browse.css` — new `.f-icon-link` rules only

**Allowed scope:** The icon cell markup, the icon anchor's attributes, the icon SVG's accessibility
attribute, and browse-owned CSS for that anchor. Forbidden: touching `href` / `linkAttr` computation, the
name link, `svgIcon()`'s SVG paths, `fetchList()`, `bindEvents()`, filtering/sorting/searching/view-mode
logic, `file-actions.js`, `router.js`, `resource-service.js`, `i18n.js`, `index.html`, `home.css`, and any
`grid-template-columns` or `nth-child` rule.

**Tasks:**

- [x] 2.1 In `renderFilesList()`, place an anchor **inside** the existing `.f-icon` cell (do not add,
  remove, or reorder a row child), reusing the already-computed `href` and `linkAttr` strings so the icon
  target and the name link target cannot diverge
- [x] 2.2 Give the icon anchor an `aria-label` and `title` of the form `"{verb} {item name}"` using the
  existing `d.btnOpen` (directories) / `d.btnDownload` (files) keys with in-code English fallbacks, and
  escape the interpolated item name exactly as the rest of the row does
- [x] 2.3 Add `aria-hidden="true"` to the SVG emitted by `svgIcon()` so the anchor's accessible name comes
  from its own label; do not change the SVG paths, sizes, or stroke attributes
- [x] 2.4 Add `.f-icon-link` rules in `assets/css/browse.css`: fill the 32px cell (40px in grid mode),
  center the SVG, remove the default underline, inherit the icon's color, and provide hover/focus emphasis
  that changes color or opacity only — never size, position, background, or border — so nothing shifts
- [x] 2.5 Confirm the global `:focus-visible` outline (`base.css:256-259`) is not suppressed for the icon
  anchor; add no competing focus rule unless the outline proves invisible against the themed icon badge

**Expected files/modules:** `browse.js` (`renderFilesList()` row template — approximately +6 lines),
`browse.css` (approximately +10 lines). No other module.

**Validation:**

1. Directory row: clicking the icon navigates into the directory; the URL updates via `pushState`; there is
   no full document reload; breadcrumbs update.
2. File row: clicking the icon starts exactly one download. **Exercise a filename whose extension is not in
   the router denylist** (e.g. `disk.bin`) to prove `data-file` is present on the icon target — without it
   the router would `preventDefault()` and redirect to `/404.html` (`router.js:32-36`, `:124-126`).
3. Name link regression: directory name still navigates; file name still downloads; the `linkAttr`/`href`
   lines are unchanged in `git diff`.
4. Isolation: clicking the icon does not activate the name link; clicking the name does not activate the
   icon; clicking the row background does nothing.
5. Keyboard: Tab reaches the icon; Enter activates it; a visible focus indicator is drawn around the
   `.f-icon` box.
6. Accessible name: the icon target announces "Open el9" / "Download file.iso"; the name link still
   announces the item name; the SVG artwork is not announced.
7. Layout, list view: column count and alignment unchanged; type/modified/size truncation unchanged; `thead`
   still aligned.
8. Layout, grid view and ≤640px: icon renders at the correct size in the correct place; type/modified/size
   still hidden where expected.
9. No layout shift when hovering or focusing the icon.
10. `git diff --name-only` shows only `browse.js` and `browse.css`; `git diff assets/css/home.css` is empty;
    no `grid-template-columns` or `nth-child` line appears in the diff.

**Completion condition:** The icon is a real interactive target reaching the same destination as the name
link, in both item types and both view modes, with an accessible name, keyboard operation, visible focus,
no duplicate navigation, and zero layout or diff impact outside `browse.js` and `browse.css`.

**Intermediate state accepted:** after this phase a directory row has both the clickable icon and the
existing Open File Action — temporarily redundant. Phase 3 removes the redundant control. This phase must
not touch `file-actions.js`.

**Applicable Agent Skills:** `incremental-implementation` (single thin slice, verifiable on its own),
`frontend-ui-engineering` (WCAG 2.1 AA — keyboard operability, ARIA labeling, focus management; the
project has no dedicated accessibility skill, so this is the authoritative one), `api-and-interface-design`
(the `data-file` / router target contract), `code-review-and-quality` (dead code, diff-size and dependency
discipline).

---

## Phase 3 — Directory File Action removal and layout verification

**Objective:** Remove the redundant Open File Action from directory rows while keeping the file Download
action, and prove the row layout is unaffected.

**Prerequisites:** Phase 2 complete and verified.

**Files/modules expected to change:**

- Edit `assets/js/file-actions.js` — remove the `open` action definition
- Edit `assets/css/browse.css` — **only** if Phase 3's layout verification reveals a concrete defect

**Allowed scope:** The `open` entry in the module's `ACTIONS` array (its `id`, `appliesTo`, `render`, and
now-unused SVG path). Forbidden: changing `render()`'s contract (it must keep returning the `.f-actions`
container for every item), changing the `download` definition, moving applicability logic into `browse.js`,
adding a new i18n key, and any router/service/backend edit. Any change to `browse.js` requires re-opening
the design.

**Tasks:**

- [x] 3.1 Delete the `open` action definition from `ACTIONS` in `file-actions.js`; leave `download`,
  `render()`, `escapeHtml()`, and the public API surface exactly as they are
- [x] 3.2 Confirm `render()` still emits `<div class="f-actions"></div>` for directory items so BrowsePage
  stays a single unconditional call site and the row keeps a uniform child count
- [x] 3.3 Verify no `grid-template-columns`, `nth-child`, `.f-actions` visibility, or `thead` change is
  required; make a CSS edit only if a concrete layout defect is observed, and scope-box it
- [x] 3.4 Confirm `btnOpen` is still used (as the directory icon's action label from Phase 2) so no i18n key
  is orphaned, and that `i18n.js` needs no edit
- [x] 3.5 Confirm the Open SVG path in the module is gone and no other reference to the removed action
  remains anywhere in `assets/`

**Expected files/modules:** `file-actions.js` (one deletion, approximately −10 lines). `browse.css` only on
a demonstrated defect.

**Validation:**

1. Directory row: the File Actions area contains no control.
2. Directory row: the name link still navigates and the icon still navigates — to the same destination.
3. File row: the Download File Action is present, with the same target, attributes, and single-download
   behavior as before this change.
4. List view: no wrap to a second implicit row, no horizontal overflow, columns aligned with `thead`.
5. Grid view: directory cards show icon + name only; file cards show icon + name + Download.
6. ≤640px: icon, name, and any file Download control stay on one row; type/modified/size remain hidden.
7. `git diff --name-only` shows only `file-actions.js` (plus `browse.css` if 3.3 required it); no
   `grid-template-columns` or `nth-child` line changed unless it was the demonstrated fix.
8. `git diff` confirms `browse.js` is untouched in this phase.

**Completion condition:** Directory rows carry no dedicated File Action, file rows keep theirs unchanged,
directory navigation is fully available via name and icon, and the row layout is demonstrably unchanged in
list, grid, and narrow modes.

**Applicable Agent Skills:** `incremental-implementation` (deletion-only slice), `code-simplification`
(remove dead code rather than suppress it), `code-review-and-quality` (dead-code hygiene and diff
discipline), `frontend-ui-engineering` (grid/layout regression reasoning), `doubt-driven-development`
(adversarial check that no directory navigation path was lost).

---

## Phase 3.5 — File Action logic consolidation: analysis & OpenSpec (COMPLETE)

**Objective:** Determine, from actual usage and behavior rather than assumption, which Action-specific logic
is owned by `assets/js/file-actions.js` and which (if any) is missing and currently lives in
`assets/js/browse.js`; then codify the resulting ownership boundary in the OpenSpec artifacts.

**Prerequisites:** Phases 1-3 complete and verified.

**Files/modules expected to change (planning artifacts only):**

- Edit `openspec/changes/browse-file-actions/proposal.md`
- Edit `openspec/changes/browse-file-actions/specs/file-actions/spec.md`
- Edit `openspec/changes/browse-file-actions/design.md`
- Edit `openspec/changes/browse-file-actions/tasks.md` (this file)

**Allowed scope:** OpenSpec artifacts only. **No** JavaScript, CSS, HTML, router, `ResourceService`, i18n,
documentation outside this change, backend, or commit.

**Tasks:**

- [x] 3.5.1 Inventory `file-actions.js` by full read: action definitions, action-specific functions/helpers,
  label generation, URL generation, icon/SVG generation, applicability, rendering, and
  escaping/formatting — classifying each as already owned, missing, or shared/general-purpose
- [x] 3.5.2 Inventory `browse.js` for every action-related function, inline expression, attribute, a11y
  string, and event behavior, explicitly excluding the primary Browse icon/name target from File Action
  classification
- [x] 3.5.3 Document the BrowsePage → FileActions → ResourceService → i18n boundaries, the
  Router → generated-anchor contract, and the data passed into `FileActions.render()`; check for circular
  dependencies, duplicated URL construction, duplicated labels, duplicated SVG, and unnecessary abstractions
- [x] 3.5.4 Run focused Graphify queries (FileActions render/action relationships; BrowsePage action call
  paths; ResourceService URL relationships; helpers used by both modules) and classify every result
  EXTRACTED / INFERRED / AMBIGUOUS; do not design around unresolved relationships
- [x] 3.5.5 Decide, per candidate helper, the target owner and whether a move is required; do not move
  generic Browse helpers merely because FileActions uses similar functionality
- [x] 3.5.6 Add the `Complete File Action ownership` requirement to the spec, explicitly excluding the
  primary icon/name target and generic shared helpers, and preserving every existing behavior requirement
- [x] 3.5.7 Add `design.md` D11 with the verified ownership inventory, the rejected alternatives, and the
  boundary data flow; add risks R15 (boundary drift), R16 (the confirmed layout defect), R17 (stale
  citations / stale graph cache)
- [x] 3.5.8 Update `proposal.md` ownership and impact wording, re-verify the source line citations in the
  evidence list, and record the consolidation non-goals
- [x] 3.5.9 Insert Phase 3.6 before Phase 4 without renumbering Phases 4 or 5
- [x] 3.5.10 Run `openspec validate browse-file-actions --strict` and inspect `git diff`; confirm zero
  application-source changes

**Outcome:** the analysis found that FileActions already owns **every** File Action concern and that **no**
Action-specific helper remains in `browse.js`, so no code movement is warranted. The deliverable is the
now-testable ownership invariant, not a refactor.

---

## Phase 3.6 — File Action ownership consolidation (enforcement)

**Objective:** Make the confirmed ownership boundary mechanically verifiable and regression-proof, so that
future changes cannot silently re-create a split architecture (definitions in `file-actions.js`, Action
helpers in `browse.js`). **No code movement is expected** — Phase 3.5 confirmed zero Action-specific logic
in `browse.js` (see `design.md` D11). This phase produces an auditable boundary, not a refactor.

**Prerequisites:** Phase 3.5 complete; `openspec validate browse-file-actions --strict` passing.

**Files/modules expected to change:**

- Edit `assets/js/file-actions.js` — **module docblock only** (state the ownership boundary and the
  two explicit exclusions so the invariant is discoverable from the code, not only from the spec)
- Optionally add a non-shipped boundary-audit script **outside** the served asset tree (e.g.
  `tools/audit-file-actions-boundary.js`), or run the equivalent checks ad hoc if adding a tooling file is
  judged out of step with project conventions

**Allowed scope:** The `file-actions.js` header comment; an optional audit script; this phase's OpenSpec
task checkboxes. **Forbidden:** any change to `ACTIONS`, `render()`, the `download` definition, action
markup, action labels, action URLs, or action SVG; any change to `browse.js` (the primary icon/name target
and its label stay exactly where they are); any relocation of `escapeHtml` or any other generic helper; any
`router.js` / `resource-service.js` / `i18n.js` / CSS / HTML / backend edit; any commit.

**Explicitly forbidden:** performing any **Phase 4** work. No browser validation, no requirement walk, no
accessibility or regression pass, and — in particular — **no fix for the `design.md` R16 list-view
misalignment**. R16 is a design decision reserved for the maintainer; this phase must not select one.

**Tasks:**

- [x] 3.6.1 Update the `file-actions.js` module docblock to enumerate what the module owns (definitions,
  action-specific helpers, labels, URLs via `ResourceService`, icon/SVG, applicability, rendering,
  action-specific attributes and a11y) and the two exclusions (the primary Browse icon/name target, and
  generic shared helpers)
- [x] 3.6.2 Boundary audit — assert each of the following holds, recording PASS/FAIL per item:
  - `FileActions.render` has exactly one call site repo-wide (`browse.js:382`)
  - every `.f-action` element in `assets/` is emitted from `file-actions.js`
  - no `d.btnDownload` / `d.btnOpen` action-label composition exists outside `file-actions.js` other than
    the primary icon's label in `browse.js` (`browse.js:373-374`), which is BrowsePage-owned
  - no `"/api/download/"` or `"/browse/"` literal assembly exists for item targets outside
    `resource-service.js`
  - no action-specific SVG path markup exists in `browse.js`
  - `browse.js` does not branch on `item.type` to decide **which actions** to render (only for the primary
    target)
- [x] 3.6.3 Confirm the duplicate `escapeHtml` is left in place in both modules and that this is recorded as
  accepted, not as a defect to fix
- [x] 3.6.4 Confirm no behavioral change: directory rows still have no dedicated File Action, file rows still
  have exactly one Download, the icon/name targets are unchanged, and `Router`/`ResourceService` are
  untouched
- [x] 3.6.5 Re-run `openspec validate browse-file-actions --strict` and `git diff`; confirm the only
  application-source change is the `file-actions.js` docblock (comments only) or nothing at all

**Validation:**

1. `git diff --name-only` lists only `file-actions.js` (docblock), the optional audit script, and the
   OpenSpec artifacts. `git diff --stat` shows no added/removed code lines in `file-actions.js`.
2. Boundary audit items in task 3.6.2 are all PASS.
3. `node --check assets/js/file-actions.js` passes.
4. `openspec validate browse-file-actions --strict` reports valid.
5. Runtime spot-check in the browser: a directory row still renders no action control, a file row still
   renders exactly one Download action with a working `href`, and directory/file icon and name targets still
   navigate/download as before.

**Completion condition:** the ownership boundary is documented in the module header, mechanically checkable
via the audit checklist, and recorded as satisfied with zero code movement. No behavior changes.

**Note on R16 (historical):** this phase deliberately left the then-unresolved list-view misalignment open and
forbade selecting a fix. That constraint held at the time and was correct. R16 was subsequently analysed
(R16.1), resolved in R16.2 (`design.md` D11a), and documented in R16.3 — so the note above is now superseded
and Phase 4 is no longer blocked by it.

**Applicable Agent Skills:** `api-and-interface-design` (module boundary and public surface contract),
`code-simplification` (refuse to introduce an abstraction for its own sake), `code-review-and-quality`
(ownership/diff discipline), `doubt-driven-development` (adversarial check that the "nothing to move" finding
is real and not an oversight), `spec-driven-development` (invariant phrasing and greppable scenarios).

---

## R16.1 — List layout misalignment: analysis & architecture decision (COMPLETE)

**Objective:** Independently reproduce and measure the reported ~26px list-view misalignment, establish the
causal mechanism, compare candidate fixes against browser evidence, and select exactly one approach.
**Analysis only — no source, CSS, JS, or OpenSpec modification.**

**Outcome:** root cause confirmed as the `auto` sixth track being content-derived *per row* (each `.trow` is
an independent grid container) with the single flexible `1fr` name track absorbing the difference and
displacing the fixed columns 3-5. Provenance established as **pre-existing** (relocated, not introduced).
Four options compared; **B — a fixed action track sized to `.f-action`'s own 26px, applied to both
declarations — selected on measured evidence.** Recorded in `design.md` D11a, D9, R16, R16p, R18, R19.

## R16.2 — List layout alignment fix (COMPLETE)

**Objective:** make the action track content-independent, preserving the six-column structure and all JS
behavior, with zero behavioral change elsewhere. **CSS-only** — `assets/css/browse.css` and nothing else.

**Applied:** the action track pinned to `26px` in both `grid-template-columns` declarations (list and
≤640px), with inline maintenance comments recording the coupling to `.f-action { width: 26px }`.

**Validation:** `git diff --check` clean; static verifier 13/13; Chrome/CDP measurement confirmed `thead`,
directory rows, and file rows resolve identical geometry at 1440/1024/641/640/375/320px and in `fa` RTL with
all three pairwise column-offset differences equal to `[0,0,0,0,0,0]`; grid mode unchanged (cards 184×160);
second-action probe documented (columns stay aligned, actions squash — R18); the ~20px `.nav-actions`
overflow at ≤320px and the `.thead`-visible-in-grid-mode observation were A/B-confirmed as **pre-existing
non-regressions**. Only `browse.css` differs from the Phase 3.6 baseline.

## R16.3 — OpenSpec documentation/design synchronization (COMPLETE)

**Objective:** bring `design.md`, `proposal.md`, and `tasks.md` back in line with the implemented and
measured behavior. **Documentation only — no implementation change.** `specs/file-actions/spec.md` required
no edit: its requirements already demanded correct column alignment and were being violated, so the fix
satisfies them as written.

**Applied — round 1 (pre-incident):** `design.md` — D5's "layout-safe" rationale corrected and the
five-child-skeleton "proof" withdrawn; D9 retitled and rewritten to authorise the pinned track with the full
option comparison; new D11a recording the decision; §Validation item 9 extended to assert zero offsets across
all three row types at all required viewports and to exercise both declarations; R16 closed; R16p provenance
correction added; R18 (squashing trade-off) and R19 (reserved width on directory rows) added; CSS-ownership
and change-sizing tables updated. `proposal.md` — `browse.css` impact row and the layout-preservation bullet
corrected.

**Applied — round 2 (after the R16.3-R line-structure recovery):** the same stale rationale survived in the
**R3** risk-table row, which still presented the five-child skeleton as proof that a row renders *and*
aligns correctly; R3 now separates **render structure** (which the skeleton child count does evidence) from
**cross-row column alignment** (which it does not), and cites D5/D9/D11a instead of the withdrawn proof. The
recovery had also left a **duplicate `R17` row**; the stray copy was removed, leaving the intended ordering
**R17 → R18 → R19**. R18 was completed with the two statements it was still missing: that it is a **future
extension constraint rather than a current defect**, and that **no current-scope implementation change is
required or implied**.

**R16 status: RESOLVED** (fixed in R16.2, documented here; see `design.md` R16 and R16p for provenance).

**R18 status: documented future risk — NOT a current implementation task.** It is recorded in `design.md`
only, as a constraint on whoever next widens the File Action set. No task in this plan implements it, and
none should be created for it in this scope.

---

## Phase 4 — Integration, regression, and accessibility verification

**Objective:** Verify the combined result against every requirement and scenario in
`specs/file-actions/spec.md`, including the browser checklist that the previous plan left unrun.

**Prerequisites:** Phases 2, 3, 3.6, R16.1, and R16.2 complete and individually verified.

**Status: UNBLOCKED.** R16 was resolved in R16.2 (`design.md` D11a) and documented in R16.3; no blocking
defect remains ahead of this phase. Phase 4 must still **re-verify** the layout scenarios rather than assume
R16.2's measurements (§Validation item 9), and must now also carry the R18/R19 consequences of the pinned
track in its report.

**Files/modules expected to change:** None. Defect fixes only, and only inside files owned by Phases 2-3
(`browse.js` row template lines, `browse.css` `.f-icon-link` rules, `file-actions.js`). Any fix requiring
another file must re-open the design first.

**Allowed scope:** Verification and in-place defect fixes within owned lines. No refactors, no new features,
no new modules, no new i18n keys.

**Tasks:**

- [ ] 4.1 Walk every requirement in `specs/file-actions/spec.md` and record pass/fail per scenario with the
  evidence used (browser observation, DOM inspection, or diff)
- [ ] 4.2 Run the full manual browser checklist from `design.md` §Validation — items 1-18 — including the
  items the previous plan never ran: touch / `(hover: none)` emulation, `data-perf="low"` and
  `data-perf="potato"`, auth-enabled download, dark theme, RTL with fa labels, the en↔fa language toggle,
  and the non-row states (skeleton, empty, 401, 404)
- [ ] 4.3 Keyboard and assistive-technology pass: tab order icon → name → File Action in both view modes,
  each stop appearing exactly once, visible focus on all three targets, Enter activation, and the icon
  target's accessible name being distinguishable from the name link's
- [ ] 4.4 Isolation pass: exercise all three targets on both a directory row and a file row and confirm
  exactly one navigation or download each time, with no cross-activation and no row-level behavior
- [ ] 4.5 `data-file` regression: confirm a file whose extension is outside the router denylist (e.g.
  `disk.bin`) downloads from **both** the icon target and the name link, and does not land on `/404.html`
- [ ] 4.6 Language pass: switch en↔fa and confirm the icon target's action label, the Download action's
  label, and all existing row labels re-render correctly; record the Persian `btnOpen` wording for
  maintainer review
- [ ] 4.7 Diff audit: `git diff` confirms no changes to `router.js`, `resource-service.js`, `i18n.js`,
  `index.html`, `home.css`, `components.css`, `base.css`, `performance-modes.css`, `package.json`, or
  backend `lib/*`; and that the `href` / `linkAttr` lines in `browse.js` are untouched
- [ ] 4.8 Console check: no errors or warnings introduced on the Browse page

**Expected files/modules:** none (verification only). Owned-line fixes in `browse.js`, `browse.css`, or
`file-actions.js` only if a defect is found.

**Validation:** This phase *is* the validation. No framework is introduced (`docs/DEVELOPMENT.md`: no test
suite). Every item must be recorded as PASS, FAIL, or NOT RUN — an unrecorded item is not a pass.

**Completion condition:** Every scenario in `specs/file-actions/spec.md` has recorded evidence; the
`design.md` §Validation checklist items 1-18 are all PASS (no NOT RUN remaining); the diff audit is clean;
no open defects.

**Applicable Agent Skills:** `browser-testing-with-devtools` (real-browser DOM, console, and interaction
verification), `code-review-and-quality` (five-axis review of the complete diff), `doubt-driven-development`
(adversarial pass hunting for lost navigation paths, duplicate navigation, orphaned markup, and regressions
the happy path hides), `frontend-ui-engineering` (WCAG 2.1 AA verification), `debugging-and-error-recovery`
(root-cause any failure before fixing).

---

## Phase 5 — Documentation alignment

**Objective:** Bring the project documentation in line with the final behavior, per the repository's own
maintenance convention.

**Prerequisites:** Phase 4 passing — document what was actually verified, not what was intended.

**Files/modules expected to change:**

- Edit `docs/ARCHITECTURE.md`
- Edit `docs/EXTENDING.md`

**Allowed scope:** Only statements made stale by this change. Known stale statements: the
`file-actions.js` module-table description ("Browse row actions: Open/Download"), the ownership of the
`btnOpen` label (it moves from `FileActions` to `BrowsePage` for the icon target), and any diagram or
prose that implies directories receive a dedicated Open action. No documentation rewrites, no new pages,
and no module-table churn beyond these lines (the module itself is neither added nor removed).

**Tasks:**

- [ ] 5.1 Update the `file-actions.js` row in the `docs/ARCHITECTURE.md` frontend module table so it
  describes the file-only Download action rather than "Open/Download"
- [ ] 5.2 Update the FileActions section in `docs/ARCHITECTURE.md` to state that directory rows receive no
  dedicated File Action, that the Browse icon is a BrowsePage-owned primary target for the same destination
  as the name link, and that the `btnOpen` label is produced by `BrowsePage`
- [ ] 5.3 Update the corresponding lines in `docs/EXTENDING.md` so extension guidance reflects that the
  module owns dedicated File Actions only and that primary item navigation stays with the Browse Page
- [ ] 5.4 Search `docs/` for any remaining statement that directories receive an Open action, a Download
  action, or that action applicability covers both item types; correct or remove each

**Expected files/modules:** `docs/ARCHITECTURE.md`, `docs/EXTENDING.md`. No code, CSS, or config.

**Validation:** `grep`/search over `docs/` returns no statement contradicting
`specs/file-actions/spec.md`; module names, file paths, and script-load order in the docs still match
`index.html` and the actual source; no documentation content outside the stale lines above was changed.

**Completion condition:** Project documentation matches the implemented and verified behavior, and the
change introduces no documentation debt.

**Applicable Agent Skills:** `documentation-and-adrs` (record the decision and its rationale where future
readers need it), `code-review-and-quality` (change-sizing discipline — edits only where stale), `using-agent-skills`
(convention check before writing).

---

## Phase boundaries at a glance

| Phase | Owns | Must not touch | Leaves app |
|---|---|---|---|
| 1 — OpenSpec reconciliation | `openspec/changes/browse-file-actions/**` | everything else | working (no code change) |
| 2 — Primary icon target | `browse.js` row template, `browse.css` `.f-icon-link` | `file-actions.js`, `linkAttr`, `router.js`, services, track/`nth-child` rules | working (directory Open action still present, temporarily redundant) |
| 3 — Directory action removal | `file-actions.js` (`open` deletion) | `browse.js`, `render()` contract, `download`, i18n | working (full target of the change reached) |
| 3.5 — Ownership analysis (complete) | `openspec/changes/browse-file-actions/**` | all application source | working (no code change) |
| 3.6 — Ownership enforcement | `file-actions.js` docblock, optional audit script | `ACTIONS`, `render()`, `download`, `browse.js`, generic helpers, and **all Phase 4 work** incl. the R16 layout fix | working (no behavior change) |
| R16.1 — Misalignment analysis | nothing (analysis only) | everything | unchanged (no code change) |
| R16.2 — Alignment fix | `assets/css/browse.css` (action track value only) | all JS, `spec.md`, track count/order, `nth-child` | working (columns aligned) |
| R16.3 — Doc/design sync | `design.md`, `proposal.md`, `tasks.md` | `spec.md`, all code, docs outside this change | working (no code change) |
| 4 — Verification | nothing (owned-line fixes only) | any other file | verified |
| 5 — Documentation | `docs/ARCHITECTURE.md`, `docs/EXTENDING.md` | all code | working |
