## Why

Course teachers currently see only a placeholder on the course attempts route, but they need a single page to review, filter, select, and quickly grade submitted student attempts. Issue #24 defines the first frontend-only layout and interaction model for that teacher workflow before real backend integration exists.

## What Changes

- Replace the teacher attempts placeholder at `/courses/[course-slug]/attempts` with a mock-backed attempts list page.
- Add a left filter sidebar for tasks, students, and grade status, with filter state stored in URL query parameters.
- Render attempt cards with submission metadata, deadline timing, grading status, diff statistics, selection controls, and navigation to attempt diff/review routes.
- Add bulk selection actions with disabled-state explanations when selected attempts cannot be graded together.
- Add a quick grading mode with score inputs, save behavior, review-lock handling, and a visible placeholder control for future feedback text field support.
- Keep all data frontend-only through a mock attempts API; no real backend calls are introduced by this change.

## Capabilities

### New Capabilities
- `course-attempts-list`: Teacher-facing course attempts list, filters, selection, bulk actions, and quick grading behavior.

### Modified Capabilities
- `course-route-access`: The teacher attempts route changes from rendering placeholder content to rendering the implemented attempts list page while preserving teacher-only access restrictions.

## Impact

- Adds a new `src/course/attempts/` submodule for attempt list types, mock API/query code, and UI components.
- Updates `src/routes/_authenticated/courses/$courseSlug/attempts.tsx` to validate search params and render the new page.
- Adds small shadcn-style UI primitives needed by the page, such as checkbox and tooltip.
- Updates OpenSpec requirements for the attempts route and the new attempts list capability.
