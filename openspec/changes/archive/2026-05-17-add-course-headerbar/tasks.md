## 1. Header Data Model

- [x] 1.1 Add typed header metadata models for breadcrumb items, contextual nav items, and route static header data.
- [x] 1.2 Add TanStack Router module augmentation so `staticData.header` is type checked.
- [x] 1.3 Add a header state resolver to aggregate active route matches into breadcrumbs and optional contextual nav.
- [x] 1.4 Add a course route header module for course titles, role-aware nav, route breadcrumbs, task label stubs, attempt labels, commit labels, and username display stubs.

## 2. Header UI Components

- [x] 2.1 Refactor the global `Header` to read active matches with `useMatches()` and render resolved header data.
- [x] 2.2 Render the product home link plus breadcrumb area in the header's left side.
- [x] 2.3 Add a breadcrumb component that renders linkable and current-page breadcrumb items with accessible semantics.
- [x] 2.4 Add a second-level section nav component with horizontal scrolling and active item styling.
- [x] 2.5 Preserve theme, message, notification, and profile controls for authorized users, and keep theme switching available for unauthorized users.
- [x] 2.6 Remove existing header debug output and invalid Tailwind class text.

## 3. Route Loader and Static Metadata

- [x] 3.1 Extend the course route loader to load the matching course summary and expose it with `courseSlug` and `courseAccess`.
- [x] 3.2 Add static header breadcrumb metadata to the authenticated homepage.
- [x] 3.3 Add course root static header metadata that supplies the course breadcrumb and role-aware course section nav.
- [x] 3.4 Add static header breadcrumb metadata for course management pages: journal, edit, stats, and files.
- [x] 3.5 Add static header breadcrumb metadata for repository routes, student repository routes, commit list routes, and commit detail routes.
- [x] 3.6 Add static header breadcrumb metadata for task root, task edit, attempt diff, and attempt review routes.

## 4. Route Additions and Removals

- [x] 4.1 Delete the standalone `/calendar` test route file while keeping the deadlines calendar on the authenticated homepage.
- [x] 4.2 Add `/courses/$courseSlug/attempts` as a teacher-only placeholder route guarded by `requireCourseRole`.
- [x] 4.3 Verify generated TanStack route tree updates after adding and removing route files.

## 5. Layout and Validation

- [x] 5.1 Adjust affected page height calculations or layout spacing so the two-level header does not create viewport overflow regressions.
- [x] 5.2 Run TypeScript/build validation and fix type errors from route metadata, links, and match utilities.
- [x] 5.3 Run lint validation and fix formatting/lint issues.
- [x] 5.4 Manually verify representative breadcrumbs and nav items for dashboard, teacher course pages, student repository pages, commits, tasks, attempts, and `/calendar` removal.
