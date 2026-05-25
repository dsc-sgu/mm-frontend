## Context

The authenticated course route tree and access guards already exist. The route `/courses/$courseSlug` currently passes through course access checks and then renders only a placeholder. Course summary mock data already exists for dashboard cards, including title, teachers, icon, and color. The new course root page needs to reuse that summary data, add a mock-only description and structured content, and render a production-quality read-only page.

The content model should anticipate a later Notion-like editor. That means content must be serializable, normalized enough to support reordering, and independent from React components. Blocks need stable IDs, type discriminators, and LexoRank-style `rank` strings for sibling ordering. UI renderers should sort by `rank` rather than relying on array order.

## Goals / Non-Goals

**Goals:**
- Implement a mock-backed course root page UI for authenticated course participants.
- Define an editor-friendly block content model with stable `id` and sibling `rank` fields.
- Render rich text marks and links in content blocks.
- Render paragraphs, headings, quotes, ordered and unordered lists, collapsible spoilers, code blocks, images, file lists, and assignment cards.
- Keep the mock API isolated from the real backend API.
- Reuse existing course summary/card visual language where practical.

**Non-Goals:**
- Integrating with the real backend course content API.
- Implementing the Notion-like editor itself.
- Implementing block mutations, drag-and-drop, optimistic updates, or persistence.
- Rendering video blocks.
- Replacing placeholders for other course subroutes such as attempts, journal, files, repositories, stats, or task pages.

## Decisions

### 1. Use a discriminated union block model with `id` and `rank`

Each content block will include `id`, `rank`, and `type`. The `type` field selects the block payload and renderer. The `rank` field is a string order key comparable lexicographically for sibling ordering.

Alternatives considered:
- **Array index ordering only:** simpler for read-only UI, but fragile for future editor insertions and reorder operations.
- **Numeric order field:** easier to understand, but inserting between adjacent blocks can require broad renumbering.

The chosen shape mirrors editor needs while remaining easy to mock.

### 2. Sort at render/query boundary with a small reusable helper

A `sortByRank` helper will return a copy sorted by `rank`, with `id` as a deterministic tie-breaker. Renderers will use it for top-level blocks, spoiler children, and list items.

Alternatives considered:
- **Pre-sort mock arrays only:** hides ordering assumptions and fails when later APIs return unsorted data.
- **Sort in every component inline:** duplicates logic and risks inconsistent tie-breaking.

### 3. Keep rich text separate from block types

Inline content will be represented by `RichTextNode[]`, where text and links can both carry marks such as `bold` and `italic`. Block renderers delegate inline rendering to a dedicated `CourseRichText` component.

Alternatives considered:
- **Markdown strings:** compact, but less editor-friendly and harder to update partially.
- **React nodes in mock data:** convenient for UI, but not serializable and unsuitable for a future backend/editor model.

### 4. Use native disclosure semantics for spoilers

Spoilers will render as a styled `<details>` with `<summary>`, using the block's `defaultOpen` as initial open state. This gives keyboard-accessible collapse/expand behavior without additional dependencies.

Alternatives considered:
- **Custom controlled disclosure state:** more flexible, but unnecessary until editor interactions require programmatic control.
- **Static expanded section:** would not satisfy the spoiler behavior.

### 5. Isolate page composition from block rendering

The implementation will split into mock API/query modules, rich-text renderer, block renderer, and page-level component. The route will only handle query states and render the page component.

Alternatives considered:
- **Implement all rendering inside the route file:** faster initially, but difficult to maintain and harder to reuse in an editor preview.

## Risks / Trade-offs

- [Mock content diverges from future backend schema] → Keep the model minimal, serializable, and editor-oriented so backend integration can map to it or evolve it with limited UI churn.
- [LexoRank values in mock data are only illustrative] → Treat `rank` as an opaque string and centralize sorting; do not implement rank generation in this read-only change.
- [Recursive spoilers could render very deep trees] → Current mock data will keep nesting shallow; future editor/backend validation can enforce depth limits if needed.
- [Native `<details>` styling varies by browser] → Use Tailwind classes and semantic markup; accept minor native differences for accessibility and low complexity.
- [Course hero duplicates some card styling] → Extract shared color theme constants to avoid color drift between dashboard cards and course hero.
