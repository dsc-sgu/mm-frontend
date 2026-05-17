## ADDED Requirements

### Requirement: Deadlines calendar is not exposed through the test calendar route

The system SHALL not expose the deadlines calendar through the standalone `/calendar` test route.

#### Scenario: User opens old calendar test route

- **WHEN** an authenticated user navigates to `/calendar`
- **THEN** the system does not render a standalone deadlines calendar page for that route

#### Scenario: User reviews deadlines from homepage after calendar route removal

- **WHEN** the authenticated homepage loads
- **THEN** the deadlines calendar remains visible within the dashboard layout
