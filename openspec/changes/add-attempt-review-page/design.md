## Context

The course task attempt diff route and teacher review route already exist and have access guards, but both render placeholder text. The attempts list page links unselected attempts to the teacher review route and selected attempts to the attempt diff route, so the detailed page is the next missing part of the grading workflow.

The frontend currently uses mock-backed course and attempts data. The detailed review page must follow that pattern: implement a production-shaped UI and query/mutation seams without introducing a real backend contract. Existing attempt list code owns a reusable-looking score input, but it currently lives inside `src/course/attempts/`, which would make detailed review depend on attempts-list internals unless it is extracted.

The requested review experience is close to GitHub pull request review: changed-file navigation, diffs against the previous attempt, line comments, and an overall review message. The implementation must use the Pierre libraries documented at `diffs.com` and `trees.software`, and must avoid broad global CSS changes that could break the existing attempts-list sticky filter sidebar.

## Goals / Non-Goals

**Goals:**

- Implement a shared detailed attempt page that supports editable teacher review and read-only student/teacher viewing.
- Show diffs for the current attempt compared with the previous attempt, or with an empty baseline for the first attempt.
- Allow teachers to add and edit per-line comments and an overall review message through a WYSIWYG editor.
- Allow teachers to set a fractional score bounded by the task maximum score.
- Show previous attempts and provide quick previous/next navigation without losing the course/task/student URL context.
- Use `@pierre/diffs` for diff rendering and `@pierre/trees` for file navigation.
- Keep detailed review API/query code isolated in a new `course/attempt-review` submodule.
- Extract reusable score-field code into a shared `course/grading` module and update attempts-list imports.
- Verify the page with Playwright while running the app through `VITE_MOCK_AUTH=true bun run dev`.

**Non-Goals:**

- Integrating with a real backend or defining a final backend DTO contract.
- Implementing true collaborative review locks beyond what current mock data can display.
- Implementing persistent storage across full page reloads.
- Supporting file uploads for images in the WYSIWYG editor; image insertion can use URLs in this frontend-only change.
- Changing the attempts-list layout or its sticky sidebar behavior except for import updates caused by score-field extraction.
- Building a complete markdown/HTML sanitization pipeline for production backend content; mock editor content can stay inside the local frontend data model.

## Decisions

### Use a dedicated `course/attempt-review` submodule

Attempt review types, mock API, query hooks, page composition, diff UI, file tree, history panel, and editor components will live under `src/course/attempt-review/`.

Rationale: the detailed page has enough domain state to be a separate capability from the attempts list. This keeps route files thin and avoids expanding `course/attempts` into a catch-all for every attempt-related feature.

Alternative considered: add detailed review code to `src/course/attempts/`. That would reuse nearby types but would blur the attempts-list capability boundary and make the detailed page harder to replace with a backend-specific integration later.

### Reuse one page component with explicit mode

Both routes will render the same `AttemptReviewPage` with `mode: 'editable' | 'readonly'`. The teacher-only `/review` route passes editable mode, while the base attempt route passes read-only mode.

Rationale: teachers and students must see the same review surface, with only editing controls disabled for students/read-only viewers. A single component avoids divergent layouts and makes the read-only state easy to test.

Alternative considered: separate teacher and student page components. That would simplify some conditional rendering initially, but duplication would increase the chance that the student read-only page drifts away from the teacher review page.

### Model review data as a full page aggregate

The mock API will return one aggregate containing the current attempt, previous/next attempt summaries, changed files with old/new contents, existing line comments, overall feedback, and current grade. Save mutation input will include line comments, overall feedback, and score.

Rationale: the detailed page needs all of this data at once to render the GitHub-like review experience. Aggregating it behind one query produces a clean eventual backend seam and avoids many small mock queries.

Alternative considered: compose from the existing attempts list query plus separate file/review queries. That would reuse some data, but route entry would become more complex and the mock shape would be less representative of a future detail endpoint.

### Use Pierre diff annotations for line comments

The diff component will pass line comments as `lineAnnotations` to `@pierre/diffs/react` and render comment cards through `renderAnnotation`. In editable mode, gutter utility or line click interactions create a draft comment for the selected side/line.

