---
id: mm-172-ACC2.2
status: closed
deps: [mm-171, mm-170]
links: []
created: 2026-10-12T12:14:00Z
type: task
priority: 2
external-ref: gh-172
parent: mm-167
tags: [ready-for-agent]
closed: 2026-10-14T06:49:02Z
close-reason: completed
---
# ACC2.2: Решать доступ к Repository и Attempt на backend по стабильным identities

Часть epic [«Course access»](https://github.com/dsc-sgu/mm-frontend/issues/167). Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Доступ к Repository и Attempt решает backend по стабильным identities. Клиент больше не сравнивает username и не знает состава Students.

### Делает

**Операции participant-bound ресурсов.**
- Feature-owned операции разрешают route locators в стабильные id:
  - Repository Student'а: `CourseId` + `Username` → `UserId`;
  - Attempt: `CourseId` + Task + `Username` + `AttemptNumber` → `AttemptId` и `UserId` владельца.
- У каждой операции свой union, общего `LoadResourceResult<T>` нет. Пример из [#115](https://github.com/dsc-sgu/mm-frontend/issues/115):

  ```ts
  type LoadAttemptResult =
    | { status: 'found'; attempt: Attempt }
    | { status: 'not-found' }
    | { status: 'forbidden' };
  ```

- После разрешения дочерние routes, операции и ключи используют `UserId` и `AttemptId`.
- `forbidden` вызывает точку входа перепроверки Course context из ACC1.2.

**Routes.**
- Поддеревья Repository Student'а и Attempt (просмотр и Review editor) разрешают locators при загрузке.
- `not-found` и `forbidden` дают одинаковый resource `404` внутри Course shell: «Страница не найдена» и «На страницу курса».

**Mock backend.**
- В состоянии появляются минимальные Attempts: Task, Student, номер и внутренний `AttemptId`. REV2 расширяет их до единого состояния Attempts и Reviews.
- Repository Student'а существует для каждого Student этого Course.
- Handler решает наличие и доступ: Student видит только собственные Repository и Attempts, Teacher — ресурсы Students своего Course.
- Ответ на отказ не несёт сведений о ресурсе и его владельце ни в теле, ни в заголовках (требование к backend в [#113](https://github.com/dsc-sgu/mm-frontend/issues/113)).
- Сопоставление `AttemptNumber` → `AttemptId` — рабочее допущение до ответа [#85](https://github.com/dsc-sgu/mm-frontend/issues/85), помеченное в handler.
- Мир `world:review` в минимальной форме: Task «Сортировки», Attempts #1 и #2 Саши и Attempt #1 Пети в «Алгоритмах». Reviews, manifest и Grade появятся в REV2.

**Содержимое Attempt page** до REV2 остаётся на прежнем источнике. Ему передаются уже разрешённые identities.

### Удаляет

- Сравнение username из URL с username из session.
- Клиентские проверки состава Students.
- Временный resource `404` по сравнению username из ACC1.2.

### Не входит

- Reviews, manifest и содержимое Attempt в MSW — REV2.
- Общий Course prefix ключей — ACC3.
- Изменение формы URL: `$studentUsername` остаётся locator `Username`.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| ACC-08 | Boundary | Доступ | `world:access`, `world:review` | Participant-bound ресурсы (Attempt, Repository): locators → стабильные ids; found / not-found / forbidden решает MSW-backend; Саша → Attempt Пети = forbidden; клиентских сравнений username и roster нет. (I2) |
| ACC-16 | Component | Доступ | `world:review` | Resource not-found и forbidden дают одинаковый resource `404` внутри Course shell. (I2) |
| ACC-E1 | E2E | Доступ | `world:review` | Саша по прямой ссылке на Attempt Пети → generic `404`; ни имени, ни файлов Пети в DOM. Handler отказа сам не отдаёт данных Пети (требование к backend записано в #113), поэтому frontend не может случайно на них опереться. (I2) |
| TR-05 | Boundary | Корректность | `fail:http-500`, `fail:invalid` | Экземпляры шаблона для операций Repository и Attempt. |

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Уточнения из заменённых тикетов

- [«Переименовать frontend identity попытки в attemptNumber»](https://github.com/dsc-sgu/mm-frontend/issues/84): номер Attempt scoped к course + task + student и не используется как глобальная identity.
- [«Убрать глобальную роль из сессии и привязать permissions к курсу»](https://github.com/dsc-sgu/mm-frontend/issues/75): Student-владелец Attempt может отвечать на сохранённые комментарии, но не редактирует Review; User, не являющийся Teacher'ом курса или владельцем Attempt, права ответа не получает.

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные; E2E — в Chromium, Firefox и WebKit.
- В коде нет сравнения username с session и проверок состава Students.

### Источники

- Epic [#167](https://github.com/dsc-sgu/mm-frontend/issues/167): «Participant-bound ресурсы (ACC2)», решение 3 в «Дополнительно».
- [«Спроектировать Course access vertical и identity seam»](https://github.com/dsc-sgu/mm-frontend/issues/115).
- [«Выбрать явный UX для отказа в course-local доступе»](https://github.com/dsc-sgu/mm-frontend/issues/111).
