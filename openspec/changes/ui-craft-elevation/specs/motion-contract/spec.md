# Spec Delta

## Purpose

Defines the rules every animated surface in the portal obeys: which properties may animate, which
techniques are permitted, and the obligations each animation carries toward visitors who prefer
reduced motion and toward devices on a lower performance tier.

## ADDED Requirements

### Requirement: Animations animate only compositor properties

An animation or transition SHALL animate only `transform` and `opacity`. Layout-affecting properties
SHALL NOT be animated, and a blanket transition shorthand covering all properties SHALL NOT be used.

#### Scenario: A transition shorthand is declared

- **GIVEN** a stylesheet declares a transition using a blanket property keyword
- **WHEN** it is inspected
- **THEN** it is rejected, because it would animate layout properties on future changes
- **AND** an explicit list of animatable properties is declared instead

#### Scenario: An animation is authored

- **GIVEN** a new animation is added
- **WHEN** its keyframes are inspected
- **THEN** only `transform` and `opacity` vary
- **AND** no width, height, top, or left is animated

### Requirement: Scroll position is never read from a scroll event handler

Scroll-linked behaviour SHALL be driven by an observer, a smooth-scroll library's own scroll event, or
a CSS scroll-driven animation. A raw scroll event listener that drives rendering SHALL NOT be used.

#### Scenario: A scroll-linked effect is authored

- **GIVEN** a new effect depends on how far the visitor has scrolled
- **WHEN** its implementation is reviewed
- **THEN** it uses an observer, a scroll-driven animation timeline, or the smooth-scroll library's
  own event
- **AND** it registers no raw scroll event listener

### Requirement: Every animation carries a reduced-motion branch

Every animation SHALL declare how it behaves when the visitor prefers reduced motion, in the same
change that introduces it. The reduced-motion behaviour SHALL be a state the content remains usable
in, not merely a faster version of the same movement.

#### Scenario: An animation is introduced

- **GIVEN** a new animation is added to any stylesheet or script
- **WHEN** the change is reviewed
- **THEN** the same change declares its reduced-motion behaviour
- **AND** under reduced motion the affected content is present and operable

#### Scenario: A visitor prefers reduced motion

- **GIVEN** the operating system reports a reduced-motion preference at any point during the session
- **WHEN** a preference change is detected
- **THEN** animation-driven behaviour updates without a reload
- **AND** script-driven animation is torn down as well as CSS-driven animation

### Requirement: Every expensive effect carries a performance-tier override

Every effect whose cost scales with the device SHALL declare how it degrades at each performance tier,
including the lowest tier, in the same change that introduces it.

#### Scenario: An expensive effect is introduced

- **GIVEN** a new effect uses blur, backdrop sampling, a filter, a shadow, or an infinite animation
- **WHEN** the change is reviewed
- **THEN** the same change declares its behaviour at the lowest performance tier
- **AND** the lowest tier's override disables or substitutes the effect

#### Scenario: A visitor is on the lowest tier

- **GIVEN** the active performance tier is the lowest
- **WHEN** a page containing the new effect renders
- **THEN** the effect is absent or replaced by a static equivalent
- **AND** no content is withheld, because content is never decorative to the visitor

### Requirement: A loop is either justified or absent

An animation that repeats indefinitely SHALL exist only while a real condition holds, such as work
in progress or a live value. A loop on static content SHALL NOT be used.

#### Scenario: A loop runs with no work in progress

- **GIVEN** an infinitely repeating animation is present
- **WHEN** the condition it represents is examined
- **THEN** either the condition is real and the loop is required
- **OR** the loop is removed, because it represents nothing

#### Scenario: A loading placeholder is shown

- **GIVEN** content is loading
- **WHEN** the placeholder animates
- **THEN** the animation repeats for the duration of the load
- **AND** it stops when the content arrives

### Requirement: Motion is dropped at the lowest tier without losing meaning

Where an animation communicates a state change, the state SHALL remain legible when the animation is
removed by the performance tier or by a reduced-motion preference.

#### Scenario: An animation is suppressed

- **GIVEN** an animation has been suppressed by tier or by preference
- **WHEN** the visitor interacts with the affected control
- **THEN** the resulting state is still distinguishable from the prior state without the movement
- **AND** no control appears unresponsive

### Requirement: A transition is not left on an element permanently

Where an element's transition is applied imperatively for one state change, it SHALL be removed after
that change completes, so it does not accumulate on the element for the rest of the session.

#### Scenario: Several navigations occur in one session

- **GIVEN** a router applies a transition imperatively before rendering
- **WHEN** the visitor navigates several times
- **THEN** the imperative transition is cleaned up after each one
- **AND** it does not persist on the element from the first navigation onward