## MODIFIED Requirements

### Requirement: Course pages render placeholder content
The system SHALL render implemented course root content for the course root route and simple placeholder content with the page name for course routes that do not yet have a full UI implementation.

#### Scenario: User opens implemented course root route
- **WHEN** an authenticated user with sufficient access navigates to `/courses/[course-slug]`
- **THEN** the page renders the mock-backed course overview page

#### Scenario: User opens an implemented placeholder route
- **WHEN** an authenticated user with sufficient access navigates to a requested course route other than the implemented course root page
- **THEN** the page renders simple text identifying the requested page
