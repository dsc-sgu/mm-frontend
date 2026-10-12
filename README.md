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
3. Run `bun run lint`, then smoke-check in the dev server with the mock backend enabled: login, course list, Course Page, Course Attempts, Attempt review, and browser Back/Forward. Use a teacher session for the attempts and review routes. The mock backend starts signed in, so sign out to check the login form. The production bundle (`bun run preview`) has no mock backend and needs a running backend.

### Plate updates

Update `platejs` and every direct `@platejs/*` dependency, including `@platejs/playwright`, as one compatible major-53 cohort. Packages have independent release versions: the current cohort uses `platejs` / core / slate / utils `53.3.15`, link `53.3.5`, list `53.3.13`, selection `53.1.6`, and the remaining plugins / Playwright adapter `53.0.0`.

The exact selection `53.0.0` pin introduced with marquee selection in `b6344c4` had no documented compatibility reason. It is now a caret range, like the other plugins; keep marquee selection and structural-command focus in the upgrade checks.

1. Before updating, run `bun run test:browser playwright/course-page-editor/lists.spec.ts playwright/course-page-editor/focus.spec.ts` in all three configured engines. These protect DOC-14 (list numbering) and DOC-18 (focus after structural commands); existing expected failures belong to DOC1, DOC4 and DOC5, not to dependency updates.
2. Update the cohort and `bun.lock` together, then run `bun install --frozen-lockfile`, `bun run lint`, `bun run build`, and the full `bun run test:browser` suite. Do not update TipTap as part of this cohort.
3. With the mock backend enabled, open `/courses/modern-information-technologies/edit`. Insert a block through the slash menu; marquee-select adjacent blocks and check the selection count; drag a single block by its handle and check the resulting order.
4. Select text and create a link, collapse and expand a spoiler, and edit a code block's language and filename. Apply, open the read-only Course Page, then reopen the editor; check the link destination, block order, code language and filename survive.

`queueMicrotask` and `editor.meta._forceFocus` in `page-edit/model/block-operations.ts` remain unchanged. Any upgrade regression must preserve the visible DOC-18 caret outcome without introducing `BlockCommands`.

## Course grading

Attempts and attempt review import grading helpers and score fields directly from `@/features/course/features/grading`.

Attempt routes use `$attemptNumber` for the ordinal scoped to Course + Task + Student; existing URLs such as `/courses/modern-information-technologies/tasks/1/attempts/student/1/review` are unchanged. Route guards validate the URL segment with `AttemptNumberSchema` and pass the branded numeric `AttemptNumber` through route context to the page, queries and RAM operations. Attempt lists, Task history and the attempt selector use `attemptNumber` too. `attemptId` in quick grading and review-lock updates still means the distinct internal identity, not the ordinal.

## Mock backend

Remote operations always call Fetch at the backend URLs. In the dev server, requests go through the Vite proxy to `VITE_API_PROXY_TARGET_URL` (`http://localhost:8034` by default). To serve them from the MSW mock backend instead, add this to `.env.local` and restart the Vite dev server:

```env
VITE_MOCK_BACKEND=true
```

The mock backend runs in the browser and starts from a deterministic seed; in ordinary dev mode, every page load returns it to the seed. The seed is signed in as `mit-teacher` (`mit-teacher@example.com`, password `Teacher123`), a teacher for the “Современные информационные технологии” course and a student in every other mock course. `mit-student` (`mit-student@example.com`, `Student123`) is a student of that course. Sign out to see the login form; users registered in the form last until the next page load.

Auth, “Мои курсы” and Course lookup go through MSW. `GET /api/v1/courses` returns the current user's card projection from canonical Courses and Course Memberships; its URL and array payload remain a [working backend assumption (#113)](https://github.com/dsc-sgu/mm-frontend/issues/113). A new user has no memberships and receives an empty list. Loading, an empty list, and transport/validation failures have separate UI states; failures offer “Повторить”.

The list cache belongs to `coursesKeys`, with `UserId` in `coursesKeys.user(userId)`. Cards carry separate validated `CourseId` and `CourseSlug`: links use the slug, while editing card metadata or renaming the slug preserves the stable id and memberships. Course Page saves invalidate the list through `coursesKeys.all`.

