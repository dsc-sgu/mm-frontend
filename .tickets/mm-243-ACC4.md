---
id: mm-243-ACC4
status: open
deps: [mm-266, mm-221]
links: []
created: 2026-10-15T11:59:56Z
type: task
priority: 2
external-ref: gh-243
parent: mm-167
tags: [ready-for-agent]
---
# ACC4: Реагировать на отказ в доступе от любого чтения по стабильным identities

Часть epic [«Course access»](https://github.com/dsc-sgu/mm-frontend/issues/167). Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

## Проблема

Отказ в доступе к participant-bound ресурсу сейчас обрабатывается только при разрешении locator в `beforeLoad` (Attempt, Repository). Права проверяются при каждом запросе, поэтому отказ может прийти от любого последующего чтения по `CourseId`/`AttemptId`/`UserId`: при первой загрузке, при фоновой перезагрузке, при фокусе вкладки. Без общей реакции такая страница показывает техническую ошибку вместо `404` или оставляет на экране содержимое, к которому доступа уже нет. Это противоречит epic: «Подтверждённая потеря Membership сразу заменяет содержимое на course `404`».

Сейчас дыра закрыта только на странице попытки ([#239](https://github.com/dsc-sgu/mm-frontend/pull/239)): там это первые HTTP-чтения по стабильным identities. Остальные чтения после locator (Course Page, Task, Course Attempts, содержимое Repository) ещё идут в RAM-моки и получат ту же дыру при переводе на HTTP.

## Что уже есть (из #239)

- `access/api/resource-denial.ts`: `ResourceDenial` (`forbidden` | `not-found`) — объявленный исход чтения; `readResourceDenial(context)` классифицирует body-less `403`/`404`.
- `access/ui/route-state.tsx`: `CourseResourceDenied` — показывает resource `404` внутри Course shell и на `forbidden` вызывает `recheckCourseContextAfterAccessDenial`, чтобы Course route закрылся при потере Membership или смене роли.
- Страница попытки подключает это вручную: отказ любого из четырёх чтений заменяет страницу, в том числе после фоновой перезагрузки.

## Делает

- Реакция на `ResourceDenial` подключается централизованно на уровне Course shell, а не вручную на каждой странице. Способ — на выбор реализации (граница в Course route, общий hook над результатами queries под `courseKeys.byId`, …), но с сохранением правил `remote-data.md`: отказ — объявленный исход в resolved data, а не ошибка TanStack Query.
- Страница попытки переходит на общий механизм.
- Правило в `docs/agents/remote-data.md`: каждое чтение participant-bound ресурса по стабильным identities объявляет `ResourceDenial`; новая страница получает реакцию без ручного подключения.
- Курсовые чтения по `CourseId` (Course Page, Task, Course Attempts, Repository content) подключаются при своём переводе на HTTP. Тикеты этих переводов (ATT1 и др.) блокируются этим.

## Контракты

| Слой | Сценарий | Ожидание |
|---|---|---|
| Component | Чтение отвечает `403` после того, как locator ответил `found`, и Membership потерян | course `404` «К моим курсам», защищённого содержимого нет |
| Component | Чтение отвечает `404` при живом Membership | resource `404` внутри Course shell |
| Component | Фоновая перезагрузка уже открытой страницы получает отказ | содержимое и несохранённые правки исчезают |
| Boundary | body-less `403`/`404` | объявленный исход; `401`/`5xx` — отказ операции |

## Готово, когда

- Lint и build проходят, контракты выше зелёные.
- Ни одна страница не подключает реакцию на отказ вручную.
- Правило записано в `remote-data.md`.
