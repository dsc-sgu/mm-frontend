## 1. Dashboard data preparation

- [x] 1.1 Extract course mock data from `src/routes/_authenticated/index.tsx` into a dedicated course-level module or query hook.
- [x] 1.2 Ensure the homepage can render all available user courses from that source and define the empty-state branch for no courses.

## 2. Homepage dashboard composition

- [x] 2.1 Refactor `src/routes/_authenticated/index.tsx` into a dashboard page with separate courses and deadlines sections.
- [x] 2.2 Render the courses section with `CourseCard` instances and section-level heading/content wrappers.
- [x] 2.3 Embed `DeadlinesCalendar` into the homepage with container sizing suitable for dashboard use.
- [x] 2.4 Add responsive layout rules so courses appear before the calendar on narrow screens and both sections remain readable on wide screens.

## 3. Empty states and verification

- [x] 3.1 Add or wire an explicit empty state for the courses section when the user has no enrolled courses.
- [x] 3.2 Verify the homepage still works with existing calendar interactions and does not break the standalone `/calendar` route.
- [x] 3.3 Run project checks relevant to the change and fix any lint or build issues caused by the new homepage implementation.
