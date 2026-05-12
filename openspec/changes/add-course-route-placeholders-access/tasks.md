## 1. Course access mock and guards

- [ ] 1.1 Add a frontend-only course access mock API that returns `allowed`, `course-not-found`, and `not-course-participant` results for `(courseSlug, username)`.
- [ ] 1.2 Add TanStack Query options for course access with a stable query key based on `(courseSlug, username)` and a non-zero `staleTime`.
- [ ] 1.3 Add Valibot route param schemas for course slugs, student usernames, and positive integer URL params.
- [ ] 1.4 Add route guard helpers for `requireCourseParticipant`, `requireCourseRole`, and route param parsing redirects.
- [ ] 1.5 Include the requested TODO comment near `requireCourseParticipant` about the current overloaded meaning of `participant`.

## 2. Course route structure

- [ ] 2.1 Add `/courses/$courseSlug` layout route that validates the course slug, requires course participation, and renders an outlet.
- [ ] 2.2 Add the course root placeholder page.
- [ ] 2.3 Add participant-level placeholder routes for task root, journal, and stats pages.
- [ ] 2.4 Add teacher-only placeholder routes for repositories list, course edit, course files, task edit, and attempt review.

## 3. Repository routes

- [ ] 3.1 Add `/repositories/my` layout and placeholder page restricted to course students.
- [ ] 3.2 Add `/repositories/my/commits` and `/repositories/my/commits/$commitId` placeholder pages inheriting student repository access.
- [ ] 3.3 Add `/repositories/$studentUsername` layout and placeholder page restricted to course teachers for known course students.
- [ ] 3.4 Add `/repositories/$studentUsername/commits` and `/repositories/$studentUsername/commits/$commitId` placeholder pages inheriting teacher repository access.

## 4. Task and attempt routes

- [ ] 4.1 Add `/tasks/$taskId` layout that validates `taskId` as a positive integer and renders an outlet.
- [ ] 4.2 Add `/tasks/$taskId/attempts/$studentUsername/$attemptId` layout that validates student username and attempt ID.
- [ ] 4.3 Enforce attempt diff access so course teachers can view known students' attempts and course students can view only their own attempt URLs.
- [ ] 4.4 Add attempt diff placeholder page and teacher-only attempt review placeholder page.

## 5. Navigation and verification

- [ ] 5.1 Replace the course card title anchor with a TanStack Router `Link` to `/courses/$courseSlug`.
- [ ] 5.2 Run lint/build checks and fix any issues caused by the new routes and generated route tree.
- [ ] 5.3 Manually verify representative teacher, student, invalid-param, course-not-found, and not-course-participant redirects.
