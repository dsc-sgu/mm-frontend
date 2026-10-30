---
id: mm-173-ACC3
status: closed
deps: [mm-172]
links: [mm-293]
created: 2026-10-12T12:14:04Z
type: task
priority: 2
external-ref: gh-173
parent: mm-167
tags: [ready-for-agent]
closed: 2026-10-14T10:21:44Z
close-reason: completed
---
# ACC3: Хранить кэш Course под CourseId и очищать его со сменой session

Часть epic mm-167 «Course access». Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Кэш Course живёт под одним prefix стабильного `CourseId`. Смена User или потеря Course Membership не оставляет на экране ничего от прежнего доступа. Тикет нельзя раздать по вертикалям: в непереведённых семействах кэш потерянного Course оставался бы видимым (I2).

### Делает

**Общий prefix.**
- Все course-scoped семейства расширяют `['course', courseId, …]`:
  - Course Page;
  - Task Page;
  - Course Attempts;
  - Attempt Review;
  - participant-bound ресурсы из ACC2.2.
- Вне prefix остаются:
  - Course context — его вход slug;
  - список курсов — его вход User;
  - календарь дедлайнов — он поперёк Course, slice DEADLINES.

**Адресация.**
- Дочерние операции и ключи адресуют `CourseId`, а не slug и не username.
- RAM-моки, ещё не переведённые на MSW, адресуются тем же `CourseId`, который выдаёт загрузка Course.

**Key factories.**
- Каждое семейство владеет key factory по `remote-data.md`.
- Raw-константы ключей других feature не импортируются, чужие tuples вручную не собираются.
- Mutations координируют кэш через публичные key factories владельцев:
  - сохранение Attempt Review обновляет Course Attempts;
  - lock updates тоже обновляют Course Attempts;
  - сохранение Course Page обновляет Course Page, список курсов, дедлайны и Course context.

**Session.** Login, logout и замена session очищают весь session-bound кэш раньше, чем показывается следующий экран: Course context, список курсов и всё под Course prefix.

**Потеря Membership.** Подтверждённая потеря удаляет кэш Course одним вызовом по prefix `['course', courseId]`.

**Смена slug.**
- Старый slug даёт `course-not-found`, aliases нет.
- Кэш Course Page по `CourseId` остаётся.
- ACC-07 меняет slug прямо в состоянии mock backend: операция смены slug — DRF1.

### Удаляет

- Ключи на slug и username.
- Raw-константы ключей в cross-feature импортах.
- Широкие инвалидации там, где известен более узкий scope.

### Не входит

- Перевод этих семейств на MSW: Course Page — READ, Attempts и Reviews — REV2 и ATT1, дедлайны — DEADLINES.
- `observeReviewRevision` — REV6.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| ACC-06 | Boundary | Identity | `world:access` | Login, logout и замена session очищают все session-bound семейства cache (Course context и prefix `['course', courseId]`). (I1, I2) |
| ACC-07 | Boundary | Identity | `world:access` | Дочерние operations и keys адресуют `CourseId`; после смены slug старый slug → not-found (aliases нет), Course Page cache по `CourseId` цел. (I1) |
| ACC-E4 | E2E | Identity | `world:access` | Вера выходит, в той же вкладке входит Саша → ни в один момент не видны Course, роль или навигация Веры. (I1, I2) |

ACC-E4 — единственный E2E эпика, где выход идёт через Header, а вход — через форму login: он проверяет смену session без перезагрузки. Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Уточнения из заменённых тикетов

- mm-76 «Унифицировать ключи запросов и правила согласованности кеша»:
  - каждый key включает все входы, меняющие результат `queryFn`;
  - точный entry обновляется из mutation response только при полном провалидированном авторитетном представлении;
  - derived и неполные представления инвалидируются минимальным корректным prefix;
  - сохранение Course Page отдельно обрабатывает точный detail entry, список курсов, дедлайны, Course context и старый/новый locator при смене slug и не трогает несвязанные Course Pages;
  - optimistic переход Review Read State в `seen` сохраняется на ключах из factory;
  - UI и domain model не зависят от формы ключей.

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные; E2E — в Chromium, Firefox и WebKit.
- Все course-scoped ключи расширяют один Course prefix.

### Источники

- Epic mm-167: «Query cache и session (ACC3)».
- mm-115 «Спроектировать Course access vertical и identity seam».
- mm-69, комментарий от 2026-10-11T12:02:31Z «Определить последовательность подготовки и выполнения рефакторинга»: «ACC3 нельзя раздать по вертикалям».

## Comments

### 2026-10-30T21:38:35Z · t3m8ch

## Продолжение: внедрение политики очистки сессии

Архитектурное решение владельца от 2026-10-31 — mm-293. Перечень очищаемых семейств переносится из `auth` в сборку приложения через внедрённое действие. Момент очистки и изоляция данных пользователя из этого закрытого тикета сохраняются; mm-173 не переоткрывается. Последующий владелец контекста курса — `course-shell` по mm-295.
