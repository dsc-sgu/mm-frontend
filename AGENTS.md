# AGENTS.md

## Code style

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

### Imports

Use the `@/` alias for imports that leave the current directory.

Prefer:

```ts
import { CourseScoreField } from '@/course/grading';
import type { Deadline } from '@/deadlines-calendar/model/types';
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
