## Why

Course root pages currently render placeholder text, but users need an actual course overview where they can read course information and structured learning materials. This should be implemented against frontend mock data now so the page UI and content model can be validated before integrating a real backend or Notion-like editor.

## What Changes

- Replace the course root placeholder with a full course page UI backed by a frontend mock API.
- Add a course hero section that shows course title, description, teachers, icon, and existing course color styling.
- Add an editor-friendly block content model with stable block IDs and LexoRank-style `rank` ordering for sibling blocks.
- Render course content blocks for paragraphs, three heading levels, quotes, ordered and unordered lists, collapsible spoilers, code blocks, images, files, and assignments.
- Render inline rich text with bold, italic, internal links, and external links.
- Do not add video blocks in this change.
- Do not integrate with the real backend API in this change.

## Capabilities

### New Capabilities
- `course-page-content`: Course root pages display mock-backed course overview content using structured, rank-ordered content blocks.

### Modified Capabilities
- `course-route-access`: Course participant access to the course root route renders the implemented course page instead of a placeholder.

## Impact

- Affected code: `src/course/*`, `src/routes/_authenticated/courses/$courseSlug/index.tsx`, and shared course mock data.
- Adds frontend-only mock API/query modules for course page content.
- Adds renderer components for rich text and course content blocks.
- No backend API, database, auth, or dependency changes are required.
