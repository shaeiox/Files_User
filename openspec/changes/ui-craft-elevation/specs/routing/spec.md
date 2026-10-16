# Spec Delta

## Purpose

Defines the client-side route lifecycle: which routes exist, how a route transition is presented, how
history and the not-found path behave, and how much of the application each route is asked to load.

## ADDED Requirements

### Requirement: A route loads only the code it needs

A route SHALL NOT load behaviour belonging exclusively to another route. Code required only by the
Browse, Releases, inspector, or bulk-download surfaces SHALL NOT be fetched for a visitor landing on
another route.

#### Scenario: A visitor lands on the home route

- **GIVEN** the visitor's first request resolves to the home route
- **WHEN** the page's resources are listed
- **THEN** no browse-only, release-only, inspector-only, or bulk-download-only script is fetched
- **AND** no browse-only or release-only stylesheet is fetched

#### Scenario: A route is loaded by in-app navigation

- **GIVEN** a visitor navigates from one route to another without a full page load
- **WHEN** the destination route's behaviour is required
- **THEN** it is fetched at that point rather than having been fetched on first paint

### Requirement: The first route paints without waiting on the whole application

The resources required for the first rendered route SHALL be loadable and parseable independently of
the resources required by every other route.

#### Scenario: The first route is measured

- **GIVEN** a cold load of any route
- **WHEN** the first render completes
- **THEN** the bytes required to reach that render are a strict subset of the full application
- **AND** the remainder is deferred past first render

### Requirement: A route change is presented as a transition, not a blank flash

Navigating between routes SHALL present the change as a continuous transition. The outgoing view SHALL
NOT be left visible or absent while the incoming view is still being prepared.

#### Scenario: A route is navigated to

- **GIVEN** a visitor activates an in-app link
- **WHEN** the destination route's view is still being prepared
- **THEN** the outgoing view remains visible until the incoming view is ready
- **AND** the change between them is animated rather than an instant blank interval

#### Scenario: Preparation is slow

- **GIVEN** the destination route takes longer than a frame to prepare
- **WHEN** the visitor navigates
- **THEN** the incoming view is not faded in while still empty
- **AND** it appears once its content is present

#### Scenario: The transition primitive is unavailable

- **GIVEN** a browser does not support a continuous transition primitive
- **WHEN** a route is navigated to
- **THEN** the route still renders and remains fully usable
- **AND** the fallback is a plain immediate change rather than a failure

### Requirement: A route and its current page are identified truthfully

The navigation SHALL mark at most one control as the current page, and SHALL mark one only when a
control's destination corresponds to the active route.

#### Scenario: A nested route is active

- **GIVEN** a nested path under a navigable destination is active
- **WHEN** the navigation state is applied
- **THEN** the control whose destination is that root is marked as current
- **AND** no other control is marked

#### Scenario: No control corresponds to the active route

- **GIVEN** the active route corresponds to no navigation control
- **WHEN** the navigation state is applied
- **THEN** no control is marked as current
- **AND** no control claims to be a page the visitor is not on

### Requirement: An unknown client route resolves once, without a history trap

A path that matches no route SHALL resolve to the not-found page exactly once, and SHALL NOT push a
history entry that returns the visitor to the same failing path.

#### Scenario: An unknown path is requested

- **GIVEN** a visitor requests a path that matches no route
- **WHEN** the router resolves it
- **THEN** the not-found page is shown
- **AND** the failing history entry is replaced rather than pushed
- **AND** pressing back does not return the visitor to the same failing path

### Requirement: Navigation state is set before history is written

The router SHALL record the current path before rendering the destination, so that any code running
during render can read the route it is rendering for.

#### Scenario: A route renders

- **GIVEN** a destination route is being rendered
- **WHEN** the destination's own initialisation reads the current route
- **THEN** it reads the destination, not the previous route

### Requirement: A route's own implementation is defined in one place

Where a router function is declared more than once within itself, the duplicate SHALL be removed.
Nested declarations that shadow an enclosing function of the same name SHALL NOT survive.

#### Scenario: The router is inspected

- **GIVEN** a router whose navigation function is declared within itself
- **WHEN** its declarations are counted
- **THEN** exactly one declaration of that function exists
- **AND** a future edit to it cannot be applied to an unreachable copy