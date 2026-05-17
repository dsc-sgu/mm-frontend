# user-homepage Specification

## Purpose

Define the authenticated homepage dashboard that combines enrolled courses and deadline calendar content.

## Requirements

### Requirement: Homepage shows the user dashboard overview
The system SHALL render the authenticated homepage as a dashboard that combines the user's courses and the deadlines calendar in a single page.

#### Scenario: User opens authenticated homepage
- **WHEN** an authenticated user navigates to the homepage route
- **THEN** the page shows a courses section
- **AND** the page shows a deadlines calendar section on the same page

### Requirement: Homepage lists all courses the user is enrolled in
The system SHALL display all available user courses in the courses section using course cards.

#### Scenario: User has one or more courses
- **WHEN** the homepage loads with course data available
- **THEN** the courses section renders one card per course
- **AND** each card includes the course title, visual styling, and teachers information supported by the course card component

#### Scenario: User has no courses
- **WHEN** the homepage loads and the user has no enrolled courses
- **THEN** the courses section shows an explicit empty state message instead of an empty grid

### Requirement: Homepage exposes the deadlines calendar as part of the dashboard
The system SHALL render the existing deadlines calendar feature inside the homepage without requiring navigation to a separate page.

#### Scenario: User reviews deadlines from homepage
- **WHEN** the homepage loads
- **THEN** the deadlines calendar is visible within the dashboard layout
- **AND** the user can inspect deadlines using the calendar interactions already supported by the calendar component

### Requirement: Deadlines calendar is not exposed through the test calendar route
The system SHALL not expose the deadlines calendar through the standalone `/calendar` test route.

#### Scenario: User opens old calendar test route
- **WHEN** an authenticated user navigates to `/calendar`
- **THEN** the system does not render a standalone deadlines calendar page for that route

#### Scenario: User reviews deadlines from homepage after calendar route removal
- **WHEN** the authenticated homepage loads
- **THEN** the deadlines calendar remains visible within the dashboard layout

### Requirement: Homepage layout adapts to available viewport width
The system SHALL keep both homepage sections usable on narrow and wide screens.

#### Scenario: Homepage on narrow viewport
- **WHEN** the homepage is rendered on a narrow screen
- **THEN** the courses section appears before the deadlines calendar section in a vertical flow

#### Scenario: Homepage on wide viewport
- **WHEN** the homepage is rendered on a wide screen
- **THEN** both sections are arranged in a dashboard-style layout with enough space for course cards and calendar content to remain readable
