---
id: mm-230-REV7.1
status: open
deps: [mm-229]
links: []
created: 2026-10-14T10:59:49Z
type: task
priority: 2
external-ref: gh-230
parent: mm-218
tags: [ready-for-agent]
---
# REV7.1: Брать и держать Review Lease на время работы в Review editor

Часть epic mm-218 «Review». Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Review editor берёт Review Lease при входе и держит его, пока Teacher работает. Второй Teacher видит, кто проверяет, и не перезаписывает чужую работу. Сам Teacher может вернуть lease из другой сессии.

### Делает

**Общий module `lease` уровня course.** Серверный протокол lease (взятие, heartbeat, снятие, `423` с holder) и адаптер Review. Адаптер черновика Course добавит DRF4.

**Lease Review:**
- **Владелец.** Lease покрывает Review конкретной Attempt, включая первую публикацию, и принадлежит auth session. Клиентского `leaseId` нет (ADR 0004).
- **Взятие** — автоматически при входе в Review editor. Attempt page lease никогда не берёт.
- **Heartbeat** — примерно каждые 20 с, пока Review editor открыт, и сразу при возвращении на вкладку. Незаметно истёкший свой lease берётся снова. Если его уже взял другой Teacher — `interrupted`.
- **Снятие** — при подтверждённом уходе из Review editor (точка из REV6.3) и при переключении Attempt. Публикация lease не снимает.

**Lease занят при входе:**
- **Чужой holder.** Только чтение, «Проверяет X» и «Попробовать взять на проверку». Holder обновляется при focus, автоматического захвата нет.
- **Holder — сам User из другой сессии.** «Открыт в другой сессии — на другом устройстве или в другом окне · Вернуть сюда» — перехват lease тем же User.

**Публикация.**
- Publish gate получает причину «lease не мой».
- `lease-not-held` при публикации и потеря lease переводят editor в `interrupted` с панелью «Неопубликованные изменения».

**Mock backend.**
- Review Lease по `AttemptId`: владелец — session, TTL 60 с, `423` с holder, перехват тем же User из другой сессии.
- Обобщение Course lease до lease по id ресурса, перехват и снятие при logout — рабочие допущения mm-113, помеченные в handlers.
- Test-only канал умеет сделать holder'ом другого Teacher'а для REV-E4.

**До REV7.2** вкладки одного браузера делят lease без координации и могут перезаписать правки друг друга. Риск такой же, как в текущем коде.

### Удаляет

- Имитацию событий Review Lease в RAM-моке Course Attempts.

### Не входит

- Протокол вкладок — REV7.2 и REV7.3.
- Снятие lease при долгой неактивности — mm-135.
- Показ состояния lease в Course Attempts из MSW — Course Attempts epic.
- SSE — mm-98.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| REV-32 | Stateful | Целостность | `clock` | Lease на fake clock: один на браузер (auth session); heartbeat ~20 с и сразу при возврате на вкладку; незаметно истёкший свой lease берётся снова; взятый другим → `interrupted`. |
| REV-33 | Component | Целостность | `world:review` | Lease занят при входе: только чтение, «Проверяет X», «Попробовать взять на проверку»; автоматического захвата нет; holder обновляется при focus. |
| REV-34 | Boundary | Целостность | `world:review` | Attempt page lease не берёт; Review editor снимает lease при уходе и при переключении Attempt; публикация lease не снимает. |
| REV-E4 | E2E | Целостность | `world:review` | Борис держит Review Lease → Анна видит «Проверяет Борис», публикация недоступна. |
| TR-05 | Boundary | Корректность | `fail:http-500`, `fail:invalid` | Экземпляры шаблона для взятия, heartbeat и снятия lease. |

REV-32 в этом тикете проверяется для одной вкладки. REV-28 и REV-29 дополняются потерей lease и снятием после подтверждённого ухода.

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные; E2E — в Chromium, Firefox и WebKit.

### Источники

- Epic mm-218: «Review Lease (REV7)», решение 1.
- mm-116 «Спроектировать Review → Grade → Student result vertical»: «Review Lease», slice 7.
- mm-132 «Спроектировать смену пишущей вкладки редактора»: решение 7.
- ADR 0004 «Lease принадлежит браузеру, вкладки делят редактор локально».
