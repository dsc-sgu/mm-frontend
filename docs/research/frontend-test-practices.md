# Практики тестирования для текущего frontend-стека

> Проверено: 2026-08-24. Исследование фиксирует поддерживаемые варианты и ограничения, но не выбирает стек за владельца проекта.

## Контекст

В исследовании учитываются версии из `package.json`: React 19.2, Vite 7.2, TypeScript 5.9, TanStack Router 1.157, TanStack Query 5.90, Zustand 5 и PlateJS 53. Сейчас в проекте нет test script, test runner и файлов `*.test.*`/`*.spec.*`; исполняемыми quality gates служат `bun run lint` и `bun run build`.

Документация инструментов развивается независимо от проекта. Перед внедрением нужно повторно проверить peer dependencies и требования к Node/Bun для выбранных точных версий. В частности, актуальная документация Vitest 4 указывает совместимость с Vite 6+ и Node 20+, поэтому Vite 7 проекта подходит, но точную версию Vitest всё равно следует зафиксировать осознанно ([Vitest: сравнение и требования](https://vitest.dev/guide/comparisons)).

## Краткий вывод

Для MergeMinds недостаточно одного тестового окружения:

1. Чистые модели и state transitions выгодно проверять быстрыми Vitest-тестами в Node.
2. Обычные React interactions можно проверять через Testing Library и `user-event` в `jsdom`.
3. Редактор Plate, `contenteditable`, selection, clipboard, drag-and-drop, layout-зависимый diff и worker/browser APIs требуют небольшой отдельной поверхности в настоящем браузере.
4. Сквозные критические пути следует покрывать тонким Playwright-слоем, не перенося в E2E всю комбинационную сложность моделей.
5. Network mocking, время, генерация идентификаторов и создание Router/QueryClient/store должны быть детерминированными и изолированными между тестами.

Это не решение о финальном стеке. Оно задаёт shortlist и ограничения для тикета выбора стратегии.

## Сравнение окружений

| Вариант              | Сильные стороны                                                                                                                       | Ограничения                                                                                                     | Наиболее подходящая роль                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Vitest + Node        | Быстрый запуск, fake timers, mocks, coverage; минимальная browser-поверхность                                                         | Нет DOM и browser APIs                                                                                          | Чистые функции, FSM/reducers, сериализация, guards без рендера           |
| Vitest + `jsdom`     | Зрелая DOM-эмуляция; хорошо сочетается с Testing Library                                                                              | Нет настоящего layout/rendering; часть browser APIs и сложных selection/contenteditable сценариев неполна       | Обычные React-компоненты, формы, provider integration                    |
| Vitest + `happy-dom` | Быстрая DOM-эмуляция                                                                                                                  | Vitest прямо предупреждает, что `happy-dom` быстрее, но не реализует некоторые API и может не подходить проекту | Только после доказанного выигрыша на некритичной DOM-поверхности         |
| Vitest Browser Mode  | Тест исполняется в настоящем браузере; реальные DOM, CSS, events и browser APIs; есть component testing, screenshots и ARIA snapshots | Дороже и сложнее эмуляции; остаётся component/integration runner, а не полный пользовательский E2E              | Plate/editor commands, clipboard, focus, selection, DnD, browser workers |
| Playwright Test      | Изолированные browser contexts, auto-waiting, Chromium/Firefox/WebKit, tracing, network routing, clock, screenshots                   | Самый дорогой слой; плохо подходит для исчерпывающих комбинаций модели                                          | Критические E2E-пути и небольшой набор cross-browser контрактов          |

Vitest описывает `jsdom` и `happy-dom` как browser-like окружения, а для реального браузера предлагает Browser Mode; документация отдельно отмечает более высокую скорость `happy-dom` при неполной реализации API ([Vitest environments](https://vitest.dev/config/environment), [Vitest Browser Mode](https://vitest.dev/guide/browser/)).

## Инструменты и практики по слоям

### 0. Статические gates

Оставить обязательными TypeScript build и ESLint. Generated `src/routeTree.gen.ts` и `dist/` не должны попадать в test discovery или coverage. Coverage не заменяет спецификацию поведения: Vitest поддерживает V8 и Istanbul, но threshold стоит выбирать после инвентаризации критических контрактов, а не до неё ([Vitest coverage](https://vitest.dev/guide/coverage)).

### 1. Чистые contract/model tests

Vitest в Node подходит для уже существующих seams:

- `page-edit/model/dirty-compare.ts`;
- `page-edit/model/block-operations.ts` после отделения editor/platform effects;
- `attempt-review/model/comment-lifecycle.ts` и `comment-save.ts`;
- attempts filters, grading, selection и page modes;
- ranks/list indentation, permissions и route parameter helpers.

Здесь нужны decision tables, property/invariant cases и явные error cases. Snapshots допустимы только для устойчивых сериализованных структур, а не как замена поведенческим assertions.

### 2. Stateful model tests

`createCoursePageEditStore` уже является подходящей factory-seam. Каждый тест должен получать новый store либо гарантированный reset. Официальное руководство Zustand демонстрирует регистрацию initial state и сброс всех stores после каждого теста; этот паттерн особенно важен для singleton stores и mocks ([Zustand testing guide](https://zustand.docs.pmnd.rs/learn/guides/testing)).

Скрытые зависимости нужно контролировать на тестовой границе:

- `new Date()` в `attempt-review/model/comment-save.ts` — fake clock или позднее явная clock-seam;
- `crypto`, `Math.random()` и генерируемые block IDs — фиксируемый generator;
- `queueMicrotask`, debounce и timers — явное ожидание/flush и восстановление real timers.

Vitest требует включать fake timers на тест и возвращать real timers после него; изменение системного времени не запускает таймеры автоматически ([Vitest fake timers](https://vitest.dev/guide/mocking/timers)).

### 3. React component и provider integration

Testing Library рекомендует тестировать так, как пользователь использует интерфейс, и избегать assertions по внутреннему state компонентов; `user-event` следует создавать через `userEvent.setup()` перед рендером и использовать его высокоуровневые interactions вместо прямого `fireEvent`, если сценарий поддержан ([Testing Library principles](https://testing-library.com/docs/guiding-principles), [`user-event` introduction](https://testing-library.com/docs/user-event/intro/)).

React `act` должен охватывать render и updates; testing libraries обычно применяют его автоматически, а синхронный `act` помечен React как будущий кандидат на удаление, поэтому asynchronous assertions предпочтительнее ([React `act`](https://react.dev/reference/react/act)).

Для проекта это означает reusable test harness, который создаёт заново:

- `QueryClient`;
- Router с memory history и typed context;
- feature providers/store;
- controlled mock server/handlers.

Нельзя импортировать `src/main.tsx` как test harness: он создаёт process-wide singletons, пишет `window.__TANSTACK_QUERY_CLIENT__` и немедленно монтирует приложение.

### 4. Router, Query и network boundaries

TanStack Router рекомендует создавать test router с `createMemoryHistory` и рендерить его через `RouterProvider`; file-based routes можно проверять с generated route tree либо минимальным test tree ([TanStack Router setup testing](https://tanstack.com/router/latest/docs/how-to/setup-testing.md)). Проверять следует route outcome — разрешённый экран или redirect, — а не форму внутреннего exception без необходимости.

TanStack Query рекомендует изолировать тесты новым `QueryClient`, отключать retries для error-сценариев и асинхронно ждать состояния hook/query; иначе общий cache и фоновые retry создают перекрёстное влияние и медленные тесты ([TanStack Query testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)). Для MergeMinds отдельными контрактами являются:

- полная query identity по course/task/student/attempt;
- invalidation после save/grade/comment reply;
- отсутствие утечки данных между попытками;
- поведение при pending/error/partial failure.

MSW позволяет переиспользовать request handlers в Node и браузере, не подменяя сам fetch/axios call site; официальный quick start различает `setupServer` для Node и `setupWorker` для браузера ([MSW quick start](https://mswjs.io/docs/quick-start/)). В Vitest Browser Mode нужен отдельный worker fixture/pattern ([MSW recipe for Vitest Browser Mode](https://mswjs.io/docs/recipes/vitest-browser-mode/)).

Поскольку большинство feature query modules сейчас напрямую импортируют in-memory mocks, роль MSW станет реальной только после решения о transport/API seam. До этого mock-domain можно использовать как controlled fixture, но нельзя считать его подтверждением backend-контракта.

### 5. Plate и реальные browser interactions

Plate предоставляет два официальных пути:

- `@platejs/test-utils` и `createPlateEditor` для unit testing editor transforms, selection, plugins и resulting editor value ([Plate unit testing](https://platejs.org/docs/unit-testing));
- `@platejs/playwright` для взаимодействия с редактором в настоящем браузере ([Plate Playwright testing](https://platejs.org/docs/playwright)).

Поэтому editor-поверхность следует разделить:

- content schema, normalization, dirty comparison и чистые tree operations — Node;
- React toolbar/menu behavior, не зависящее от layout, — `jsdom`;
- `contenteditable`, native selection, clipboard, keyboard shortcuts, focus, drag-and-drop, bounding rectangles и browser worker integration — реальный браузер.

Не следует пытаться доказать корректность этих browser-контрактов большим количеством polyfills в `jsdom`: это тестирует собственные polyfills, а не пользовательскую среду.

### 6. E2E, accessibility и visual checks

Playwright автоматически ждёт actionability элементов, запускает каждый тест в изолированном browser context и поддерживает reusable fixtures ([Playwright writing tests](https://playwright.dev/docs/writing-tests), [Playwright fixtures](https://playwright.dev/docs/test-fixtures)). Network routing подходит для нескольких E2E failure cases, но основная комбинационная network-логика должна оставаться ниже E2E ([Playwright network](https://playwright.dev/docs/network)).

Clock API позволяет фиксировать время, управлять timers и последовательно воспроизводить deadline/timestamp сценарии ([Playwright clock](https://playwright.dev/docs/clock)).

Accessibility automation через `@axe-core/playwright` находит только часть нарушений и не заменяет ручную проверку; её разумно применять к критическим экранам и общим интерактивным primitives ([Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)).

Screenshot assertions полезны только для небольшого числа layout-критичных экранов. Playwright предупреждает, что rendering зависит от OS, browser, hardware, power source и headless mode, поэтому baseline нужно создавать и сравнивать в одном фиксированном CI-окружении ([Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)). ARIA snapshots предпочтительнее пиксельных там, где контракт относится к доступной структуре, а не внешнему виду.

## Последствия для текущего репозитория

### Высокий приоритет

1. До структурного рефакторинга зафиксировать characterization contracts для `dirty-compare`, comment lifecycle/save, attempts grading/selection и route access matrix.
2. Не строить весь test suite через глобальный `src/main.tsx`; будущая application factory/test harness должна создавать Router и QueryClient на тест.
3. Выделить real-browser budget для `page-edit`, diff/comment interactions и browser worker behavior.
4. Определить query keys и invalidation как часть интерфейса data modules, а не как внутреннюю мелочь.

### Средний приоритет

1. Установить единые factories для course/task/attempt/review/content fixtures; не копировать огромные mock aggregates между тестами.
2. Решить, какие generated IDs и timestamps являются наблюдаемыми доменными значениями.
3. Решить, где in-memory mocks остаются fixture/domain simulator, а где нужны transport-level handlers.
4. Разделять accessibility structure checks и дорогие visual baselines.

### Низкий приоритет до появления данных

1. Не задавать глобальный coverage percentage без карты критичности.
2. Не выбирать `happy-dom` только ради скорости без доказательства совместимости.
3. Не запускать исчерпывающие browser/E2E permutations, если те же contracts дешевле проверяются на model-уровне.

## Рекомендованный shortlist — не принятое решение

Наиболее консервативный кандидат для последующего выбора:

- **Vitest** как единый runner для Node и обычной component/integration поверхности;
- **`jsdom` + React Testing Library + `@testing-library/user-event`** для большинства React interactions;
- **MSW** для transport-level network contracts после определения API seam;
- **Vitest Browser Mode с Playwright provider или Plate Playwright utilities** для узких editor/browser component contracts;
- **Playwright Test** для небольшого набора критических E2E, accessibility и ограниченных visual checks.

Vitest Browser Mode и отдельный Playwright Test частично пересекаются. Финальный выбор должен минимизировать двойную инфраструктуру: Browser Mode оправдан, если нужно много browser-level component tests; иначе Plate/browser contracts можно разместить непосредственно в небольшом Playwright suite.

## Решения, оставшиеся владельцу проекта

1. Какие пользовательские пути являются release-blocking?
2. Какой browser matrix поддерживается: только Chromium или Chromium/Firefox/WebKit?
3. Нужен ли отдельный browser-component слой, либо достаточно `jsdom` + Playwright E2E/integration?
4. Являются ли моки canonical fixtures или временной заменой backend?
5. Какая CI-длительность и flaky-rate допустимы?
6. Какие persisted content документы должны сохранять совместимость между версиями Plate/editor schema?
7. Какие timestamps/IDs должны быть стабильны и видимы пользователю?
8. Нужны ли visual baselines или достаточно behavioral и ARIA assertions?
9. Как измерять coverage: critical-contract checklist, risk-weighted targets или числовые thresholds?

## Остаточные пробелы

- Не исследован фактический backend-контракт и стратегия seed data — они находятся вне destination этой карты.
- Browser matrix и CI-платформа в репозитории не зафиксированы.
- PlateJS 53 может иметь minor-version-specific детали; перед установкой test utilities нужно сверить peer versions с lockfile.
- Реальная стоимость worker pool, syntax highlighting и больших diff/editor fixtures требует отдельного измерения, а не вывода из статического анализа.
- Accessibility и визуальная корректность нельзя полностью доказать автоматикой.
