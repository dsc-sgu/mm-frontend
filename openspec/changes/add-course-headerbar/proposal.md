## Why

Course pages have multiple sections and deeply nested entities (repositories, commits, tasks, attempts), but the current global header only shows the product link and account actions. Users need persistent context and discoverable course sections so they can understand where they are and move between course areas without relying on page content.

## What Changes

- Add a two-level application header model:
  - first level with product home navigation, breadcrumb trail, theme/messages/notifications/profile actions;
  - optional second level with contextual section navigation for course pages.
- Add route-provided static header metadata for breadcrumbs and section navigation.
- Render role-aware course navigation for teachers and students.
- Render role-aware course breadcrumbs for course root, management pages, repositories, commits, tasks, attempts, and reviews.
- Remove the standalone `/calendar` test route while keeping the deadlines calendar embedded on the authenticated homepage.
- Add a teacher attempts placeholder route so the course teacher nav has a valid target.

## Capabilities

### New Capabilities

- `application-header-navigation`: Global and contextual header navigation, including breadcrumbs, course section tabs, route metadata, and removal of the standalone calendar test route.

### Modified Capabilities

- `course-route-access`: Add the teacher-only course attempts placeholder route to the existing guarded course route set.
- `user-homepage`: Ensure the deadlines calendar remains available only as part of the authenticated homepage after removing the standalone calendar route.

## Impact

- Affected code:
  - `src/header/*`
  - `src/course/course-route.header.ts`
  - `src/course/course-route.types.ts`
  - `src/course/course.queries.ts`
  - `src/routes/__root.tsx`
  - `src/routes/_authenticated/index.tsx`
  - `src/routes/_authenticated/calendar.tsx`
  - `src/routes/_authenticated/courses/**`
- No backend API changes.
- No new runtime dependencies expected.
- TanStack Router generated route tree will update after deleting `/calendar` and adding `/courses/$courseSlug/attempts`.
