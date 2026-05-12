## Why

The application has a defined course URL map, but most course-related pages are not present yet. Users need stable routes with clear placeholder pages now, and protected routes must already reflect the intended student/teacher access rules before the real backend APIs and page implementations arrive.

## What Changes

- Add file-based TanStack Router routes for the course, repository, task, attempt, journal, edit, stats, and files URLs that are currently missing.
- Render simple text placeholders with the page name for routes whose full UI is not implemented yet.
- Add a frontend mock course-access API that returns the authenticated user's role within a course and distinguishes denial reasons.
- Add route guards that validate URL params and redirect users when a page is unavailable for their role or course membership.
- Update attempt URLs to include `student-username` before `attempt-id`, because attempt IDs are unique only within the `(studentUsername, taskId)` pair.
- Replace course card full-page navigation with TanStack Router links.

## Capabilities

### New Capabilities
- `course-route-access`: Course routes exist as guarded placeholder pages and enforce role-based frontend redirects using mocked course access data.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/routes/_authenticated/courses/**`, `src/course/*`, and `src/course/course-card.component.tsx`.
- Routing impact: adds many new authenticated course routes and relies on generated TanStack Router route tree updates.
- API impact: introduces frontend-only mocked course access data until real backend endpoints are available.
- Dependencies: no new external dependencies; use existing TanStack Query, TanStack Router, and Valibot.
