---
id: mm-220-REV1
status: closed
deps: [mm-173]
links: []
created: 2026-10-14T10:58:29Z
type: task
priority: 2
external-ref: gh-220
parent: mm-218
tags: [ready-for-agent]
closed: 2026-10-14T12:26:55Z
close-reason: completed
---
# REV1: Вводить Grade с проверенной точностью в общем поле Grade

Часть epic mm-218 «Review».

Grade — проверенное значение с точностью до тысячных. Её вводят в одно общее поле Grade и в Review editor, и в quick grading. Существующую Grade больше нельзя стереть.

### Делает

**Тип `Grade`** (общая model `course`).
- Создаётся только проверенным разбором ввода. Разделитель — `,` или `.`.
- Больше трёх знаков после запятой — ошибка, а не округление. Значение от нуля до `maxGrade` Task.
- Сравнение и сложение — в целых тысячных (`0,1 + 0,2 = 0,3`). `maxGrade` подчиняется той же точности.

**Поле Grade** (общий UI `course`).
- Ошибка показывается у поля: пусто, не число, лишние знаки, больше максимума.
- Поле объявляет `aria-invalid` и связано с описанием ошибки.

**Review editor.**
- Использует общее поле Grade.
- Пустое поле делает правки невалидными и для первой, и для существующей Review: Save недоступен.
- Save больше не умеет «снять Grade».

**Course Attempts.** Quick grading использует тот же тип и то же поле.

**Термины в коде.** `score` → `grade: Grade`, `maxScore` → `Task.maxGrade` во всех потребителях: Review editor, Attempt page, Course Attempts, страница Task и их моки. Wire-формат Grade в моках — рабочее допущение mm-113 (`tasks.max_grade` на backend сейчас `real`).

### Удаляет

- Feature `grading` целиком.
- `score`/`maxScore` и разбор с заменой первой `,` на `.`.
- Ветку Save, которая стирает Grade.

### Не входит

- Перенос времени и автора публикации из Grade в Review Revision — REV2.1.
- Review Working Copy и publish gate — REV6.2. До них «невалидная Working Copy» означает недоступный Save текущего редактора.
- Lifecycle quick grading — ATT6.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| REV-01 | Model | Целостность | — | Разбор Grade: `7`, `7,5`, `7.5`, `7,125`, `0`, `10` (max) → valid; `7,1255` → ошибка, а не округление; пусто, пробел, `-1`, `abc`, `1e1`, `10,001` → ошибка. |
| REV-02 | Model | Целостность | — | Сравнение и сложение в целых тысячных (`0,1 + 0,2 = 0,3`); `maxGrade` подчиняется той же точности. |
| REV-03 | Component | Целостность | `world:review` | Пустое поле Grade делает Working Copy невалидной и для первой, и для существующей Review; команды «снять Grade» нет; ошибка лишних знаков видна у поля. |
| A11Y-02 | Component | Корректность | — | Часть этого slice: поле Grade — `aria-invalid` и описание ошибки. Причины publish gate добавляет REV6.2, «Повторить» — REV3. |

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные.
- В коде нет `score`, `maxScore` и feature `grading`.

### Источники

- Epic mm-218: «Grade (REV1)».
- mm-116 «Спроектировать Review → Grade → Student result vertical»: «Grade», slice 1.
