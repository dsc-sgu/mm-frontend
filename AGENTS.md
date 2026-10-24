# AGENTS.md

## Code style

### Package manager

Use `bun` for package management and scripts.

Prefer:

```bash
bun install
bun add <package>
bun run lint
bun run build
```

Avoid using `npm`, `npx`, `yarn`, or `pnpm` commands unless there is a specific documented reason.

### shadcn components

Add shadcn components through the shadcn CLI instead of writing or copying component files manually.

Prefer:

```bash
bunx shadcn@latest add button
```

Avoid manually creating files under `src/shadcn/components/ui/` unless the component is intentionally custom and not provided by shadcn.

### File and directory naming

- Prefer feature-based structure.
- Directory path should provide global context.
- File name should provide only local meaning.
- Do not repeat feature/module name in every file inside that feature.

Prefer:

```txt
course/attempt-review/ui/file-tree.tsx
course/attempt-review/model/permissions.ts
course/attempt-review/hooks/use-file-scroll.ts
```

Avoid:

```txt
course/attempt-review/attempt-review-file-tree.component.tsx
course/attempt-review/attempt-review-line-comment-permissions.model.ts
```

### File suffixes

Avoid mandatory suffixes like:

```txt
*.component.tsx
*.hook.ts
*.model.ts
*.utils.ts
```

Use directories and meaningful names instead:

```txt
ui/file-tree.tsx
hooks/use-file-scroll.ts
model/permissions.ts
model/save-comments.ts
```

Keep technical suffixes when they are useful for tooling or clarity:

```txt
*.test.ts
*.spec.ts
*.stories.tsx
*.gen.ts
*.d.ts
*.worker.ts
```

### Top-level structure

Product and domain modules should live in `src/features`.
Application shell code should live in `src/app`.
Generic project-level hooks may live in `src/hooks`.

Prefer:

```txt
src/
  app/
    header/
    router-pending.tsx

  features/
    auth/
    course/
    deadlines-calendar/

  hooks/
    use-media-query.ts
```

Avoid placing product features directly under `src/`.
Avoid adding `src/shared` unless there is a clearly justified need.

### Feature module structure

Large feature modules should be split into subdirectories:

```txt
feature/
  page.tsx

  api/
    queries.ts
    mock.ts
    types.ts

  model/
    types.ts
    permissions.ts
    validation.ts
    mappers.ts

  ui/
    component.tsx

  hooks/
    use-something.ts
```

Small features may keep a flatter structure until the number of files makes navigation harder.

### Nested features

If a feature contains both shared layers and sub-features, put sub-features under `features/` inside the parent feature.

Prefer:

```txt
features/course/
  api/
  model/
  routing/
  ui/

  features/
    attempts/
    attempt-review/
    access/
```

Avoid mixing feature folders with shared layer folders at the same level:

```txt
course/
  api/
  model/
  routing/
  ui/
  attempts/
  attempt-review/
  access/
```

Create a nested feature when the module has its own user flow, domain language, data loading, page, or independently meaningful UI/model.
Keep code in the parent `api/model/ui/routing` when it is shared by multiple nested features or describes the parent context itself.

### Imports

Use the `@/` alias for imports that leave the current directory.

Prefer:

```ts
import { CourseScoreField } from '@/features/course/features/grading';
import type { Deadline } from '@/features/deadlines-calendar/model/types';
```

Avoid parent-relative imports:

```ts
import { CourseScoreField } from '../../grading';
import type { Deadline } from '../model/types';
```

Same-directory imports are allowed:

```ts
import { DayCell } from './day-cell';
```

### Types

Use `type` by default.

Prefer:

```ts
type User = {
  id: string;
  name: string;
};

type Role = 'student' | 'teacher';
```

Avoid using `interface` unless declaration merging, module augmentation, or global augmentation is intentionally needed.

Allowed:

```ts
declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}
```

### State modeling

Prefer explicit algebraic data types (ADT) with discriminated unions for UI and domain state.

Use union variants when a state has mutually exclusive modes, phases, or lifecycle steps.

Prefer:

```ts
type SaveState =
  | { status: 'idle' }
  | { status: 'dirty'; draft: Draft }
  | { status: 'saving'; draft: Draft }
  | { status: 'failed'; draft: Draft; error: string };
```

Avoid parallel booleans or optional fields that can describe impossible states:

```ts
type SaveState = {
  isDirty: boolean;
  isSaving: boolean;
  error?: string;
};
```

When state changes follow a lifecycle, model them as an explicit finite state machine (FSM):

- name states with domain language;
- name events/actions with domain language;
- keep transition logic in `model`;
- keep rendering logic in `ui`;
- make impossible transitions impossible or explicit no-ops.

Prefer small transition functions or reducers before adding an FSM library:

