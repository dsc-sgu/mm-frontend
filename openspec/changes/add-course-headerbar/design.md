## Context

The app uses TanStack Router file routes, React Query, Tailwind CSS, and shadcn-style UI primitives. A global `Header` is currently rendered from the root route and contains only product navigation plus account actions. Course route loaders already compute course access and role information; course summary data is available from the existing courses query mock.

Course pages are nested and role-dependent. Teachers and students see different conceptual hierarchies for repositories, attempts, tasks, and management pages. The header needs data from the active route chain, route params, and loader context, but should remain usable outside course pages.

## Goals / Non-Goals

**Goals:**

- Provide a reusable two-level header component with a dashboard icon, breadcrumbs, account actions, and optional contextual nav.
- Keep page-specific header state close to route definitions through typed route static metadata.
- Build course breadcrumbs and section navigation from the active route matches, route params, course loader data, and course role.
- Preserve the homepage deadlines calendar while removing the standalone `/calendar` test route.
- Add a guarded teacher attempts placeholder route to support teacher course navigation.

**Non-Goals:**

- Implement full UI for course sections beyond placeholders already used by the route-access capability.
- Add backend APIs for tasks, attempts, repositories, commits, notifications, messages, or profile settings.
- Persist theme preference across reloads.
- Resolve real student display names from usernames beyond local/mock formatting.

## Decisions

### Use TanStack Router `staticData` for header metadata

Routes will declare header metadata in `staticData.header`. The header will read active matches with `useMatches()` and aggregate metadata into renderable breadcrumbs and nav items.

- Rationale: the requested model explicitly fits route-level static data, keeps header configuration near the route it describes, and avoids centralizing all path logic in the header component.
- Alternative considered: a single path-pattern registry in `src/header`. This would keep route files smaller but would duplicate routing knowledge and become brittle as routes change.

### Type route metadata with module augmentation

The project will augment TanStack Router's `StaticDataRouteOption` so `staticData.header` is type checked.

- Rationale: avoids `any`, catches invalid metadata shape at compile time, and gives autocomplete in route files.
- Alternative considered: manually cast route `staticData` values. This is quicker initially but weakens the contract and makes refactors riskier.

### Use header builder functions instead of static strings for dynamic routes

Header metadata values for dynamic routes will be functions that receive active route/match context and return breadcrumb/nav items. Simple pages may still provide static output.

- Rationale: course title, role, task ID, attempt ID, student username, and commit ID are only known from params or loader data.
- Alternative considered: compute all breadcrumb labels in route loaders. That would mix presentational navigation concerns into data/access loaders and duplicate common breadcrumb segments.

### Keep `Header` presentation-focused

`Header` should render controls, breadcrumbs, and tabs. Route-match traversal and course-specific label construction should live in header utilities/components.

- Rationale: keeps the visual component readable and reusable outside course pages.
- Alternative considered: put match parsing directly into `Header`. This is simpler for the first few routes but becomes hard to test and modify.

### Course nav is role-aware

Teacher course nav will include course root, attempts, repositories, journal, files, analytics, and edit. Student course nav will include course root and the student's own repository when a username is available from course access.

- Rationale: the request calls out teacher pages as discoverability-critical, while student pages should not expose teacher-only sections.
- Alternative considered: show all tabs and rely on redirects. This advertises inaccessible pages and creates a poor UX.

## Risks / Trade-offs

- **Risk:** Route metadata functions may need loose typing because TanStack match unions are complex. → **Mitigation:** centralize unsafe narrowing in small utilities and expose typed helper inputs to route metadata where possible.
- **Risk:** Breadcrumb labels for tasks/students are placeholders until real APIs exist. → **Mitigation:** clearly format fallback labels (`Лабораторная работа {id}`, username-derived names) and isolate them behind helper functions for future replacement.
- **Risk:** Removing `/calendar` can break external links or bookmarks. → **Mitigation:** this was a test route; the deadlines calendar remains on the homepage. If needed later, add an intentional route with spec coverage.
- **Risk:** Header height changes can affect page viewport calculations that currently subtract `3.5rem`. → **Mitigation:** update affected layout calculations to account for the second header level where it appears, or use natural document flow where possible.
