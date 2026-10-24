---
id: mm-221-REV2.1
status: closed
deps: [mm-220]
links: []
created: 2026-10-14T10:58:36Z
type: task
priority: 2
external-ref: gh-221
parent: mm-218
tags: [ready-for-agent]
closed: 2026-10-22T00:40:54Z
close-reason: completed
---
# REV2.1: Читать Review, Attempt и selector по AttemptId из единого состояния Attempts и Reviews

Часть epic [«Review»](https://github.com/dsc-sgu/mm-frontend/issues/218). Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Attempt page и Review editor читают Review, сведения Attempt и selector Attempts раздельными операциями по `AttemptId` из одного состояния Attempts и Reviews в mock backend. Обратного перевода identities в slug и username больше нет.

### Делает

**Состояние mock backend.**
- В состоянии появляются Reviews. Review Revision содержит:
  - номер;
  - Grade, Overall Feedback (до REV4 — в текущем формате);
  - root comments с автором (`UserId`) и привязкой: файл, сторона diff, диапазон строк;
  - время и Teacher'а публикации.
- Replies с автором (`UserId`) хранятся рядом с root comment, но не входят в revision.
- Attempts получают время отправки, Task — `maxGrade`.
- `world:review`: Саша, Attempt #1 — Review revision 2 (Grade 7,5, Overall Feedback, root comments Анны и Бориса, reply Саши); Саша, Attempt #2 — без Review; Петя, Attempt #1 — без Review. Dev-seed остаётся демо-набором.

**Read operations** (feature `review` для Review, `attempt-review` для остального). Вместо aggregate:
- Review по `AttemptId`. Отсутствие Review — объявленный исход, а не ошибка.
- Сведения Attempt для шапки: Task, Student, номер, время отправки, дедлайн.
- Attempts Student'а в этой Task для selector, каждая с Grade и номером Review Revision.
- Материал Attempt — временная операция по `AttemptId` поверх существующего deterministic генератора снимков. REV3.2 заменяет её manifest.

Каждая проекция с Grade несёт номер Review Revision. `reviewKeys` и ключи остальных операций расширяют `['course', courseId, …]` через свои key factories.

**Переключение Attempt.** Selector показывает diff и Review только выбранной Attempt. Содержимое предыдущей не появляется под заголовком новой, даже пока новая грузится.

**Временные mutations.**
- Save и операции replies, HTTP cutover которых принадлежит REV5 и REV6.2, пишут в каноническое состояние прямо по стабильным id и не держат адаптер.
- Save создаёт следующую Review Revision.
- Grade по-прежнему записывается и в RAM-мок Course Attempts. Эту запись удаляет ATT1.

### Удаляет

- Aggregate `fetchAttemptReview`.
- `LegacyParams` и `resolveLegacyParams()`, включая эквивалент под другим именем. Нет fallback, восстанавливающего slug, username или номер Attempt ради прежнего источника.
- Stateful RAM-хранилище Review в моке attempt-review. Генераторы deterministic fixtures остаются, но не становятся вторым источником server state.

### Не входит

- История попыток на странице Task — REV2.2.
- Manifest, полнота и baseline от backend — REV3.2.
- Перевод review-текста на `ReviewTextDocument` — REV4.
- Разрешение locators в `UserId`/`AttemptId` на входе в route — уже ACC2, не меняется.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| REV-04 | Boundary | Целостность | `world:review`, `fail:invalid` | Review грузится по `AttemptId`; каждая проекция с Grade (Review, selector, Course Attempts, история Task) несёт номер Review Revision; невалидный DTO отклоняется. (I7, I8) |
| REV-38 | Component | Identity | `world:review`, `fail:held` | Переключение Attempt в selector: diff и Review только выбранной Attempt; содержимое предыдущей не показывается под заголовком новой. (I1) |
| TR-05 | Boundary | Корректность | `fail:http-500`, `fail:invalid` | Экземпляры шаблона для операций Review, сведений Attempt, selector и временного материала. |

REV-04 в этом тикете проверяется для Review и selector, историю Task добавляет REV2.2, Course Attempts — ATT1 (решение 4 epic).

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Уточнения

- [#69, уточнение REV2](https://github.com/dsc-sgu/mm-frontend/issues/69#issuecomment-6162616027) — пункты «Удаляет» и «Временные mutations» выше.
- [#81](https://github.com/dsc-sgu/mm-frontend/issues/81): attempt-review не импортирует собственный stateful RAM-мок; сохранённый reply получает identity фактического текущего User.

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные.
- Attempt page и Review editor не импортируют stateful RAM-мок attempt-review, адаптера identity → locator нет.

### Источники

- Epic [#218](https://github.com/dsc-sgu/mm-frontend/issues/218): «Read operations и единое состояние (REV2)», решение 4.
- [«Спроектировать Review → Grade → Student result vertical»](https://github.com/dsc-sgu/mm-frontend/issues/116): slice 2.
