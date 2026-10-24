---
id: mm-228-REV6.2
status: open
deps: [mm-147, mm-226, mm-224, mm-223, mm-227]
links: []
created: 2026-10-14T10:59:33Z
type: task
priority: 1
external-ref: gh-228
parent: mm-218
tags: [ready-for-agent]
---
# REV6.2: Публиковать Review Revision атомарно, без ложного успеха и второй Review

Часть epic [«Review»](https://github.com/dsc-sgu/mm-frontend/issues/218). Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Teacher копит Grade, Overall Feedback и свои root comments в Review Working Copy и публикует их одной Review Revision. Сбой сети не даёт ни ложного успеха, ни второй Review. Конфликт с чужой публикацией не теряет правки.

### Делает

**Машина состояний.** Чистая функция `transitionReviewSession(state, event)` в model `review` с состояниями `loading | unavailable | viewing | editing | publishing | publication-unconfirmed | interrupted`. Запрещённые переходы — явные no-op.

**Hook.** `useReviewSession(attemptId, intent)` отдаёт состояние и намерения `editGrade`, `editFeedback`, `editOwnComment`, `publish`, `retryPublication`, `applyRecoveryItem`, `discardRecovery`. Намерения lease и вкладок (`tryTakeLease`, `continueHere`) добавляет REV7. Загрузка revision, повторы публикации и обновление проекций скрыты внутри.

**Publish gate.** `getPublishGate(...)` возвращает `{ status: 'ready' }` либо `{ status: 'blocked'; reasons }`. Причины этого тикета:
- revision не загружена;
- материал неполон (число записей);
- Worker `failed`;
- Grade отсутствует, больше максимума или с лишними знаками;
- нет изменений;
- публикация идёт или не подтверждена.

Причину «lease не мой» добавляет REV7.1. UI показывает все текущие причины.

**Права и привязка.**
- Teacher меняет Grade, Overall Feedback и свои root comments. Root comments других Teachers только для чтения.
- Выделение строки или диапазона в diff выбранного файла и стороны привязывает root comment к этому диапазону.

**Пропсы панели Review.** Сейчас `AttemptReviewReviewPanel` получает 13 пропсов, и это плохо:
- семь из них (`draft`, `gradeError`, `gradeChanged`, `hasChanges`, `onGradeChange`, `onFeedbackChange`, `onDiscard`) — разобранный на части результат одного `useAttemptReviewDraft`. Каждое новое поле Working Copy добавляет пропсы и в page, и в панель;
- в `mode="readonly"` панель всё равно требует пропсы редактирования и сохранения;
- полный список скопирован в двух местах `attempt-review/page.tsx` (десктопная и мобильная раскладка).

Панель получает состояние `useReviewSession` целиком, а не по полям. Её пропсы — discriminated union по режиму (`AGENTS.md`, «State modeling»): в режиме просмотра нет пропсов редактирования, публикации и publish gate. Разметка панели в `page.tsx` не дублируется.

**Публикация.** Форма уровня домена из #116 с уточнением #132: `leaseId` нет, lease принадлежит auth session.

```ts
type PublishReviewInput = {
  attemptId: AttemptId;
  baseRevision: ReviewRevisionNumber | null; // null — первая Review
  idempotencyKey: IdempotencyKey;
  grade: Grade;
  overallFeedback: ReviewTextDocument | null;
  ownRootComments: readonly OwnRootComment[]; // полный набор своих, id новых генерирует клиент
};

type PublishReviewResult =
  | { status: 'published'; revision: ReviewRevision }
  | { status: 'revision-conflict'; latestRevision: ReviewRevisionNumber }
  | { status: 'lease-not-held'; holder: TeacherSummary | null }
  | { status: 'not-found' }
  | { status: 'forbidden' };
```

- **MSW handler** проверяет idempotency key раньше revision, применяет Grade, Overall Feedback и полный набор своих root comments одной revision. Удалённый свой root comment с чужими replies оставляет «Комментарий удалён». Пока нет lease, `lease-not-held` handler не возвращает. Порядок проверок и хранение привязки — рабочие допущения [#113](https://github.com/dsc-sgu/mm-frontend/issues/113), помеченные в handler.
- **`published`** вызывает `observeReviewRevision`. Grade пишется и в RAM-мок Course Attempts до ATT1 (решение 4 epic).
- **Неизвестный исход** (сеть, `5xx`, невалидный ответ) — `publication-unconfirmed`:
  - Working Copy заморожена;
  - сначала ограниченный автоматический повтор с тем же `idempotencyKey`, затем «Повторить»;
  - новый ключ появляется только после авторитетного исхода;
  - ответ на повтор — авторитетная сверка.
- **`revision-conflict`** — `interrupted`:
  - показывается авторитетная последняя revision;
  - Working Copy уходит в панель «Неопубликованные изменения»: Grade, Overall Feedback и каждый свой root comment с привязкой, всё можно скопировать;
  - «Применить» переносит элемент в новую Working Copy от последней revision, автоматического слияния нет.

**Тестовая инфраструктура** — первый потребитель:
- **Общее состояние mock backend для E2E.** Только в test build состояние пишется в localStorage после каждого ответа и читается перед каждым запросом: все страницы одного BrowserContext и перезагрузки видят один backend. Обычный dev-режим по-прежнему сбрасывает состояние при загрузке.
- **Test-only канал:** смена session без сброса мира; удержание публикации; `fail:lost-response` для публикации.
- **Stateful-seam:** `useReviewSession` через `renderHook` с настоящим QueryClient, MSW в Node и fake clock.

### Удаляет

- `useAttemptReviewDraft` и статусы `pending-*`.
- Операцию Save и её payload полной заменой.

### Не входит

- Защита при уходе — REV6.3.
- Review Lease, `lease-not-held` и потеря lease как причина `interrupted` — REV7.1.
- Восстановление Working Copy из браузера — [#125](https://github.com/dsc-sgu/mm-frontend/issues/125).

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| REV-12 | Real browser | Целостность | `world:review` | Выделение строки или диапазона в diff выбранного файла и стороны → root comment привязан к этому диапазону; после публикации Student видит thread на тех же строках. |
| REV-22 | Model | Целостность | — | `transitionReviewSession`: полная таблица состояний × событий; запрещённые переходы — явные no-op. (I4) |
| REV-23 | Model | Целостность | — | `getPublishGate`: каждая причина отдельно и в комбинациях; UI-модель получает все текущие причины, а не первую. (I3, I4) |
| REV-24 | Stateful | Целостность | `clock` | `publication-unconfirmed`: Working Copy заморожена; auto-retry и «Повторить» несут тот же `idempotencyKey`; новый ключ — только после авторитетного исхода. (I4) |
| REV-25 | Boundary | Целостность | `world:review`, `fail:lost-response`, `fail:network` | Неизвестный исход публикации, параметризовано по двум мирам: ответ потерян после применения (`fail:lost-response`) и запрос не дошёл (`fail:network`). Клиент их не различает и в обоих делает одно: повтор с тем же `idempotencyKey`. Итог в обоих: `published`, в MSW ровно одна Review, до подтверждения успех не показан. (I4) |
| REV-28 | Component | Сохранность данных | `world:review` | `revision-conflict` или потеря lease → `interrupted`: авторитетная revision + панель «Неопубликованные изменения» (Grade, Overall Feedback, каждый свой root comment с привязкой), копирование, «Применить» после повторного взятия lease; автоматического слияния нет. (I5) |
| REV-31 | Component | Целостность | `world:review` | Держатель lease меняет Grade, Overall Feedback и свои root comments; root comments другого Teacher'а только для чтения. |
| REV-E1 | E2E | Целостность | `world:review` | Анна открывает Attempt #2 Саши из Course Attempts, ставит Grade, Overall Feedback и line comment, публикует → Саша в другом контексте видит всё вместе; Course Attempts и история Task показывают ту же Grade. (I7, I8) |
| REV-E2 | E2E | Целостность | `world:review`, `fail:lost-response` | Потерянный ответ публикации → «Публикация не подтверждена», Working Copy заморожена → «Повторить» → опубликовано; Саша видит ровно одну целостную Review. (I4, I8) |
| A11Y-02 | Component | Корректность | — | Часть этого тикета: причины publish gate — доступные role, name и state. |
| TR-05 | Boundary | Корректность | `fail:http-500`, `fail:invalid` | Экземпляр шаблона для публикации; `fail:http-500` и `fail:invalid` ведут в `publication-unconfirmed`. |

REV-28 в этом тикете проверяется для `revision-conflict`, потерю lease добавляет REV7.1. «Саша в другом контексте» в REV-E1 — смена session через test-only канал в том же BrowserContext (решение 2 epic).

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные; browser и E2E — в Chromium, Firefox и WebKit.

### Источники

- Epic [#218](https://github.com/dsc-sgu/mm-frontend/issues/218): «Review editor и публикация (REV6)», «Mock backend и test-only канал», решения 2 и 4.
- [«Спроектировать Review → Grade → Student result vertical»](https://github.com/dsc-sgu/mm-frontend/issues/116): «Публикация и неопределённость», «Review editor как глубокий module», slice 6.
- ADR 0001 «Review публикуется атомарными Review Revisions».
