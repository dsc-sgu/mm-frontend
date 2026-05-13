## Context

The project uses TanStack Router file-based routes, TanStack Query, React, Tailwind CSS, and Valibot. Authenticated pages are already protected by `src/routes/_authenticated.tsx`, and the dashboard route uses mocked course data through `src/course/course.api.mock.ts` and `src/course/use-courses-query.hook.ts`.

The course URL map is broader than the current implementation: the `src/routes/_authenticated/courses/` directory is empty, while course cards already link to `/courses/{courseId}`. The application therefore needs route files now, even if each page only renders a placeholder until the final UI is implemented.

The backend course-role API is not available yet. Frontend guards should use a mock API that models the intended behavior and can later be replaced by a real endpoint.

## Goals / Non-Goals

**Goals:**

- Add TanStack Router routes for all requested course URLs.
- Render simple placeholder text with the page name for every newly added page.
- Add frontend-only mocked course access data with explicit refusal reasons: course not found and not a course participant.
- Guard course pages by authenticated user's course role: participant, teacher, or student.
- Validate URL params for course slugs, student usernames, task IDs, and attempt IDs using Valibot schemas.
- Keep guard code small by centralizing repeated access and param parsing helpers.
- Use one course-access query key per `(courseSlug, username)` so parent and child guards reuse TanStack Query cache instead of making avoidable repeated mock calls.

**Non-Goals:**

- Implement real course, repository, task, commit, journal, stats, files, or attempt UI.
- Integrate a real backend API for course membership and roles.
- Model team submissions or participant entities beyond the current `studentUsername` route segment.
- Implement full attempt existence validation against a real data source.

## Decisions

### 1. Model course access as a discriminated union with denial reasons

The mock API will return `allowed`, `course-not-found`, or `not-course-participant`. This keeps guards able to distinguish reasons while still making redirect handling straightforward.

**Alternatives considered:**

- Return `CourseAccess | null`. Rejected because it loses the explicit reason for refusal.
- Throw errors from the mock API. Rejected because route guards should handle expected access outcomes as control flow, not exceptional failures.

### 2. Fetch course role once and reuse it through TanStack Query cache

The course layout route will call `requireCourseParticipant`, and child teacher/student routes will call `requireCourseRole` with the same course-access query key. With a stable key and `staleTime`, TanStack Query serves fresh data from memory and deduplicates in-flight requests.

The current frontend-only mock accepts `username` so the mock can emulate access for the authenticated user without a backend endpoint. The real course-access API must not accept a caller-supplied username for the current user's access check: it should derive the user from the server-side session/cookie. When replacing the mock, `fetchCourseAccess` and `courseAccessOptions` should therefore accept only course-identifying input, and session changes must invalidate or partition cached course-access data so roles cannot leak between users in one browser session.

**Alternatives considered:**

- Put all role checks only in leaf routes. Rejected because it duplicates participant checks and loses a useful course-level guard.
- Create separate teacher/student query options. Rejected because it fragments cache keys and invites repeated fetches for the same role data.
- Keep passing `username` to the real access endpoint. Rejected because access decisions for the current user must be based on trusted session state, not a client-supplied identity.

### 3. Keep guards generic and perform route-specific checks in route files

The guard layer will expose `requireCourseParticipant`, `requireCourseRole`, and param parsing helpers. Route-specific rules such as `studentUsername` membership in a course or a student viewing only their own attempt will remain in the relevant `beforeLoad`.

`requireAuthenticatedUsername` exists only to support the frontend mock that needs a username argument. In the real API-backed implementation, guards should not return or forward a username just to ask the backend who the current user is; the backend should read the current user from the session. If a route still needs to compare `[student-username]` with the current user for client-side redirects, that identity should come from trusted session/access context, not from a client-controlled API parameter.

**Alternatives considered:**

- Add helpers such as `requireTeacherRepositoryAccess` and `requireAttemptReviewAccess`. Rejected as premature abstraction for placeholder pages.

### 4. Validate route params with Valibot schemas and parsing helpers

Course slug and username params are strings from the URL and must match lowercase latin letters, digits, and hyphens. Numeric params also arrive as strings, so the positive integer schema validates a string and transforms it to a number.

**Alternatives considered:**

- Use Valibot `slug()`. Rejected because Valibot's slug regex permits underscores, while the route contract permits only hyphens.
- Use hand-written `isValid...` functions. Rejected because the project already uses Valibot and schemas make validation behavior explicit.

### 5. Use nested route layouts for inherited access rules

Routes with common access rules, such as `/repositories/$studentUsername/**`, `/tasks/$taskId/**`, and `/attempts/$studentUsername/$attemptId/**`, will use `route.tsx` layout files so child pages inherit validation and role checks.

**Alternatives considered:**

- Repeat `beforeLoad` in every leaf route. Rejected because it increases duplication and makes later behavior changes harder.

### 6. Keep placeholder UI intentionally minimal

Each placeholder page will render simple text with a page title. No shared placeholder component is necessary for this change.

**Alternatives considered:**

- Build a shared placeholder component with actions and metadata. Rejected because the requested interim UI only needs simple page names.

## Risks / Trade-offs

- [Mock access data may diverge from future backend semantics] → Keep mock code isolated in `course-access.api.mock.ts` and `course-access.queries.ts` so it can be replaced later. In particular, the mock's `username` argument is temporary; the real API must derive the current user from the session.
- [The word `participant` is currently overloaded] → Add the requested TODO comment near `requireCourseParticipant` explaining that participant should eventually model students/teams separately from teachers.
- [Many route files are created at once] → Keep each route minimal and rely on layouts/guards to reduce duplicated logic.
- [Route tree generation may lag if the dev server is not running] → Do not edit `src/routeTree.gen.ts` manually; run build/dev tooling to regenerate through the TanStack Router plugin.

## Migration Plan

1. Add mocked course access API and query options.
2. Add course route guard helpers and Valibot param schemas.
3. Add nested route files for the requested URL map.
4. Update course cards to use TanStack Router `Link`.
5. Run lint/build checks and let TanStack Router regenerate the route tree.

Rollback: remove the new route files and course-access modules, and revert the course card link change. No persistent data migration is required.

## Open Questions

- How should the domain distinguish `participant`, `student`, student teams, and teachers in the final backend API?
- Should attempt existence be validated on the frontend once a real attempt API exists, or should the backend handle this entirely?
