# React + TypeScript + Vite

## Class names

Use `cn()` from `@/shadcn/lib/utils` to combine class names and resolve Tailwind conflicts. It uses `tailwind-merge` directly and accepts strings, falsy values, and nested arrays.

Object-map inputs are not supported; use conditional expressions such as `cn('base', active && 'active')` instead.

## Dependency contracts

Code-block highlighting uses direct dependencies on `shiki` and `@shikijs/themes` with compatible release ranges. Keep the `github-light` and `github-dark` themes as individual dynamic imports instead of importing the full theme bundle.

Header route metadata augments `StaticDataRouteOption` through the direct `@tanstack/react-router` dependency, not its transitive `@tanstack/router-core` package.

### TanStack updates

Update `@tanstack/react-query` within major 5 and `@tanstack/react-router` / `@tanstack/router-plugin` within major 1 together. Router packages are versioned independently; choose versions satisfying the plugin's `@tanstack/react-router` peer range rather than forcing identical version numbers. Keep `@tanstack/react-virtual` out of this update cohort.

After installing the updated dependencies:

1. Run `bun run build` to regenerate `src/routeTree.gen.ts` through the Vite router plugin, and commit the generated changes.
2. Run `bunx tsc -b` after generation to check route loading contexts, navigation parameters/search, and the `StaticDataRouteOption` augmentation against the new tree.
3. Run `bun run lint`, then smoke-check the production bundle with `bun run preview`: login, course list, Course Page, Course Attempts, Attempt review, and browser Back/Forward. Use a teacher session for the attempts and review routes. Mock authorization bypasses the login form, so disable it when checking login.

## Course grading

Attempts and attempt review import grading helpers and score fields directly from `@/features/course/features/grading`.

## Mock authorization

To run the frontend with mock authorization, add this to `.env.local` and restart the Vite dev server:

```env
VITE_MOCK_AUTH=true
```

With mock authorization enabled, the app immediately signs in as `mit-teacher` without showing the login form. This user is a teacher for the “Современные информационные технологии” course and a student in every other mock course.

Remove the flag or set it to `false` to use the real `/api/v1/auth/*` backend endpoints.

## Radix UI

shadcn components import primitives from the single `radix-ui` package. Do not add individual `@radix-ui/react-*` packages as direct dependencies; they may still appear as transitive dependencies in `bun.lock`.

After changing Radix imports or versions, run `bun run lint` and `bun run build`, then smoke-check with mock authorization enabled:

1. Open `/courses/modern-information-technologies/tasks/1` and confirm the header avatar shows the `СП` fallback.
2. Open the avatar menu by clicking it. Close it with Escape, focus the trigger, and reopen it with ArrowDown. Check ArrowDown/ArrowUp navigation between “Настройки” and “Выход”, then Escape closes the menu and returns focus to the trigger.
3. Confirm “Посмотреть попытки студентов” and “Редактировать задание” render as links, not nested buttons, and that the first link navigates to the course attempts.

## Runtime dependency smoke checks

Keep DOMPurify, Sonner, Zustand, and libphonenumber-js updates within their current major versions. After updating them, run `bun install --frozen-lockfile`, `bun run lint`, and `bun run build`, then smoke-check with mock authorization enabled:

1. Open `/courses/modern-information-technologies/tasks/1/attempts/student/1` and confirm the saved review preserves rich-text formatting. Exercise `sanitizeRichTextHtml` in `src/features/course/features/attempt-review/ui/rich-text/sanitize.ts` with scripts, inline event handlers, and unsafe link schemes; these must be removed while HTTPS, email, phone, course-relative, and fragment links remain.
2. Open `/courses/modern-information-technologies/edit`. Change the title and reset it; confirm the original title returns and the unsaved-changes bar disappears. Clear the title and confirm Apply is disabled and Ctrl/Cmd+S shows the validation-error toast. Restore a valid title and apply; confirm the success toast and clean editor state. Ctrl/Cmd+S without changes should show the informational toast.
3. Select text in the course editor, open “Добавить ссылку”, and paste `Позвоните +7 (912) 345-67-89 доб. 42` into “Адрес ссылки”. Confirm it becomes `tel:+79123456789;ext=42`, then apply the link to the selected text.
4. Open `/courses/modern-information-technologies/attempts` and click “Выбрать всё”. Wait for a mock review-lock update; confirm the “Выбор обновлён” warning toast names the attempt taken for review and the selection count decreases.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Linting and formatting

- `bun run lint` reports lint violations and Prettier formatting violations as ESLint errors.
- `bun run format` fixes formatting using `.prettierrc`, including Tailwind class sorting.

`eslint-plugin-prettier/recommended` is the last entry in `eslint.config.js`. It enables Prettier checks and disables conflicting ESLint formatting rules through `eslint-config-prettier`.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
