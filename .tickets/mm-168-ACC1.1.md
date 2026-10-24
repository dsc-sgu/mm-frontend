---
id: mm-168-ACC1.1
status: closed
deps: []
links: []
created: 2026-10-12T12:13:49Z
type: task
priority: 2
external-ref: gh-168
parent: mm-167
tags: [ready-for-agent]
closed: 2026-10-12T17:39:47Z
close-reason: completed
---
# ACC1.1: Загружать «Мои курсы» из mock backend через Fetch

Часть epic mm-167 «Course access». Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Prefactor для ACC1.2: «Мои курсы» переходят на Fetch и MSW, а в состоянии mock backend появляются Courses и Course Memberships, которые дальше читает загрузка Course по slug.

### Делает

**Identity-типы.**
- `UserId`, `CourseId`, `CourseSlug`, `Username`, `AttemptId` и `AttemptNumber` — статически различимые типы. `UserId` и `Username` живут в модели auth, остальные — в модели course.
- `session.userId` получает тип `UserId`.
- Значение из DTO получает identity-тип только после проверки Valibot.

**Courses и Course Memberships в состоянии mock backend.**
- В состоянии хранятся Courses (id, slug, title, shortTitle, иконка, цвет, Teachers для карточки) и Course Memberships (`CourseId + UserId + CourseRole`).
- Dev-seed — демо-набор с теми же slugs, что у RAM-моков Course Page, Attempts и Review. Membership seeded Users повторяет нынешний мок доступа: `mit-teacher` — Teacher «Современных информационных технологий» и Student остальных курсов.
- Мир `world:access` из матрицы выбирают тесты:
  - Courses «Алгоритмы» (open) и «Базы данных»;
  - Анна и Борис — Teachers «Алгоритмов»;
  - Саша и Петя — Students «Алгоритмов»;
  - Вера — Student «Алгоритмов» и Teacher «Баз данных»;
  - Гость — authenticated, без Course Membership;
  - несуществующий slug.

  Dev-seed от него не меняется.

**Список курсов.**
- Fetch-операция на транспортном ядре, ответ проверяется Valibot. Объявленный исход — список Courses текущего User. Всё остальное — отказ операции.
- URL и форма ответа — рабочее допущение из mm-113, помеченное в handler.
- Элемент списка несёт `CourseId`, `CourseSlug` для ссылки и данные карточки.
- Key factory семейства содержит `UserId`: это user-specific проекция по правилу mm-115.
- «Мои курсы» на панели управления используют операцию. Загрузка, пустой список и сбой различимы: сбой показывает текст по виду отказа и «Повторить», а не «Вы пока не состоите ни в одном курсе».
- Сохранение Course Page инвалидирует список через key factory владельца, а не через raw-константу.
- **До ACC1.2** Course root по-прежнему ищет Course в списке по slug, проверка доступа остаётся прежней.

**ESLint.** Модуль списка курсов уходит из списка исключений импортёров RAM-моков.

### Удаляет

- RAM-мок списка курсов и raw-константу его ключа.

### Не входит

- Загрузка Course по slug, route states и роль из Course — ACC1.2.
- Переименование параметра route `attemptId` — ACC2.1. Здесь только типы.
- Course Page, Task Page, Attempts, Review и дедлайны остаются на RAM-моках.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| ACC-03 | Static | Identity | — | `UserId`, `CourseId`, `CourseSlug`, `Username`, `AttemptId`, `AttemptNumber` не взаимозаменяемы (type tests с `@ts-expect-error`). (I1) |
| TR-05 | Boundary | Корректность | `fail:http-500`, `fail:invalid` | Экземпляр шаблона для операции списка курсов: каждый объявленный status → свой исход; необъявленный → `unexpected-http`; невалидный DTO → `invalid-response`. |

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Уточнения из заменённых тикетов

- mm-89 «Перевести course read-side на fetch и MSW поверх published snapshots» и mm-78 «Перевести course dashboard и редактирование курса на общий mock backend»:
  - список курсов строится из общего канонического состояния Courses и Course Memberships;
  - feature query modules не импортируют реализацию mock backend;
  - выключение MSW не требует правок в потребителях.

### Готово, когда

- Lint и build проходят.
- ACC-03 и экземпляр TR-05 зелёные.
- В dev с MSW «Мои курсы» показывают те же курсы, что раньше, а каждый курс открывается как раньше.

### Источники

- Epic mm-167: «Identity», «Список курсов», «Mock backend и test-only канал».
- mm-115 «Спроектировать Course access vertical и identity seam».
- mm-69, комментарий от 2026-10-11T12:02:31Z «Определить последовательность подготовки и выполнения рефакторинга»: slice ACC1.
