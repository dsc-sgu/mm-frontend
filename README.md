# React + TypeScript + Vite

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

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

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
