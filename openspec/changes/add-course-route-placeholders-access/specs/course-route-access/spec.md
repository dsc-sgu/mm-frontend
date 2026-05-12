## ADDED Requirements

### Requirement: Course routes require authenticated course access

The system SHALL provide guarded authenticated routes for course pages and redirect users away from course pages when the course does not exist or the authenticated user is not a course participant according to the frontend course-access source.

#### Scenario: Course participant opens course root page

- **WHEN** an authenticated course participant navigates to `/courses/[course-slug]`
- **THEN** the system renders the course root placeholder page

#### Scenario: User opens unavailable course

- **WHEN** an authenticated user navigates to a course URL for a course that the course-access source reports as `course-not-found`
- **THEN** the system redirects the user to `/`

#### Scenario: Non-participant opens course page

- **WHEN** an authenticated user navigates to a course URL for a course that the course-access source reports as `not-course-participant`
- **THEN** the system redirects the user to `/`

### Requirement: Course route params are validated before page access

The system SHALL validate course slugs, student usernames, task IDs, and attempt IDs from route params before rendering course placeholder pages.

#### Scenario: User opens URL with invalid course slug

- **WHEN** an authenticated user navigates to a course URL whose `[course-slug]` does not match lowercase latin letters, digits, and hyphens
- **THEN** the system redirects the user to `/`

#### Scenario: User opens URL with invalid student username

- **WHEN** an authenticated course participant navigates to a course URL whose `[student-username]` does not match lowercase latin letters, digits, and hyphens
- **THEN** the system redirects the user to the course root page

#### Scenario: User opens URL with invalid numeric route param

- **WHEN** an authenticated course participant navigates to a task or attempt URL whose numeric route param is not a positive integer
- **THEN** the system redirects the user to the course root page

### Requirement: Course pages render placeholder content

The system SHALL render simple placeholder content with the page name for course routes that do not yet have a full UI implementation.

#### Scenario: User opens an implemented placeholder route

- **WHEN** an authenticated user with sufficient access navigates to any requested course route
- **THEN** the page renders simple text identifying the requested page

### Requirement: Teacher-only course pages are restricted to course teachers

The system SHALL allow only users with the `teacher` course role to open teacher-only course pages.

#### Scenario: Teacher opens repositories list

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/repositories`
- **THEN** the system renders the repositories list placeholder page

#### Scenario: Student opens repositories list

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/repositories`
- **THEN** the system redirects the student to the course root page

#### Scenario: Teacher opens course management pages

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/edit`, `/courses/[course-slug]/files`, `/courses/[course-slug]/tasks/[task-id]/edit`, or an attempt review URL
- **THEN** the system renders the corresponding placeholder page

#### Scenario: Student opens teacher-only management page

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/edit`, `/courses/[course-slug]/files`, `/courses/[course-slug]/tasks/[task-id]/edit`, or an attempt review URL
- **THEN** the system redirects the student to the course root page

### Requirement: Student repository pages are role-restricted

The system SHALL expose `/repositories/[student-username]` to course students for their own repository and to course teachers for known students in the course.

#### Scenario: Student opens own repository page

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/repositories/[own-username]`
- **THEN** the system renders the authorized student's repository placeholder page

#### Scenario: Student opens another student's repository page

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/repositories/[student-username]` where `[student-username]` is not their own username
- **THEN** the system redirects the student to the course root page

#### Scenario: Teacher opens known student repository page

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/repositories/[student-username]` for a student included in the course-access source
- **THEN** the system renders the specific student repository placeholder page

#### Scenario: Teacher opens unknown student repository page

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/repositories/[student-username]` for a student not included in the course-access source
- **THEN** the system redirects the teacher to `/courses/[course-slug]/repositories`

### Requirement: Repository commit routes inherit repository access

The system SHALL guard commit list and commit detail routes according to the repository route they belong to.

#### Scenario: Student opens own commit list

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/repositories/[own-username]/commits`
- **THEN** the system renders the own repository commits placeholder page

#### Scenario: Student opens another student's commit detail

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/repositories/[student-username]/commits/[commit-id]` where `[student-username]` is not their own username
- **THEN** the system redirects the student to the course root page

#### Scenario: Teacher opens student commit detail

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/repositories/[student-username]/commits/[commit-id]` for a known student in the course
- **THEN** the system renders the specific commit placeholder page

### Requirement: Attempt diff routes enforce student ownership or teacher role

The system SHALL use the attempt URL shape `/courses/[course-slug]/tasks/[task-id]/attempts/[student-username]/[attempt-id]` and allow course teachers to view student attempts while allowing course students to view only their own attempts.

#### Scenario: Student opens own attempt diff

- **WHEN** an authenticated course student navigates to an attempt diff URL where `[student-username]` equals the authenticated user's username
- **THEN** the system renders the attempt diff placeholder page

#### Scenario: Student opens another student's attempt diff

- **WHEN** an authenticated course student navigates to an attempt diff URL where `[student-username]` does not equal the authenticated user's username
- **THEN** the system redirects the student to the course root page

#### Scenario: Teacher opens student attempt diff

- **WHEN** an authenticated course teacher navigates to an attempt diff URL for a known student in the course
- **THEN** the system renders the attempt diff placeholder page

### Requirement: Shared participant course pages are available to course students and teachers

The system SHALL allow course participants with either `student` or `teacher` course role to open course task root, journal, and stats placeholder pages.

#### Scenario: Participant opens task root

- **WHEN** an authenticated course participant navigates to `/courses/[course-slug]/tasks/[task-id]`
- **THEN** the system renders the task root placeholder page

#### Scenario: Participant opens journal

- **WHEN** an authenticated course participant navigates to `/courses/[course-slug]/journal`
- **THEN** the system renders the journal placeholder page

#### Scenario: Participant opens stats

- **WHEN** an authenticated course participant navigates to `/courses/[course-slug]/stats`
- **THEN** the system renders the stats placeholder page

### Requirement: Course cards navigate with router links

The system SHALL navigate from course cards to course pages through TanStack Router links instead of plain anchor-based full page reloads.

#### Scenario: User activates course card link

- **WHEN** an authenticated user activates a course card title link
- **THEN** the system navigates to `/courses/[course-slug]` using router navigation
