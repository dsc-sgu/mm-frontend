---
id: mm-224-REV3.2
status: open
deps: [mm-221]
links: []
created: 2026-10-14T10:59:01Z
type: task
priority: 1
external-ref: gh-224
parent: mm-218
tags: [ready-for-agent]
---
# REV3.2: Загружать материал Attempt по changed-files manifest с проверкой полноты

Часть epic [«Review»](https://github.com/dsc-sgu/mm-frontend/issues/218). Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Материал Attempt приходит от backend: атомарный changed-files manifest и содержимое по записям. Teacher видит, с чем сравнивается Attempt, какие файлы не загрузились, и не может сохранить Review, пока материал неполон.

### Делает

**Mock backend.**
- У каждой Attempt есть manifest. Baseline описан в manifest: Attempt (возможно, другой Task той же Task Group), шаблон или пустое дерево.
- Запись manifest — путь, тип изменения, вид (`text | binary | too-large | unsupported`) и размеры.
- Содержимое текстовой записи — полный старый и новый текст.
- `world:review`, Саша, Attempt #2: 3 текстовые записи, binary и too-large, baseline — Attempt #1.
- Baseline, manifest и полнота содержимого — рабочие допущения [#113](https://github.com/dsc-sgu/mm-frontend/issues/113), помеченные в handlers.
- Профиль `fail:entry`: содержимое записи падает N раз или всегда. Test-only канал умеет включать его для E2E.

**Загрузка.**
- Сначала атомарный manifest, затем содержимое по записям. Transport может группировать записи.
- Автоматический retry ограничен для каждой записи. «Повторить» перезапрашивает только упавшие.
- Содержимое immutable и кэшируется по `AttemptId` и записи.

**Полнота** — чистая функция от manifest и статусов записей: все загружены → `complete`; есть упавшие → `incomplete { count }`. Нетекстовые записи помечены «не отображается» и полноту не блокируют.

**UI.**
- Шапка: «Сравнение с попыткой #N», «Сравнение с шаблоном» или «Сравнение с пустой базой».
- Упавшие записи перечислены по именам с terminal error и «Повторить».
- Пока материал неполон, Save недоступен с причиной «материал неполон (N)». Поля Review редактируемы.

### Удаляет

- Вычисление changed files на клиенте из двух снимков.
- Временную операцию материала из REV2.1.
- `baselineAttemptNumber`, выведенный клиентом.

### Не входит

- Выбор базы сравнения Teacher'ом — backlog [#196](https://github.com/dsc-sgu/mm-frontend/issues/196).
- Показ файла целиком — backlog [#195](https://github.com/dsc-sgu/mm-frontend/issues/195).
- Streaming материала: он заменит только способ доставки.

### Загрузка страницы

После [#239](https://github.com/dsc-sgu/mm-frontend/pull/239) чтения страницы Attempt стартуют из `loader` route через `attemptPageQueries` / `prefetchAttemptPage`, а ссылки на Attempt предзагружают route по намерению (раздел «Загрузка данных страницы» в `docs/agents/remote-data.md`). Manifest и содержимое по записям ложатся на эту схему так:

- **Manifest — независимое чтение.** Его вход (`AttemptId`) известен из route context, поэтому он входит в `attemptPageQueries` вместо временной операции материала и запускается и при навигации, и при предзагрузке.
- **Содержимое записей — зависимые чтения.** Их входы известны только из manifest, поэтому их нет в `attemptPageQueries`. Их запускает страница по manifest (или `loader` после manifest) — **только при настоящей навигации, никогда при предзагрузке по наведению**: наведение не должно тянуть полные тексты файлов.
- **Переключение Attempt** отменяет незавершённые запросы содержимого предыдущей Attempt; REV-38 остаётся в силе.
- **Отказ в доступе** у manifest и содержимого — объявленный исход `ResourceDenial`, как у остальных чтений по `AttemptId`; сбой содержимого записи — отказ этой записи с «Повторить».
- **Ленивые зависимости.** Операции, которые запускает `loader`, попадают в основной bundle; парсер diff импортируется динамически внутри операции (как в `load-material.ts` сейчас).

Streaming по-прежнему не входит. Когда он появится: поток не открывается при предзагрузке; отказ в начале потока — объявленный исход; обрыв посреди потока — сбой записи с «Повторить».

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| REV-06 | Model | Целостность | — | Полнота — чистая функция (manifest, статусы записей): все загружены → complete; любая упала → incomplete { count }; `binary`/`too-large`/`unsupported` с пометкой не блокируют. (I3) |
| REV-07 | Boundary | Целостность | `world:review`, `fail:entry` | Manifest атомарен, содержимое по записям; ограниченный auto-retry на запись; ручной «Повторить» перезапрашивает только упавшие. (I3) |
| REV-08 | Component | Целостность | `world:review`, `fail:entry` | Упавшие записи перечислены по именам, terminal error, «Повторить»; поля Working Copy редактируемы; publish gate «материал неполон (N)». (I3) |
| REV-09 | Component | Корректность | `world:review` | «Сравнение с …» показывает baseline из manifest: Attempt, шаблон или пустое дерево. |
| REV-E3 | E2E | Целостность | `world:review`, `fail:entry` | Запись manifest падает → публикация заблокирована с именем файла; после восстановления «Повторить» → публикация доступна. (I3) |
| A11Y-02 | Component | Корректность | — | Часть этого тикета: «Повторить» у упавших записей — доступные role и name. |
| TR-05 | Boundary | Корректность | `fail:http-500`, `fail:invalid` | Экземпляры шаблона для manifest и содержимого записи. |

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные; E2E — в Chromium, Firefox и WebKit.

### Источники

- Epic [#218](https://github.com/dsc-sgu/mm-frontend/issues/218): «Материал Attempt и готовность diff (REV3)».
- [«Спроектировать Review → Grade → Student result vertical»](https://github.com/dsc-sgu/mm-frontend/issues/116): «Identity и материал Attempt», slice 3.

## Comments

### 2026-10-19T23:29:49Z · t3m8ch

### Форма базы сравнения в модели

База сравнения описывается в модели вариантами (ADT по `AGENTS.md`), а не полем `baselineAttemptNumber: AttemptNumber | null`, как во временной операции материала из REV2.1. Поле `number | null` не различает два случая, когда номера попытки нет, поэтому если бэкенд выберет шаблон, шапка неверно покажет «Сравнение с пустой базой».

```ts
type Baseline =
  | { kind: 'attempt'; attemptId: AttemptId; attemptNumber: AttemptNumber; taskId: string }
  | { kind: 'template' }
  | { kind: 'empty' };
```

- Варианты взаимоисключающие. Не заменять их опциональным номером и булевым флагом.
- Базой сравнения может быть попытка предыдущего задания той же цепочки заданий: у студента один репозиторий на цепочку, и первая попытка следующего задания продолжает код предыдущего (решение фронтенда в #113, правило бэкенда пока открыто). Поэтому в варианте `attempt` есть задание: одного номера попытки мало. Шапка должна показывать, что это попытка предыдущего задания цепочки, а не только «Сравнение с попыткой #N».
- Текст «Сравнение с …» шапка выбирает через `switch` по `kind`, без проверки номера на truthy.
- DTO манифеста приводится к этому типу на границе доверия. Что именно бэкенд передаёт для варианта `attempt`, остаётся рабочим допущением #113.
