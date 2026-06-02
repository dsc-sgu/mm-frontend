## MODIFIED Requirements

### Requirement: Course pages render placeholder content
The system SHALL render implemented course root content for the course root route, implemented teacher attempts list content for the teacher attempts route, implemented attempt diff/review content for attempt routes, and simple placeholder content with the page name for course routes that do not yet have a full UI implementation.

#### Scenario: User opens implemented course root route
- **WHEN** an authenticated user with sufficient access navigates to `/courses/[course-slug]`
- **THEN** the page renders the mock-backed course overview page

#### Scenario: Teacher opens implemented attempts list route
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/attempts`
- **THEN** the page renders the mock-backed course attempts list page

#### Scenario: Participant opens implemented attempt diff route
- **WHEN** an authenticated course participant with sufficient access navigates to `/courses/[course-slug]/tasks/[task-id]/attempts/[student-username]/[attempt-id]`
- **THEN** the page renders the mock-backed read-only attempt review page

#### Scenario: Teacher opens implemented attempt review route
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/tasks/[task-id]/attempts/[student-username]/[attempt-id]/review`
- **THEN** the page renders the mock-backed editable attempt review page

#### Scenario: User opens an implemented placeholder route
- **WHEN** an authenticated user with sufficient access navigates to a requested course route other than the implemented course root page, implemented attempts list page, implemented attempt diff page, and implemented attempt review page
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
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/edit`, `/courses/[course-slug]/files`, or `/courses/[course-slug]/tasks/[task-id]/edit`
- **THEN** the system renders the corresponding placeholder page

#### Scenario: Teacher opens attempt review page
- **WHEN** an authenticated course teacher navigates to an attempt review URL
- **THEN** the system renders the implemented editable attempt review page

#### Scenario: Student opens teacher-only management page
- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/edit`, `/courses/[course-slug]/files`, `/courses/[course-slug]/tasks/[task-id]/edit`, or an attempt review URL
- **THEN** the system redirects the student to the course root page

### Requirement: Attempt diff routes enforce student ownership or teacher role
The system SHALL use the attempt URL shape `/courses/[course-slug]/tasks/[task-id]/attempts/[student-username]/[attempt-id]` and allow course teachers to view student attempts while allowing course students to view only their own attempts.

#### Scenario: Student opens own attempt diff
- **WHEN** an authenticated course student navigates to an attempt diff URL where `[student-username]` equals the authenticated user's username
- **THEN** the system renders the implemented read-only attempt review page

#### Scenario: Student opens another student's attempt diff
- **WHEN** an authenticated course student navigates to an attempt diff URL where `[student-username]` does not equal the authenticated user's username
- **THEN** the system redirects the student to the course root page

#### Scenario: Teacher opens student attempt diff
- **WHEN** an authenticated course teacher navigates to an attempt diff URL for a known student in the course
- **THEN** the system renders the implemented read-only attempt review page
