---
id: mm-219-V-PIERRE
status: closed
deps: [mm-138]
links: []
created: 2026-10-14T10:58:21Z
type: task
priority: 2
external-ref: gh-219
parent: mm-218
tags: [ready-for-agent]
closed: 2026-10-14T12:05:44Z
close-reason: completed
---
# V-PIERRE: Обновить Pierre Diffs до 1.4 с одной Shiki и восстанавливаемым кэшем подсветки

Часть epic mm-218 «Review».

Diff Attempt работает на актуальной Pierre Diffs, в сборке одна Shiki, а сбой загрузки подсветки не ломает её до перезагрузки страницы. Поведение для User не меняется. Slice готовит основу, на которой REV3.1 строит готовность diff.

### Делает

**Pierre Diffs 1.4.**
- `@pierre/diffs` обновляется с 1.2.7 до актуальной 1.4.x по официальной [migration guide 1.4](https://github.com/pierrecomputer/pierre/releases/tag/diffs-v1.4.0).
- Под новый API адаптируются все места его использования: provider Worker pool (опции pool и highlighter), рендер diff, file tree и annotations комментариев, разбор diff в моках.
- Patch Pierre допустим только для несовместимости, воспроизведённой уже после обновления, со ссылкой на upstream issue. Заранее 1.2.7 не патчится.

**Одна Shiki.**
- Сейчас 1.2.7 жёстко требует `shiki ^3` и `@shikijs/transformers ^3`, поэтому рядом с app-owned Shiki 4 в lock лежит вложенная Shiki 3 со своими `@shikijs/*`. Pierre 1.4.2 принимает `^3 || ^4`.
- После обновления Pierre использует app-owned Shiki 4. В lock одна мажорная версия `shiki` и `@shikijs/*`, build не тащит вторую копию грамматик, тем и движков.

**Кэш Promise подсветки code blocks.**
- Подсветка code blocks Course Page кэширует Promise highlighter'а, списка языков и загрузки каждого языка. Отклонённый Promise сейчас остаётся в кэше навсегда: после одного сбоя загрузки chunk подсветка возвращает ошибку до перезагрузки страницы.
- Отклонённая загрузка убирается из кэша, следующая подсветка загружает заново. Успешные загрузки по-прежнему кэшируются и не дублируются при параллельных вызовах.

### Удаляет

- Вложенную Shiki 3 и `@shikijs/transformers` 3 из lock.

### Не входит

- `@pierre/trees` — backlog mm-137.
- Перенос Worker pool на routes review, состояния `loading | ready | failed` и бесконечный loader — REV3.1.
- Лимиты Worker pool (1 Worker / cache 10 на мобильных, 3 / 100 на desktop) — их подтверждают замером после REV3.

### Контракты

Контрактов матрицы у slice нет. Добавляется один Model-тест на кэш подсветки: первая загрузка языка падает → исход `highlight-error`; следующая подсветка того же языка загружает его заново и возвращает `highlighted`.

### Готово, когда

- Lint и build проходят.
- Существующие тесты зелёные, включая E2E страницы проверки Attempt и markdown-diff в Chromium, Firefox и WebKit.
- В lock одна мажорная версия `shiki` и `@shikijs/*`.
- Model-тест на восстановление кэша зелёный.

### Источники

- Epic mm-218.
- mm-72 «Разобрать низкоуровневые browser- и scheduling-механизмы»: «`@pierre/diffs` и две Shiki», «transiently poisoned Shiki Promise caches».
- mm-69, комментарий от 2026-10-11T12:02:31Z: кэш Shiki отнесён к V-PIERRE.