Rationale: Pierre Diffs already provides annotation and interaction APIs for injecting comments and selecting/highlighting lines, matching the requested GitHub-style review behavior.

Alternative considered: render a custom hand-written diff table. That would give complete control but ignores the required dependency and would be significantly more error-prone for syntax highlighting, split/unified layout, and large diffs.

### Use Pierre Trees as a changed-file navigator

The review page sidebar will instantiate `@pierre/trees/react` with changed file paths, search enabled, and initial expansion open. Selection changes will update the active file and scroll/focus the matching diff section.

Rationale: this satisfies the requested `trees.software` usage and gives a scalable file navigator without implementing tree projection manually.

Alternative considered: render a simple `<ul>` of files. That would be enough for small mock data but would not exercise the intended library and would scale poorly for nested paths.

### Use Tiptap for WYSIWYG editing

A reusable `RichTextEditor` will wrap Tiptap with StarterKit, Link, Image, and Placeholder extensions. It will expose controlled HTML strings for mock persistence and a read-only mode for student views.

Rationale: the requested formatting set includes marks, code blocks, links, images, and lists. Tiptap covers these interactions cleanly in React without building a custom contenteditable framework.

Alternative considered: store plain markdown and use a textarea. That would not be WYSIWYG. Another option is adding a heavier editor package, but Tiptap is already modular and sufficient for the required toolbar.

### Extract score field into `course/grading`

The existing attempts quick-grading score input and score draft helpers will move to a shared course grading module. Attempts-list code will import from that module, and detailed review will reuse the same component/helper behavior.

Rationale: a score field is cross-feature course grading UI, not attempts-list-specific UI. Extracting it prevents detailed review from depending on a sibling capability's private component.

Alternative considered: duplicate a new input in the review page. That would avoid touching attempts-list imports but would create inconsistent validation and styling.

### Keep review-specific CSS narrow

Any extra CSS will use review-specific classes, for example `.attempt-review-editor`, and component-local Tailwind classes. The change will not alter global `aside`, `main`, `section`, overflow, or sticky styles.

Rationale: the attempts list has a sticky desktop filter sidebar and sticky mobile drawer controls. Broad CSS changes could unintentionally break that page.

Alternative considered: add global prose/editor styles. That is quick, but it risks applying to course content, code blocks, or attempts-list sidebars unexpectedly.

## Risks / Trade-offs

- Pierre library APIs may require adaptation after installation → inspect installed types and keep wrapper components small so integration fixes are localized.
- Tiptap HTML in mock data is not a production-safe persistence model → keep it explicitly mock-only and avoid implying backend sanitization is solved.
- The detailed review mock aggregate may diverge from the eventual backend → isolate all conversion behind `attempt-review.api.mock.ts` and `attempt-review.types.ts`.
- Line comments in split diffs have side/line-number ambiguity → store comments with explicit `side: 'deletions' | 'additions'` and `lineNumber`.
- Large diffs could be heavy → use Pierre's virtualization-oriented components/options where practical and keep mock data representative but not enormous.
- Extracting score helpers can break attempts-list quick grading imports → include build/lint checks and a Playwright smoke test of the attempts list sticky sidebar after the move.
- WYSIWYG toolbar controls can be inaccessible if implemented as icons only → provide labels/titles and preserve keyboard focus states.

## Migration Plan

1. Add dependencies and shared grading module.
2. Update attempts-list imports to use the shared grading module and verify the list still builds.
3. Add attempt-review mock data/query layer and page components.
4. Replace route placeholders with read-only/editable page wiring.
5. Add narrow review/editor styles if needed.
6. Run build/lint and Playwright smoke checks with `VITE_MOCK_AUTH=true bun run dev`.

Rollback is straightforward: revert the route files to placeholders, remove the new submodules/dependencies, and restore attempts-list imports from the previous local score-field helpers.

## Open Questions

- The final backend content format for WYSIWYG feedback is not known; this change will use controlled HTML for the mock layer.
- Exact review-lock acquisition semantics are not defined; this change will not introduce new locking behavior beyond preserving existing access restrictions and mock review state.
