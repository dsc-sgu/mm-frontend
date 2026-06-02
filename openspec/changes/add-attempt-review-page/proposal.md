## Why

Attempt diff and review routes currently render placeholders, but teachers need a full GitHub-like attempt review workflow for grading submitted work and students need a read-only view of the same feedback. This change completes the missing detailed attempt page behind the existing attempts list actions before backend integration is available.

## What Changes

- Replace the attempt diff placeholder with a mock-backed read-only attempt review page available to the attempt owner and course teachers.
- Replace the teacher-only attempt review placeholder with an editable review page for course teachers.
- Render a GitHub-like file review layout with a changed-files tree, per-file diffs against the previous attempt, line-level comments, and an overall feedback editor.
- Add a WYSIWYG review editor for line comments and overall feedback with bold, italic, inline code, code blocks, internal/external links, images, ordered lists, and unordered lists.
- Add score editing on the teacher review page, constrained by each task's maximum score and supporting fractional scores.
- Add quick attempt-history access with previous/next attempt navigation and detailed previous-attempt cards.
- Use `@pierre/diffs` for diff rendering and `@pierre/trees` for changed-file navigation.
- Move the existing score field out of the attempts-list module into a shared grading module so it can be reused by both quick grading and detailed review.
- Keep all attempt review data frontend-only through mock APIs; no real backend integration is introduced.

## Capabilities

### New Capabilities
- `course-attempt-review`: Detailed attempt diff, review, line comments, overall feedback, score editing, read-only student view, and previous-attempt navigation.

### Modified Capabilities
- `course-route-access`: Attempt diff and review routes change from placeholders to implemented pages while preserving student ownership and teacher-only edit restrictions.

## Impact

- Adds a new `src/course/attempt-review/` submodule for review types, mock API/query code, diff/file-tree/history/editor components, and page composition.
- Adds a shared `src/course/grading/` module for reusable score input and score validation helpers, with attempts-list imports updated accordingly.
- Updates attempt diff and review route components under `src/routes/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/`.
- Adds dependencies for Pierre diffs/trees and a WYSIWYG editor stack.
- Adds narrow, component-scoped styles for the editor/diff review surface without changing the existing attempts-list sidebar sticky behavior.
- Requires Playwright manual verification against `VITE_MOCK_AUTH=true bun run dev`.