`UsernameSchema` is shared by registration, DTO validation and username route parsing: at least 3 ASCII letters/digits/underscores/hyphens, no whitespace or URL separators, canonical lowercase output. Username locators and uniqueness are case-insensitive; spaces are rejected rather than trimmed. The mock backend stores canonical usernames and rejects case-only duplicates. The matching backend requirements are tracked in [#113](https://github.com/dsc-sgu/mm-frontend/issues/113).

Course entry calls `loadCourseBySlug` at `GET /api/v1/courses/by-slug/:courseSlug`. The working wire assumption (#113) is `200` with `{ status: 'found', course: { id, title, shortTitle, iconName, color }, role }`, or `404` with `course-not-found` / `not-member` and no metadata. Session contains User identity, never a global role. The Course root supplies stable Course identity, shell metadata and the course-local role; it does not search the course list or load Course Page for identity.

`courseContextKeys.bySlug(userId, courseSlug)` is outside the CourseId cache prefix. Entry, focus and reconnect recheck context; protected operations can call `recheckCourseContextAfterAccessDenial`. Unconfirmed context shows neutral loading without Course breadcrumbs/navigation. Confirmed context for the same User is immediately reusable during background recheck. Course denials and invalid slugs show the same “Страница не найдена” without changing the URL. Technical failures hide protected content and offer “Повторить”. Participant resource denials preserve the confirmed Course shell and link “На страницу курса”; section-role redirects remain temporary until ACC1.3.

Course Page metadata saves invalidate Course-context entries for every User at the affected old/new locators, including title-only saves. Header breadcrumbs consume the newest validated lookup metadata rather than the route's original cached title.

Failure and denial surfaces retain a lookup observer for focus/reconnect; successful rechecks establish Router context before child guards run. Transition guards use Router-matched Course locators, preserving case-insensitive static route segments while validating the slug itself.

Lookup recovery and Router-unmatched resource paths are separate route states: a successful lookup keeps an unmatched nested path on resource `404` without repeatedly invalidating the Router. Cached entries at other User/slug tuples still start background membership confirmation, even when Router labels the navigation `stay`.

Course Page, Task Page, Attempts, Review and deadlines still use RAM operations. Page and deadline mocks read metadata from canonical Courses. Teacher routes no longer require a client-side Student roster; backend participant-resource authorization follows in ACC2.2. Review replies use the current User's identity and the confirmed Course role. Production builds never include MSW or the test control channel.

The dev server serves MSW's `mockServiceWorker.js` from `node_modules` with one change: the service worker leaves Web Worker scripts to the browser. Firefox never runs a module worker whose script a service worker answered ([mswjs/msw#2654](https://github.com/mswjs/msw/issues/2654)), so the Attempt review diff never loaded there. `playwright/attempt-review/page.spec.ts` guards it in all three engines.

## Tests

`bun run test` runs Vitest: `*.test.ts` in Node and `*.test.tsx` in jsdom with React Testing Library. Both use the MSW handlers of the mock backend. After each test, handlers and the mock backend state return to the seed. Failure profiles for `server.use(...)` (`fail:network`, `fail:http-500`, `fail:invalid`, `fail:held`) are in `src/app/mock-backend/failures.ts`.

Boundary tests can select `mockBackend.reset('world:access')` and use the named `accessWorld` fixtures from `src/app/mock-backend/state.ts`. “Алгоритмы” is open: Анна/Борис are Teachers, Саша/Петя/Вера are Students. Вера also teaches “Базы данных”; authenticated Гость has no membership. `missingSlug` addresses a nonexistent course. This world does not replace the dev seed; `reset()` restores the demo world.

`bunx tsc -b` also checks ACC-03 in `course/model/identity.type-test.ts`: `UserId`, `Username`, `CourseId`, `CourseSlug`, `AttemptId` and `AttemptNumber` are non-interchangeable Valibot-branded types. Remote DTO identities acquire their brand only through schema validation. TR-05 for the list operation is in `course/api/load-courses.test.ts`; its only declared HTTP status is 200.

`renderRoutes([], path, { appRoutes: true })` renders the actual application routes and Header with memory history and fresh Router/QueryClient. Vitest substitutes only the review Web Worker pool, which jsdom cannot run. Course access contracts cover outcome classification, transport failures, User-specific cache identity, rechecks, neutral loading, retry, unchanged denial URLs and resource denials inside the Course shell.

## Browser tests

Playwright tests live in `playwright/` and run in Chromium, Firefox and WebKit. Install the browsers once, then run the suite:

```bash
bunx playwright install chromium firefox webkit
bun run test:browser
```

Playwright starts its own Vite dev server on port 5180 in `e2e` mode with the mock backend; set `PLAYWRIGHT_PORT` to use another port. Pass `--project=chromium` (or `firefox`, `webkit`) to run one engine. `bun run test:browser playwright/course-access` covers Guest denial equivalence and a held Teacher-to-Student Course transition in all three engines.

Only the `e2e` dev mode exposes the page-origin MSW HTTP channel `/__test/mock-backend`: select `{ action: 'scenario', world: 'dev' | 'world:access', session: username | null }`, or `{ action: 'hold' | 'release', operation: 'load-course-by-slug' }`. Selected world/session survive full page reload; held operations stay page-local. Use the page-side Fetch helpers in `playwright/course-access/control.ts`, not Playwright's API request context. No window control global is installed. Ordinary dev mode still resets the seed on every page load; production excludes the channel.

A test marked `test.fail()` describes target behaviour the current code lacks; its comment names the slice that brings it. When that slice lands, the test starts passing, Playwright reports the unexpected pass, and the PR removes the mark.

## Radix UI

shadcn components import primitives from the single `radix-ui` package. Do not add individual `@radix-ui/react-*` packages as direct dependencies; they may still appear as transitive dependencies in `bun.lock`.

After changing Radix imports or versions, run `bun run lint` and `bun run build`, then smoke-check with the mock backend enabled:

1. Open `/courses/modern-information-technologies/tasks/1` and confirm the header avatar shows the `СП` fallback.
2. Open the avatar menu by clicking it. Close it with Escape, focus the trigger, and reopen it with ArrowDown. Check ArrowDown/ArrowUp navigation between “Настройки” and “Выход”, then Escape closes the menu and returns focus to the trigger.
3. Confirm “Посмотреть попытки студентов” and “Редактировать задание” render as links, not nested buttons, and that the first link navigates to the course attempts.

## Runtime dependency smoke checks

Keep DOMPurify, Sonner, Zustand, and libphonenumber-js updates within their current major versions. After updating them, run `bun install --frozen-lockfile`, `bun run lint`, and `bun run build`, then smoke-check with the mock backend enabled:

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

Schema ownership and placement are defined in [AGENTS.md](AGENTS.md#valibot-schemas). ESLint's built-in `no-restricted-syntax` guard keeps runtime Valibot out of UI/hooks/application routes while allowing whole-declaration `import type`/`export type` and model-owned schemas passed to form resolvers. Feature `api/model/routing`, the transport validator, mock backend and test harnesses own runtime validation. The guard does not infer whether a schema is a DTO or a domain contract; that remains a review responsibility.

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
