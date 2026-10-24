---
id: mm-222-REV2.2
status: open
deps: [mm-221]
links: [mm-d4wtq, mm-187, mm-s56by, mm-268, mm-181]
created: 2026-10-14T10:58:44Z
type: task
priority: 1
external-ref: gh-222
parent: mm-218
tags: [ready-for-agent]
---
# REV2.2: Строить историю попыток на странице Task из того же состояния

Часть epic mm-218 «Review». Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

История попыток Student'а на странице Task читается из того же состояния Attempts и Reviews, что и Review и selector. Grade в истории и на Attempt page одна.

### Делает

- **Операция истории попыток** Student'а в Task. Каждая Attempt несёт номер, время отправки, Grade и номер Review Revision. Ключ — под `['course', courseId, …]` через key factory `task`.
- **Только своя история.** Student видит только собственные Attempts текущего Course; решает handler.
- **Отметка обновлений.** Признак «есть непросмотренное» и mutation «обновления просмотрены» временно хранятся в каноническом состоянии по `AttemptId`. Отметка меняет состояние backend и переживает refetch. REV8 заменяет её Review Read State.
- **Повторное чтение** не порождает новых Attempts и отметок.
- **Разные Students.** Attempts с одинаковым `AttemptNumber` у разных Students не делят cache entry ни в истории, ни в selector.

### Удаляет

- Захардкоженный список попыток в моке страницы Task и его stateful-отметки.

### Не входит

- Сведения Task (описание, вложения, дедлайн) остаются на прежнем источнике.
- Teacher-вид страницы Task — FINAL.
- Review Read State и `markReviewSeen` — REV8.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| REV-05 | Boundary | Identity | `world:review` | Selector и история попыток читают одно MSW-состояние; Attempts с одинаковым `AttemptNumber` у разных Students не делят cache entry. (I1, I7) |
| REV-04 | Boundary | Целостность | `world:review`, `fail:invalid` | Часть этого тикета: история попыток Task несёт номер Review Revision; невалидный DTO отклоняется. (I7, I8) |
| TR-05 | Boundary | Корректность | `fail:http-500`, `fail:invalid` | Экземпляры шаблона для истории попыток и отметки обновлений. |

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Уточнения

mm-79: Student видит только историю, относящуюся к его identity и текущему Course; mutation отметки меняет состояние backend и сохраняется после refetch; повторное чтение не генерирует новых Attempts или отметок; feature `task` не импортирует собственный stateful RAM-мок истории.

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные.

### Источники

- Epic mm-218: «Read operations и единое состояние (REV2)».
- mm-116 «Спроектировать Review → Grade → Student result vertical»: slice 2.
