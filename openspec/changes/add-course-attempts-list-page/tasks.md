## 1. Data model and mock API

- [x] 1.1 Create `src/course/attempts/` with types for attempts, tasks, students, filters, grading status, diff stats, grades, and review locks.
- [x] 1.2 Add a frontend-only mock attempts API with representative tasks, students, ungraded attempts, graded attempts, late/on-time submissions, diff stats, max scores, existing feedback text, and review-locked attempts.
- [x] 1.3 Implement filter normalization and mock filtering for `tasks`, `students`, and `graded` values.
- [x] 1.4 Add TanStack Query options/hooks for fetching the attempts list by `(courseSlug, filters)` and a mock mutation for saving quick grade updates.

## 2. Route search params and page wiring

- [x] 2.1 Update `/courses/$courseSlug/attempts` route to validate/normalize search params for `tasks`, `students`, and `graded`.
- [x] 2.2 Replace the attempts placeholder with a `CourseAttemptsPage` component imported from the attempts submodule.
- [x] 2.3 Preserve the existing teacher-only `beforeLoad` guard for the attempts route.
- [x] 2.4 Ensure route search updates are used when filters are applied and invalid/empty filter values normalize deterministically.

## 3. Shared UI primitives

- [x] 3.1 Add a shadcn-style checkbox component compatible with the existing styling and Radix dependency setup.
- [x] 3.2 Add a shadcn-style tooltip component for disabled bulk action explanations.
- [x] 3.3 Avoid adding textarea UI for quick feedback text in this change.

## 4. Attempts list layout and cards

- [x] 4.1 Build the main attempts page layout with a responsive left filter sidebar, scrollable content area, and sticky bottom action area.
- [x] 4.2 Implement attempt cards showing checkbox, attempt/task title, student, group/subgroup, submission timestamp, deadline timing, grading status, diff statistics, and primary action.
- [x] 4.3 Wire the unselected card `Оценить` action to the attempt review route.
- [x] 4.4 Wire the selected card `Посмотреть` action to the attempt diff route.
- [x] 4.5 Add loading and empty states for attempts query results.

## 5. Filter sidebar behavior

- [x] 5.1 Implement task and student filter sections with checkbox options and local search fields.
- [x] 5.2 Implement grade-status filter controls for `Неважно`, `Нет`, and `Да`.
- [x] 5.3 Keep sidebar draft filter state separate from applied URL filters.
- [x] 5.4 Disable `Применить` when the draft filters match the applied filters.
- [x] 5.5 Apply draft filters by navigating with normalized URL search params.

## 6. Selection and bulk actions

- [x] 6.1 Implement attempt selection state and card checkbox toggling.
- [x] 6.2 Implement `Выбрать всё` for all currently visible attempts.
- [x] 6.3 Show selection bottom actions when one or more attempts are selected, including `Очистить выбор`, `Оценить`, and `Продлить дедлайн`.
- [x] 6.4 Disable bulk `Оценить` when selected attempts have different maximum scores and expose a tooltip reason.
- [x] 6.5 Disable bulk `Оценить` when selected attempts include review-locked attempts and expose a tooltip listing those attempts.
- [x] 6.6 Enter quick grading mode from enabled bulk `Оценить` for the selected attempts only.

## 7. Quick grading mode

- [x] 7.1 Enter quick grading mode from `Быстрая оценка` for all currently visible attempts when no selection is active.
- [x] 7.2 Render quick grading cards with score inputs, maximum score labels, and the same attempt metadata as normal cards.
- [x] 7.3 Disable score inputs for review-locked attempts and show the reviewing teacher name.
- [x] 7.4 Track score draft changes and enable `Сохранить` only when there are changes.
- [x] 7.5 Save quick grade changes through the mock mutation, refresh/invalidate attempts query data, and keep applied filters intact.
- [x] 7.6 Exit quick grading with `Выйти из быстрой оценки` and discard unsaved drafts.
- [x] 7.7 Render `Показать поле текста отзыва` in the quick grading bottom bar without rendering a textarea.
- [x] 7.8 Add a TODO comment near the feedback toggle/rendering location noting that issue #25 should define and implement the feedback textarea.
- [x] 7.9 When saving with the feedback text toggle off, clear mock feedback text for changed attempts as allowed by the issue semantics.

## 8. Verification

- [x] 8.1 Run lint and build checks and fix any TypeScript, lint, or generated route tree issues.
- [x] 8.2 Manually verify teacher access to `/courses/[courseSlug]/attempts` renders the implemented page and student access still redirects.
- [x] 8.3 Manually verify URL filters, disabled `Применить`, selection actions, disabled bulk grading tooltip reasons, and quick grading save behavior.
- [x] 8.4 Manually verify no feedback textarea is rendered and the issue #25 TODO comment exists in code.
