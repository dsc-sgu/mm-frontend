## ADDED Requirements

### Requirement: Teacher attempts page is restricted to course teachers

The system SHALL expose `/courses/[course-slug]/attempts` as a teacher-only course placeholder page.

#### Scenario: Teacher opens attempts list

- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/attempts`
- **THEN** the system renders the attempts list placeholder page

#### Scenario: Student opens attempts list

- **WHEN** an authenticated course student navigates to `/courses/[course-slug]/attempts`
- **THEN** the system redirects the student to the course root page
