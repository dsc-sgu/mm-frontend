## MODIFIED Requirements

### Requirement: Course pages render placeholder content
The system SHALL render implemented course root content for the course root route, the implemented teacher attempts list content for the teacher attempts route, and simple placeholder content with the page name for course routes that do not yet have a full UI implementation.

#### Scenario: User opens implemented course root route
- **WHEN** an authenticated user with sufficient access navigates to `/courses/[course-slug]`
- **THEN** the page renders the mock-backed course overview page

#### Scenario: Teacher opens implemented attempts list route
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/attempts`
- **THEN** the page renders the mock-backed course attempts list page

#### Scenario: User opens an implemented placeholder route
- **WHEN** an authenticated user with sufficient access navigates to a requested course route other than the implemented course root page and implemented attempts list page
- **THEN** the page renders simple text identifying the requested page

### Requirement: Teacher-only course pages are restricted to course teachers
The system SHALL allow only users with the `teacher` course role to open teacher-only course pages.

#### Scenario: Teacher opens repositories list
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/repositories`
- **THEN** the system renders the repositories list placeholder page

#### Scenario: Student opens repositories list
- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/repositories`
- **THEN** the system redirects the student to the course root page

#### Scenario: Teacher opens attempts list
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/attempts`
- **THEN** the system renders the implemented attempts list page

#### Scenario: Student opens attempts list
- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/attempts`
- **THEN** the system redirects the student to the course root page

#### Scenario: Teacher opens course management pages
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/edit`, `/courses/[course-slug]/files`, `/courses/[course-slug]/tasks/[task-id]/edit`, or an attempt review URL
- **THEN** the system renders the corresponding placeholder page

#### Scenario: Student opens teacher-only management page
- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/edit`, `/courses/[course-slug]/files`, `/courses/[course-slug]/tasks/[task-id]/edit`, or an attempt review URL
- **THEN** the system redirects the student to the course root page
