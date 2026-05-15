## ADDED Requirements

### Requirement: Application header provides dashboard navigation and account actions

The system SHALL render a global application header with a dashboard navigation control on the left and user/action controls on the right.

#### Scenario: User activates dashboard control

- **WHEN** a user activates the dashboard icon in the application header
- **THEN** the system navigates to `/` using router navigation

#### Scenario: Authorized user sees account actions

- **WHEN** the authenticated session status is authorized
- **THEN** the header shows controls for theme switching, messages, notifications, and profile menu access

#### Scenario: Unauthorized user sees limited actions

- **WHEN** the session status is not authorized
- **THEN** the header does not show messages, notifications, or profile menu controls
- **AND** the theme switching control remains available

### Requirement: Application header renders breadcrumbs from active route metadata

The system SHALL render a breadcrumb trail in the first header level based on the active route chain's header metadata.

#### Scenario: Route provides breadcrumb metadata

- **WHEN** a user navigates to a route whose active route chain provides breadcrumb metadata
- **THEN** the header displays breadcrumb items in hierarchical order after the dashboard icon

#### Scenario: Breadcrumb item has a target

- **WHEN** a breadcrumb item has a router target
- **THEN** the item is rendered as a router link

#### Scenario: Breadcrumb item is current page

- **WHEN** a breadcrumb item represents the current page and has no target
- **THEN** the item is rendered as non-link text with current-page semantics

### Requirement: Application header renders optional contextual second-level navigation

The system SHALL render a second header level containing contextual navigation items when the active route chain provides contextual header nav metadata.

#### Scenario: Route provides contextual nav metadata

- **WHEN** a user navigates to a route whose active route chain provides contextual nav metadata
- **THEN** the header displays a second-level horizontal navigation bar below the main header row

#### Scenario: Route does not provide contextual nav metadata

- **WHEN** a user navigates to a route without contextual nav metadata
- **THEN** the header does not render the second-level navigation bar

#### Scenario: User is on a contextual nav target

- **WHEN** the current location matches a contextual nav item according to its active matching rule
- **THEN** that nav item is visually marked as active

### Requirement: Course pages expose role-aware second-level navigation

The system SHALL render course section navigation in the second header level using the authenticated participant's course role.

#### Scenario: Teacher opens a course page

- **WHEN** an authenticated course teacher navigates to a course route
- **THEN** the course header nav includes links for course root, attempts, repositories, journal, files, analytics, and editing

#### Scenario: Student opens a course page

- **WHEN** an authenticated course student navigates to a course route
- **THEN** the course header nav includes links for course root and the student's own repository
- **AND** teacher-only course section links are not shown

### Requirement: Course pages expose role-aware breadcrumbs

The system SHALL render course breadcrumbs that reflect the user's role and the current course route hierarchy.

#### Scenario: Participant opens course root

- **WHEN** an authenticated course participant navigates to `/courses/[course-slug]`
- **THEN** the breadcrumb is `[course title]`

#### Scenario: Teacher opens attempts list

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/attempts`
- **THEN** the breadcrumb is `[course title] / Попытки`

#### Scenario: Teacher opens attempt review

- **WHEN** an authenticated course teacher navigates to an attempt review URL
- **THEN** the breadcrumb is `[course title] / Попытки / Оценка попытки #[attempt-id]`

#### Scenario: Teacher opens course management pages

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/journal`, `/courses/[course-slug]/edit`, `/courses/[course-slug]/stats`, or `/courses/[course-slug]/files`
- **THEN** the breadcrumb ends with `Журнал`, `Редактирование`, `Аналитика`, or `Файлы` respectively after the course title

#### Scenario: Teacher opens repository pages

- **WHEN** an authenticated course teacher navigates to a course repository route
- **THEN** the breadcrumb starts with `[course title] / Репозитории`

#### Scenario: Student opens own repository pages

- **WHEN** an authenticated course student navigates to their own course repository route
- **THEN** the breadcrumb starts with `[course title] / Репозиторий`

#### Scenario: Participant opens repository commits

- **WHEN** an authenticated course participant navigates to a repository commits list
- **THEN** the breadcrumb includes `Коммиты` after the repository segment

#### Scenario: Participant opens repository commit detail

- **WHEN** an authenticated course participant navigates to a repository commit detail
- **THEN** the breadcrumb ends with the commit identifier after `Коммиты`

#### Scenario: Student opens task root

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/tasks/[task-id]`
- **THEN** the breadcrumb is `[course title] / [task title]`

#### Scenario: Teacher opens task root

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/tasks/[task-id]`
- **THEN** the breadcrumb is `[course title] / Задания / [task title]`

#### Scenario: Teacher edits task

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/tasks/[task-id]/edit`
- **THEN** the breadcrumb is `[course title] / Задания / [task title] / Редактирование`

#### Scenario: Student opens attempt diff

- **WHEN** an authenticated course student navigates to their attempt diff URL
- **THEN** the breadcrumb is `[course title] / [task title] / Попытка #[attempt-id]`

### Requirement: Header route metadata is type checked

The system SHALL type check route static header metadata at compile time.

#### Scenario: Developer defines route header metadata

- **WHEN** a developer adds header metadata to a TanStack Router route's static data
- **THEN** TypeScript validates the metadata shape used by the application header
