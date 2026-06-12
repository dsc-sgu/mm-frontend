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

### ESLint

The project should enforce type aliases over interfaces:

```ts
'@typescript-eslint/consistent-type-definitions': ['error', 'type']
```
