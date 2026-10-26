---
id: mm-p0dy4
status: open
deps: [mm-222]
links: []
created: 2026-10-26T18:57:37Z
type: chore
priority: 3
tags: [ready-for-agent]
---
# Вынести проверку статуса ответа ресурса участника в helper

Восемь операций чтения и записи ресурса участника повторяют одну и ту же пару проверок:

```ts
const denial = readResourceDenial(context);
if (denial) {
  return denial;
}
if (context.response.status !== 200) {
  throw unexpectedHttpStatus(context);
}
```

Это одно правило: «404 без тела — `ResourceDenial`, любой статус кроме ожидаемого — отказ операции». Сейчас его переписывают в каждой операции, и проверку статуса можно забыть.

Операции:
- `load-attempt`, `load-summary`, `load-material`, `load-student-attempts` (attempt-review);
- `load-review` (review);
- `load-repository` (repository);
- `load-attempt-history` и `mark-updates-seen` (task, со статусом 204).

### Делает

- Helper рядом с `readResourceDenial` в `src/features/course/features/access/api/resource-denial.ts`, например `readParticipantStatus(context, expected): ResourceDenial | null`. 404 даёт отказ, ожидаемый статус даёт `null`, любой другой статус бросает `unexpectedHttpStatus`.
- Все восемь операций переходят на него.
- Эталон в `docs/agents/remote-data.md`, раздел «Отказ в доступе к ресурсу участника», пункт 1, ссылается на helper.

### Не входит

- Общий `readParticipantJson(context, schema)`: после разбора операции заворачивают данные по-разному (`{ status: 'found', attempts }`, `{ status: 'found', summary }`, а `load-review` возвращает свою схему со статусом), так что общего у них только эти две проверки.
- Изменение классификации исходов какой-либо операции.

### Готово, когда

- `bun run lint`, `bun run build` и `bun run test` проходят.
- Тесты TR-05 операций не менялись и зелёные.
- В `src/features` нет `readResourceDenial(context)` вне helper.

### Источники

- Замечание при ревью волны 1 эпика mm-218 (ветка `mm-218-wave1`).
