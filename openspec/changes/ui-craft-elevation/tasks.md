# Tasks

## 0. Preflight

- [ ] 0.1 Confirm `enterprise-ui-redesign` and `a11y-ux-debt` are archived, or amend their freeze gates (D8/I21, J5, J6) to permit the hero change; verify neither will fail their hard gates while this change is applied
- [ ] 0.2 Re-measure the hero headline and both focus-ring colours against every surface in `tokens.css` comments, in both themes, and record the measured figures; verify the recorded numbers match what the comments currently claim
- [ ] 0.3 Capture the current accent colour at the hero, navbar, primary call to action, card grid, and footer in both themes; verify the sample set confirms the reported split rather than assuming it

## 1. Phase 0 - correctness defects

- [ ] 1.1 Move the resource description assignment inside the render callback in `home.js` so each card resolves its own value, and verify two cards no longer render identical description text
- [ ] 1.2 Route the download-interceptor failure message through the active language's dictionary and replace the native `alert()` with the portal's in-place error surface; verify an English-locale failure renders in English with no browser dialog raised
- [ ] 1.3 Correct the footer copyright phrasing and unify the legal string, entity name, and year across every footer-rendering route; verify both routes report the current year and one entity name
- [ ] 1.4 Define the undefined token referenced by the home error state, or remove the reference; verify the error state draws a visible boundary in both themes
- [ ] 1.5 Add a script range declaration to each Arabic-script font face so a non-Persian visitor does not fetch them; verify an English-locale load requests no Arabic-script face and no glyph falls back to a browser default
- [ ] 1.6 Add the deferred attribute to the one script that loads without it, and verify the page's first render is no longer gated on that script
- [ ] 1.7 Remove the duplicated navigation function nested inside the router's navigation function; verify exactly one declaration of it remains and every route still resolves
- [ ] 1.8 Delete the unrouted secondary HTML entry point after confirming against the architecture document that no deployment serves it; verify no route or link referenced it
- [ ] 1.9 Remove the decorative status dot and its glow from the hero label; verify the label reads without it and no decorative dot remains on the home route
- [ ] 1.10 Update the documentation's stylesheet line counts and correct its font-loading claim to match the implementation; verify every stated figure matches the file as it now exists
- [ ] 1.11 Run the project's lint, typecheck, and test commands; verify all three pass

## 2. Phase 1 - identity

- [ ] 2.1 Delete the hero token-insulation block and confirm every token it pinned now resolves to its single theme-level value across the hero and the page below it
- [ ] 2.2 Re-point the hero gradient and its background layers into the accent family declared by the token contract, removing the multi-stop ramp across the headline word; verify the hero renders in the declared accent roles only
- [ ] 2.3 Collapse the two focus-ring tokens so every focusable control renders the same ring colour; verify by tabbing through link, button, and navbar control in both themes that no ring colour changes
- [ ] 2.4 Remove the negative tracking and sub-one leading from the hero display face and replace them with values suited to its construction; verify the headline reads as that face rather than as a generic sans, in both themes and in Persian
- [ ] 2.5 Re-scope the inspector's accent token to one of the declared accent or semantic roles and remove it as an accent in its own right; verify the inspector introduces no hue found nowhere else, and re-measure its contrast on every surface it sits on
- [ ] 2.6 Remove the duplicated accent ramp whose resolution changes silently by theme; verify every consumer of those token names resolves to the same value in both themes
- [ ] 2.7 Remove the redundant height declarations where two stylesheets each claim ownership of one control; verify each control's height is declared once and still renders at its intended size
- [ ] 2.8 Remove the dead keyframe, the rules targeting a nonexistent element, and the rules overriding an animation that was never written; verify a search for each identifier returns no result
- [ ] 2.9 Update every measured contrast ratio quoted in the token layer to the value now present; verify each quoted figure is reproducible from the token it documents
- [ ] 2.10 Update the style guide's frozen-regions list to remove the hero freeze and record the token-contract rule it previously broke; verify the document matches the code as it now stands
- [ ] 2.11 Verify the accent identity end to end: sample the accent at the hero, navbar, call to action, card grid, and footer in both themes and confirm every sample matches

