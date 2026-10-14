# Spec Delta

## ADDED Requirements

### Requirement: Login from a locked folder shows the folder without a reload

When a Browse page for a path is showing the sign-in state because the listing returned `401`,
a successful login from that state SHALL rebuild the Browse page for the same path and show its
contents, with the toolbar and inspector restored, without a full page reload.

#### Scenario: Sign in from a locked folder

- **WHEN** an anonymous visitor opens `/browse/secret/`, sees the sign-in state, and logs in with
  valid credentials through the modal
- **THEN** the modal closes and the folder's entries are listed within the same page, with the
  toolbar visible and no `is-error` state

#### Scenario: Failed login keeps the sign-in state

- **WHEN** the login attempt is rejected
- **THEN** the modal shows the error and the locked state is unchanged behind it

#### Scenario: Idle logout re-renders correctly

- **WHEN** a signed-in visitor is logged out by the idle timer while viewing a folder that requires
  login
- **THEN** the page shows the sign-in state, not an empty table