```ts
type CommentState =
  | { status: 'draft'; html: string }
  | { status: 'saved'; html: string }
  | { status: 'editing'; html: string; savedHtml: string }
  | { status: 'pending-delete'; html: string };

type CommentEvent =
  | { type: 'submit'; html: string }
  | { type: 'edit' }
  | { type: 'cancel' }
  | { type: 'delete' };

function transitionComment(
  state: CommentState,
  event: CommentEvent
): CommentState | null {
  // null may represent removal when that is the domain behavior.
}
```

Do not add FSM libraries such as `xstate` or `robot` by default. This does not apply to Zustand: it is not an FSM library but the project's state container (see "Where state lives"); transitions inside it are still explicit functions following the ADT/FSM rules above. Consider them only when local reducers/transition functions are no longer enough, for example with nested states, parallel states, long-running actors, retries, or complex async workflows.

#### Where state lives

- **State of one component** (or a component and its direct children): `useState` / `useReducer`. If the state has a lifecycle, the transitions are a pure function in `model/`.
- **Server data**: TanStack Query (see `docs/agents/remote-data.md`).
- **Zustand vanilla store**: for state that is rendered and must be reacted to, when at least one of these holds:
  - several components share it and would otherwise need props or callbacks threaded through multiple levels;
  - it outlives the component that shows it;
  - it changes from outside React (Workers, timers, subscriptions, external objects with callbacks);
  - its transition logic must be tested without React.
- **How a store is built:**
  - `createStore` from `zustand/vanilla` in the feature's `model/`, next to the transitions;
  - one instance per route/page lifetime, passed through context;
  - read with `useStore(store, selector)` inside `hooks/`;
  - resources that are not rendered (Workers, subscriptions) live in the store's closure, not in its state.
  - Examples: `page-edit/model/editor-store` + `page-edit/hooks/use-editor-store.ts`, `attempt-review/model/diff-readiness.ts` + `hooks/use-diff-readiness.ts`.
- **Non-reactive cell or cache is not a store.** If data is written on change and read only on mount (e.g. an initial `useState` value), there are no subscribers: use a plain object (`Map`) in context or a `useRef` lifted above the unmount point. Zustand adds nothing here, and a `set` per change would copy the data. Example: `attempt-review/model/unsent-comment-text.ts`.
- **Do not hand-write** `listeners` / `subscribe` / `getSnapshot` / subscriber fan-out.
- **`useSyncExternalStore`** is only for adapters to browser APIs (`matchMedia`, `MutationObserver`, …), like `src/hooks/use-media-query.ts`. ESLint enforces this with `no-restricted-imports`, the same way `no-nested-ternary` is enforced.
- **State needed before the bundle loads** (e.g. the theme set by the inline script in `index.html`) lives in the DOM / `localStorage`; React reads it through an adapter instead of duplicating it in a store.

A store is not needed for the state of a single component.

### Remote data

Before adding or modifying code that performs HTTP requests, consumes external response data, defines API DTO schemas, configures TanStack Query queries or mutations, handles request failures or cancellation, implements retry or idempotency behavior, or defines MSW handlers, MUST read [`docs/agents/remote-data.md`](docs/agents/remote-data.md).

### People in contracts

A person in a DTO or domain type is its identity plus the parts of the Full Name: `{ id: UserId, lastName, firstName, patronymic? }` (compose `FullNameSchema` from `@/features/auth/model/full-name`). A patronymic is always optional: an omitted field and an empty string both mean none. Only the frontend joins the parts, through `formatFullName()`, which gives «Фамилия Имя Отчество». Compare people by `id`, never by a name or `username`. Known exception until #259: the course Teacher in `loadCourses` has no `id` and lists key it by `username`; do not copy it.

Do not add a pre-joined name string (`name`, `fullName`, `authorName`, `gradedBy`, `teacherName`) or a local name formatter. Legacy aggregates still carry such strings, e.g. `features/attempts`; when moving one to new operations, replace the string with the parts instead of carrying it over.

### Valibot schemas

Place schemas by the owner of the contract, not by the validation library:

- Domain values, identities and shared domain invariants belong in the owning feature's `model/`.
- HTTP request/response DTO schemas belong in the owning feature's `api/`. Keep an operation-specific schema private next to its operation; extract an API-local file named by responsibility only when several operations share it.
- Form schemas belong with the form's model/validation logic in the owning feature's `model/`. Compose shared domain schemas instead of copying their constraints.
- Route parameter parsing belongs in the feature's `routing/`; reuse domain schemas for domain locators.

Schema-bearing feature modules use these layer directories even when the rest of a small feature remains flat. Do not create a global `src/schemas/` or a `schemas/` directory in every feature.

Keep schema-derived types next to the schema. Use `InferOutput` for validated values and `InferInput` where the raw input differs, such as transformed form fields. Do not duplicate the validated shape with a manually maintained DTO type.