## 3. Phase 2 - motion

- [ ] 3.1 Replace every blanket transition shorthand with an explicit list of the properties that rule actually changes; verify no blanket transition shorthand remains and that no rule animates a layout property
- [ ] 3.2 Add the reduced-motion obligation and the lowest-tier override for each new effect introduced in this phase, in the same change as the effect; verify each effect is absent or substituted at the lowest tier and under a reduced-motion preference
- [ ] 3.3 Implement section-entry reveal driven by an observer that disconnects on route teardown; verify each section reveals once on entry, never re-animates on return, and is fully present with no offset under reduced motion and at the lowest tier
- [ ] 3.4 Implement position continuity for filter and sort changes so surviving cards animate from their old position to the new one; verify the same card elements persist through a sort and a filter, and that the effect is gated to the upper tiers
- [ ] 3.5 Replace the grid/list toggle's inline style assignment with a cross-fade that shrinks the outgoing cards before the layout changes and fades in the incoming cards; verify the transition is visible on toggle and the control is operable at once when reduced motion is requested
- [ ] 3.6 Replace the router's fixed-duration transition with the native transition primitive keyed to render completion, feature-detected, falling back to the current fade; verify the incoming view never fades in while empty on a slow render, and that navigation still succeeds where the primitive is unavailable
- [ ] 3.7 Remove the transition the router applies imperatively once each navigation completes; verify after several navigations that it does not persist on the element from the first one onward
- [ ] 3.8 Add the hero entrance cascade using style-only delays over the compositor properties, with no effect on first paint of the headline itself; verify the hero's largest text is not delayed and the cascade order reads top to bottom
- [ ] 3.9 Make the search results panel reveal on every search rather than only the first, and stagger the rows with the reveal capped so total time stays bounded on a large result set; verify a second and third search each animate, and that the cap holds at the maximum result count
- [ ] 3.10 Implement nav condense driven by the smooth-scroll library's own scroll event rather than a raw window scroll listener; verify the nav condenses past the threshold, restores above it, and that no raw scroll event listener is registered anywhere
- [ ] 3.11 Implement the theme change as a legible transition and remove the documentation and rules describing the transition that was never written; verify a search for the removed mechanism returns nothing and the theme change animates within roughly half a second
- [ ] 3.12 Update the motion documentation to record the techniques permitted, the reduced-motion obligation, and the lowest-tier obligation as a checklist item for future work

## 4. Phase 3 - composition

- [ ] 4.1 Reduce the page container's maximum width so the hero's text and visual no longer sit at opposite ends of an empty canvas; verify at 1440px and above that no empty band wider than roughly a third of the hero separates them
- [ ] 4.2 Confirm the hero's visual enters normal flow below 1024px without any absolute positioning, and verify no viewport from 360px to 1920px produces clipping or horizontal overflow
- [ ] 4.3 Add the featured-resource band ahead of the uniform grid, driven by real data rather than a hard-coded index; verify the featured entry is first in reading order and occupies a visibly wider cell
- [ ] 4.4 Tier the resource grid so it carries internal rhythm across at least two distinct cell treatments; verify a list of more than three entries renders at least two different cell treatments, and that the mobile single-column collapse still applies below the grid's narrow breakpoint
- [ ] 4.5 Give the page a closing band carrying a real trust signal below the last section; verify it sits below the content rather than inside the hero, and that it renders correctly in both themes and both directions
- [ ] 4.6 Verify the home route at 360px, 480px, 768px, 900px, 1024px, and 1440px in both themes and both directions, with no horizontal overflow, clipping, or overlap

## 5. Phase 4 - payload

