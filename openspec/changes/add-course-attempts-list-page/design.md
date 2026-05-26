## Context

The authenticated course attempts route exists and is teacher-only, but it currently renders placeholder text. Existing course feature code is organized by capability submodules such as `src/course/page/` and `src/course/access/`, and mock-backed frontend data is already used for course content and access checks.

Issue #24 defines a teacher-facing attempts list layout with filters, attempt cards, selection, bulk actions, and quick grading. The backend contract is not ready, so the page must be implemented against a frontend-only mock API while preserving the existing TanStack Router route shape and teacher-only guard.

## Goals / Non-Goals

**Goals:**

- Implement the `/courses/[course-slug]/attempts` teacher page as a production-shaped, mock-backed UI.
- Store applied filter state in URL query parameters so filtered views are shareable and reload-safe.
- Support local draft filters in the sidebar, applying them only when the user presses `Применить`.
- Model and render attempt metadata needed by the issue: task, student, group, submission time, deadline timing, grading state, score, max score, diff stats, and review lock data.
- Support selecting attempts, entering quick grading mode, validating bulk grading eligibility, and saving mock score changes.
- Render the future feedback-text toggle with a TODO in code instead of implementing a textarea before issue #25 defines its design.

**Non-Goals:**

- Integrating with the real backend.
- Implementing the attempt review page from issue #25.
- Implementing deadline extension behavior beyond rendering the bulk action entry point.
- Persisting mock grading changes across full page reloads.
- Adding a full-featured reusable multi-select component; the filter controls can be purpose-built for this page.

## Decisions

### Use a dedicated `course/attempts` submodule

Attempt list types, mock API/query code, and components will live under `src/course/attempts/`.

Rationale: this follows the existing capability isolation pattern used by `course/page` and `course/access`, keeps route files thin, and makes eventual backend replacement localized.

Alternative considered: implement everything in `attempts.tsx`. This would be faster initially but would make the page hard to maintain because it combines route validation, data fetching, filtering, selection, card rendering, and grading logic in one file.

### Use URL search params only for applied filters

The route will parse `tasks`, `students`, and `graded` search params. The sidebar will maintain a local draft copy and call router navigation only when `Применить` is pressed.

Rationale: issue #24 requires filter state in query parameters, while the disabled `Применить` requirement implies a distinction between edited-but-not-applied state and active state.

Alternative considered: update URL immediately on every checkbox click. This would satisfy shareability but would make the `Применить` disabled-state requirement meaningless.

### Use comma-separated search param lists

Multi-value filters will use compact comma-separated values, for example `?tasks=1,2&students=ivan-ivanov,petr-petrov&graded=no`. Invalid or empty values will normalize to empty filters and `graded=any`.

Rationale: this is readable, simple to validate, and easy to map to the current TanStack Router setup without introducing new dependencies.

Alternative considered: repeated params such as `tasks=1&tasks=2`. That is more expressive, but the route validation and navigation code is simpler with string search values in this app.

### Treat quick grading as local UI state backed by a mock mutation

Quick grade inputs will initialize from the current query data. Save will call a mock mutation and update or invalidate the attempts query. Locked attempts will show disabled inputs and reviewer information.

Rationale: this matches the eventual backend interaction shape while keeping issue #24 frontend-only.

Alternative considered: mutate component state only without a query/mutation layer. That is simpler but creates a different integration shape from the rest of the app and makes later backend replacement noisier.

### Use tooltip/hover-card behavior for disabled bulk grading explanations

A disabled bulk `Оценить` action needs an explanation. Because disabled buttons cannot reliably receive hover events, the trigger will wrap the button in a non-disabled element and render a tooltip/hover content from that wrapper.

Rationale: this meets the issue's tooltip requirement and avoids fighting browser disabled-control behavior.

Alternative considered: put the reason as static text in the bottom bar. That is accessible but does not match the requested hover explanation.

### Defer feedback textarea UI

The quick grading footer will include `Показать поле текста отзыва`, but the textarea will not be implemented. The code will include a TODO referencing issue #25 near the toggle/rendering location. If saving with the toggle off, changed attempts' mock `feedbackText` may be cleared to preserve issue #24 semantics.

Rationale: issue #24 explicitly says the text field design is or will be described in issue #25, and the current review route is still a placeholder.

Alternative considered: add a generic textarea now. That risks diverging from issue #25 and creating rework.

## Risks / Trade-offs

- Mock data may not match the eventual backend shape → keep types focused on page needs and isolate all mock access behind `course-attempts.api.mock.ts` and query hooks.
- URL filter normalization may surprise users if invalid params disappear or are ignored → keep accepted values simple and deterministic.
- Large attempt lists could become slow without virtualization → the initial mock list will be small; the component structure should allow adding virtualization later if needed.
- Bulk action tooltip accessibility can be weak if it is hover-only → also provide the disabled reason through title/ARIA text where practical.
- Quick grade save semantics for feedback text are incomplete until issue #25 → include an explicit TODO and avoid building textarea UI now.