UI, hooks and application routes consume feature-owned operations, validation interfaces or form resolvers; they do not define schemas or depend on runtime Valibot. They may import a model-owned schema to pass to a resolver and may use type-only Valibot imports. A domain model must not depend on an API DTO schema, and a DTO schema must not be moved into `model/` merely because multiple API operations use it.

ESLint enforces the direct runtime Valibot dependency boundary: static imports/re-exports, literal dynamic imports and `require('valibot')` are allowed only in feature `api/`, `model/` and `routing/`. Exceptions are the generic transport validator (`src/app/remote-data/http.ts`), `src/app/mock-backend/`, and test files/harnesses (`src/**/*.test.{ts,tsx}`, `src/app/testing/`, `playwright/`). Whole-declaration `import type`/`export type` is allowed elsewhere. Per-specifier `import/export { type T }` retains a runtime module dependency under `verbatimModuleSyntax` and is not exempt. Semantic ownership, copied constraints, computed module names and schemas hidden behind other modules still require review.

### `types.ts`

Do not create `types.ts` automatically in every feature.

Use `model/types.ts` only for shared public domain types used by multiple files in the feature.

Keep local types near usage:

- component props near the component;
- helper input/output types near the helper;
- schema-derived types near the schema;
- API DTOs in `api/types.ts` if they are shared across API modules.

### Utilities

Avoid vague files like:

```txt
utils.ts
helpers.ts
common.ts
misc.ts
```

Name files by responsibility:

```txt
permissions.ts
storage.ts
validation.ts
normalize-search.ts
save-comments.ts
date-format.ts
mapper.ts
schema.ts
guards.ts
```

### Tailwind

Prefer semantic design tokens over raw palette classes when possible:

```txt
text-destructive
text-muted-foreground
bg-card
bg-background
border-border
```

Use raw palette classes only when the color is part of the domain meaning, such as course colors, diff added/deleted colors, or status tones.

Do not keep very long Tailwind class strings on one line. Use `cn()` with logical grouping for one-off long class lists.

Use `cva` for reusable components with variants, sizes, tones, or visual states. `cva` accepts arrays of class strings; use arrays to group long base or variant classes by purpose instead of keeping one very long string.

Do not extract Tailwind class lists into constants just to shorten JSX. Extract only when reused or when the name represents a real UI concept. If a class list grows because the UI chunk is complex, prefer extracting a component.

Do not put Tailwind class logic in `model`. Keep Tailwind classes in `ui`, local component files, or UI theme files.

Avoid dynamically constructing Tailwind class names with template strings. Use explicit maps instead.

Keep `src/index.css` for global theme/base styles only. Avoid adding feature-specific styles there.

For feature-specific CSS that cannot be expressed cleanly with Tailwind utilities, use CSS modules colocated with the feature/component:

```txt
features/course/features/attempt-review/ui/rich-text/editor.module.css
features/deadlines-calendar/ui/calendar.module.css
app/router-pending.module.css
```

### ESLint

The project should enforce type aliases over interfaces:

```ts
'@typescript-eslint/consistent-type-definitions': ['error', 'type']
```

Nested ternaries are forbidden by `'no-nested-ternary': 'error'`. Rewrite a chain as early returns or a `switch` in a small function, an explicit map, a `cva` variant, or a component/function that returns the markup of each mode.

## Agent skills

### Issue tracker

Tickets are Markdown files on the orphan branch `tickets`, managed with `tk`; GitHub Issues are a frozen archive. See `docs/agents/issue-tracker.md`.

### Language of issues

Write issues, issue comments, ADRs and prototype documents in Russian, for a human reader. This includes titles, user stories and test names in prose.

- Name domain and engineering concepts by their `_По-русски_` rendering from `CONTEXT.md`, not by the English term: «преподаватель публикует версию проверки», not «Teacher публикует Review Revision». Decline Russian terms normally; do not attach Russian endings to English words («Student'а»).
- Keep in English only what a reader would search for or copy: code identifiers, statuses and file paths in backticks, library and technology names (Plate, MSW, Playwright, Web Worker), issue and contract ids (REV-12, TAB-08).
- Write backend and frontend in Cyrillic and decline them: «бэкенд», «фронтенд» («вопросы к бэкенду», «решение фронтенда»). Keep the Latin spelling only inside code, paths, repository names (`mm-backend`) and quoted titles of existing issues.
- Call an issue «тикет» when it means a unit of work («связанные тикеты», «тикет бэкенда»). Keep «issues» only where GitHub Issues as a place is meant («архив issues на GitHub»).
- Quote UI text exactly as shown, in «».
- If a concept has no Russian rendering in `CONTEXT.md`, choose one with the user and add it to the glossary before using it, instead of falling back to English.

### Triage labels

Triage uses the five default canonical label names as `tk` tags. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses a single-context layout. See `docs/agents/domain.md`.