- [ ] 5.1 Convert the router's bare-identifier references to the route modules into explicit handles, and resolve the load-order dependency between the home module and the file-actions module; verify every route still renders after the conversion, with no bare global relied upon
- [ ] 5.2 Convert the route modules to deferred loading so each is fetched when its route is entered rather than on first paint; verify a cold load of the home route requests no browse-only, release-only, or inspector-only module
- [ ] 5.3 Load the browse-only and release-only stylesheets with their routes rather than on every page; verify a cold load of the home route requests neither, and that each still applies on first navigation to its own route
- [ ] 5.4 Preload the two font faces required by the hero so the largest text does not reflow on load; verify no font-swap reflow occurs on the hero headline
- [ ] 5.5 Change the pre-paint performance tier default to the unstyled baseline so auto-detection can only reduce cost and never upgrades after first paint; verify no post-paint change to the background layers' blur or opacity
- [ ] 5.6 Measure the first-render byte weight on each route and record it; verify each route's first render is a strict subset of the full application

## 6. Phase 5 - accessibility and shell closure

- [ ] 6.1 Move the performance tier control out of the navbar's primary destination group into the footer, keeping the manual override and auto-detection as the default; verify the navbar's primary group carries only the primary destinations and the footer control is labelled as a performance setting
- [ ] 6.2 Bring the language menu onto the same script-toggled mechanism as the other navbar dropdowns, preserving the continuous hit region across the gap between trigger and menu; verify the menu opens and stays open for touch and keyboard, and that a pointer crossing the gap does not dismiss it
- [ ] 6.3 Drive each dropdown's expanded state from real state rather than a fixed value; verify the reported state matches what is visible on screen in both the open and closed cases
- [ ] 6.4 Give the sign-in dialog its dialog semantics, an accessible name, a focus trap, Escape-to-close, and focus restoration to the triggering control; verify assistive technology is informed the dialog opened, focus is inside it and cannot tab out, Escape closes it, and focus returns to the trigger
- [ ] 6.5 Ensure focus is not placed inside the dialog before it is interactive; verify opening the dialog leaves focus on a field the visitor can actually type into
- [ ] 6.6 Rewrite the footer's company description as coherent prose and verify every factual claim in it against a source the company controls
- [ ] 6.7 Replace the blocking dialog in the download path with the portal's in-place error surface and an in-progress state on the initiating control; verify a failure renders in the active language, the control returns to its resting state so it can be retried, and no browser dialog is raised
- [ ] 6.8 Verify every shell control carries an accessible name that follows the active language; verify no control retains an English-only name intended to translate when the language is switched
- [ ] 6.9 Verify the whole portal against the project's accessibility verification script in both themes, both directions, and at every recorded breakpoint; verify it reports no violation introduced by this change

## 7. Integration

- [ ] 7.1 Run the full test, lint, typecheck, and coverage commands; verify all pass with coverage at or above the project's configured threshold
- [ ] 7.2 Verify every route renders and navigates correctly after all six phases, in both themes and both directions; verify no console error is raised on any route
- [ ] 7.3 Verify the documented motion checklist holds for every animation in the portal, including those not introduced by this change; verify no animation is missing a reduced-motion branch or a lowest-tier override
- [ ] 7.4 Verify the final accent, focus-ring, and contrast behaviour matches the figures recorded in the preflight; verify the documentation states what the implementation now does

## Workflow follow-up

- Archive the change once the integration group passes and the project's review requirements are satisfied.
- On archive, confirm the newly created capability specs are written to the main spec set and that the `browse-page` and `file-inspector` deltas merged cleanly.
- Consider splitting the six phases into independent changes if independent review or independent rollback is required; the spec capabilities are already drawn along those seams.
- Revisit the reduced-motion global override separately. It currently collapses every animation via a blanket rule, which will silently kill any future functional animation.
- Revisit the sign-in dialog's adoption of the native dialog element. It was deferred here only because the existing close-delay contract is out of scope.