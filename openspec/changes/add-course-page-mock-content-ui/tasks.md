## 1. Content Model and Mock API

- [x] 1.1 Export shared course mock summary data from `src/course/course.api.mock.ts` for reuse by the course page mock API.
- [x] 1.2 Add editor-friendly course page content types with rich text nodes, supported block unions, stable `id`, and LexoRank-style `rank` fields.
- [x] 1.3 Add a rank sorting utility that orders sibling items by `rank` and uses `id` as a deterministic tie-breaker.
- [x] 1.4 Implement `fetchCoursePage` mock API with descriptions and representative course content, excluding video blocks.
- [x] 1.5 Add React Query options and hook for loading course page mock data by course slug.

## 2. Rendering Components

- [x] 2.1 Add a rich text renderer that supports plain text, bold, italic, internal links, and external links.
- [x] 2.2 Add a course content block renderer for paragraphs, headings, quotes, lists, spoilers, code, images, files, and assignments.
- [x] 2.3 Render spoiler blocks as clickable/keyboard-accessible collapsible sections with nested rank-ordered content.
- [x] 2.4 Render assignment blocks as cards that link to the existing course task route.
- [x] 2.5 Extract or centralize reusable course color theme classes for use by both course cards and the course page hero.

## 3. Course Page UI and Route Integration

- [x] 3.1 Build the course page component with a hero section showing title, description, teachers, icon, and course color styling.
- [x] 3.2 Build loading and not-found states for the course page route.
- [x] 3.3 Replace the course root placeholder route with query-backed rendering of the new course page UI.
- [x] 3.4 Ensure the page is responsive and readable in light and dark themes.

## 4. Verification

- [x] 4.1 Run lint and fix any reported issues.
- [x] 4.2 Run the production build and fix any TypeScript or bundling issues.
