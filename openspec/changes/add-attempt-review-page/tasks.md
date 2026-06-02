## 1. Dependencies and shared grading module

- [x] 1.1 Add `@pierre/diffs`, `@pierre/trees`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, and `@tiptap/extension-placeholder` to project dependencies.
- [x] 1.2 Create `src/course/grading/` for shared course grading UI and helpers.
- [x] 1.3 Move the existing score field component from `src/course/attempts/course-attempts.score-field.component.tsx` to the shared grading module.
- [x] 1.4 Move reusable score input normalization, text sizing, and max-score validation helpers from attempts quick grading into the shared grading module.
- [x] 1.5 Update attempts-list quick grading imports to use the shared grading module without changing attempts-list behavior.

## 2. Attempt review data model and mock API

- [x] 2.1 Create `src/course/attempt-review/attempt-review.types.ts` with attempt detail, changed file, file diff contents, line comment, rich feedback, grade, and attempt history types.
- [x] 2.2 Create mock attempt review data with multiple attempts per student/task, representative changed files, nested paths, added/deleted/changed files, saved line comments, saved overall feedback, and graded/ungraded states.
- [x] 2.3 Implement `fetchAttemptReview` in `attempt-review.api.mock.ts` to return the current attempt aggregate and compare it with the previous attempt or an empty baseline.
- [x] 2.4 Implement `saveAttemptReview` in `attempt-review.api.mock.ts` to persist score, overall feedback, and line comments in frontend mock memory.
- [x] 2.5 Keep mock score updates consistent with the attempts-list mock data where practical so reviewed attempts show updated grading status after returning to the attempts list.
- [x] 2.6 Add TanStack Query options/hooks and a save mutation in `attempt-review.queries.ts` with invalidation for attempt review and attempts list query keys.

## 3. WYSIWYG editor

- [x] 3.1 Add `RichTextEditor` under `src/course/attempt-review/` using Tiptap with StarterKit, Link, Image, and Placeholder extensions.
- [x] 3.2 Implement toolbar controls for bold, italic, inline code, code block, internal/external links, image URL insertion, ordered lists, and unordered lists.
- [x] 3.3 Support controlled editor value changes for editable mode and static formatted rendering for read-only mode.
- [x] 3.4 Add accessible labels/titles and focus states for editor toolbar controls.
- [x] 3.5 Add narrow editor-specific styles only under review-specific classes, avoiding global sticky or overflow changes.

## 4. Diff viewer and line comments

- [x] 4.1 Create `AttemptReviewDiff` that renders changed files using `@pierre/diffs/react` with split or GitHub-like diff options.
- [x] 4.2 Convert review line comments into Pierre Diffs `lineAnnotations` keyed by file path, side, and line number.
- [x] 4.3 Render line comment cards through Pierre Diffs annotation rendering, using `RichTextEditor` in editable mode and read-only rich content in read-only mode.
- [x] 4.4 Add editable-mode line comment creation from diff line or gutter interactions.
- [x] 4.5 Ensure read-only mode hides comment creation controls and editor toolbars while preserving existing comment display.
- [x] 4.6 Add empty/no-diff and loading states for the diff area.

## 5. Changed-file tree and attempt history

- [x] 5.1 Create `AttemptReviewFileTree` using `@pierre/trees/react` with changed file paths, search enabled, initial expansion open, and active file selection.
- [x] 5.2 Show per-file added/deleted counts or status indicators alongside the file navigator where supported by the component composition.
- [x] 5.3 Wire file selection to focus or scroll to the corresponding file diff.
- [x] 5.4 Create `AttemptReviewHistory` with previous-attempt cards showing attempt number, submission time, score, diff stats, and comment count.
- [x] 5.5 Add previous/next attempt controls in a compact sticky page header or top review bar.
- [x] 5.6 Ensure history navigation preserves course slug, task id, student username, and the correct read-only/editable route mode.

## 6. Attempt review page composition

- [x] 6.1 Create `AttemptReviewPage` that accepts `mode: 'editable' | 'readonly'`, route params, and renders the review aggregate query state.
- [x] 6.2 Build the desktop layout with a changed-file sidebar, main diff column, and review/history side panel without altering attempts-list sidebar styles.
- [x] 6.3 Build the mobile layout with collapsible or stacked file/history controls above the diff.
- [x] 6.4 Add overall feedback editor, score field, max-score label, validation error, saved grade metadata, and save/discard controls for editable mode.
- [x] 6.5 Hide or disable all mutation controls in read-only mode while showing score, overall feedback, line comments, diffs, and history.
- [x] 6.6 Track draft changes for score, overall feedback, and line comments so save is enabled only when valid changes exist.
- [x] 6.7 Save valid teacher review drafts through the mock mutation and refresh query data after success.

## 7. Route wiring and access behavior

- [x] 7.1 Replace the base attempt route placeholder with `AttemptReviewPage` in read-only mode.
- [x] 7.2 Replace the teacher review route placeholder with `AttemptReviewPage` in editable mode while preserving its teacher-only guard.
- [x] 7.3 Preserve parent attempt route validation for positive attempt IDs, valid student usernames, student ownership, and teacher access to known students.
- [x] 7.4 Ensure breadcrumbs still render sensible attempt labels for the read-only and editable routes.
- [x] 7.5 Verify attempts-list card navigation still opens `/review` for grading and the base attempt route for read-only viewing.

## 8. Verification

- [x] 8.1 Run dependency install and verify the generated lockfile is updated.
- [x] 8.2 Run `bun run build` and fix TypeScript or route generation issues.
- [x] 8.3 Run `bun run lint` and fix lint issues.
- [x] 8.4 Start the app with `VITE_MOCK_AUTH=true bun run dev` for manual and Playwright verification.
- [x] 8.5 Use Playwright to verify a teacher can open an editable attempt review page, add a line comment, edit overall feedback, enter a valid fractional score, and save.
- [x] 8.6 Use Playwright to verify score validation rejects values above the maximum score.
- [x] 8.7 Use Playwright to verify the base attempt page is read-only and mutation controls are hidden.
- [x] 8.8 Use Playwright to verify previous/next attempt navigation and changed-file tree navigation.
- [x] 8.9 Use Playwright to verify the existing attempts list page still renders and its desktop filter sidebar remains sticky during scroll.
