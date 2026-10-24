---
id: mm-170-ACC1.3
status: closed
deps: [mm-169]
links: []
created: 2026-10-12T12:13:57Z
type: task
priority: 2
external-ref: gh-170
parent: mm-167
tags: [ready-for-agent]
closed: 2026-10-13T12:26:33Z
close-reason: completed
---
# ACC1.3: Открывать разделы Course по section policy с явным 403

Часть epic [«Course access»](https://github.com/dsc-sgu/mm-frontend/issues/167).

Права разделов Course задаёт одна таблица. Раздел не по роли становится явным `403` вместо redirect. После этого тикета единственный автоматический redirect — unauthenticated → login.

### Делает

**Section policy.** Таблица из [#115](https://github.com/dsc-sgu/mm-frontend/issues/115) — единственный источник правил для навигации и авторизации route:

```ts
const courseSectionAccess = {
  page: 'member',
  journal: 'member',
  attempts: 'teacher',
  repositories: 'teacher',
  files: 'teacher',
  analytics: 'teacher',
  edit: 'teacher',
} as const;
```

- Course Page и Task Page доступны любому Course Member.
- Journal — обеим ролям, route пока заглушка.
- Task editing относится к разделу `edit`, Review editor — к `attempts`.
- `repositories` — индекс репозиториев для Teacher'а. Repository Student'а — participant-bound ресурс, а не раздел.
- Таблица не становится permission framework и не решает владение ресурсами и права mutations.

**`403`.**
- Роль не подходит разделу → «Нет доступа» — «Этот раздел доступен только преподавателям курса.» внутри Course shell с разрешённой навигацией. Действие — «На страницу курса».
- URL не меняется. Direct, stale и shared links обслуживает проверка route.

**Навигация** строится из той же таблицы: недоступные по роли пункты скрыты.

**Реакция на перепроверку.**
- Подтверждённая потеря Membership сразу заменяет содержимое на course `404`.
- Понижение роли на teacher-only разделе заменяет содержимое на `403`.
- Действия блокируются.

**Accessibility.** Axe в Playwright появляется здесь, с первым потребителем. Он проверяет устойчивые состояния `403` и `404`. Экраны других вертикалей добавляют их slices: Course Page — DOC1, Course Attempts — ATT3, Review editor — REV6, Attempt page Student'а — REV8, редактор Course Page — DRF2.

### Удаляет

- Оставшиеся redirect guards по роли и их цели redirect.

### Не входит

- Владение participant-bound ресурсами — ACC2.2.
- Содержимое персонального журнала ([#99](https://github.com/dsc-sgu/mm-frontend/issues/99)).
- Очистка кэша Course по prefix при потере Membership — ACC3. Здесь заменяется только видимое содержимое.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| ACC-01 | Model | Доступ | — | Таблица `courseSectionAccess` × роль: 7 разделов × Student/Teacher → разрешено или `403`, исчерпывающе. (I2) |
| ACC-12 | Component | Доступ | `world:access` | Student на каждом teacher-only разделе (attempts, repositories, files, analytics, edit, Task edit, Review editor) → `403` «Нет доступа» в Course shell + «На страницу курса». Параметризовано. (I2) |
| ACC-13 | Component | Доступ | `world:access` | Навигация показывает только разрешённые разделы; Вера видит teacher-навигацию в «Базах данных» и student-навигацию в «Алгоритмах». |
| ACC-15 | Component | Доступ | `world:access` | Revalidation подтвердила потерю Membership → содержимое сразу заменяется course `404`, действия заблокированы; понижение роли на teacher-only разделе → `403`. (I2) |
| ACC-E2 | E2E | Доступ | `world:access` | Саша по прямой ссылке на Course Attempts → `403` в Course shell; teacher-пунктов навигации нет. (I2) |
| A11Y-01 | Real browser | Корректность | `world:access` | axe на устойчивых состояниях. Здесь — `403` и `404`; остальные экраны добавляют их slices. |

Component-тесты идут через настоящее дерево routes из ACC1.2, поэтому ACC-12 ловит route, забывший применить policy. Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные; E2E и axe — в Chromium, Firefox и WebKit.
- В коде нет redirect, кроме unauthenticated → login.

### Источники

- Epic [#167](https://github.com/dsc-sgu/mm-frontend/issues/167): «Section policy», «Route states и тексты», решение 2 в «Дополнительно».
- [«Спроектировать Course access vertical и identity seam»](https://github.com/dsc-sgu/mm-frontend/issues/115).
- [«Выбрать явный UX для отказа в course-local доступе»](https://github.com/dsc-sgu/mm-frontend/issues/111).
