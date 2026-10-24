---
id: mm-225-REV4
status: open
deps: [mm-221]
links: []
created: 2026-10-14T10:59:09Z
type: task
priority: 2
external-ref: gh-225
parent: mm-218
tags: [ready-for-human]
---
# REV4: Писать и показывать review-текст на Plate без HTML в модели

Часть epic [«Review»](https://github.com/dsc-sgu/mm-frontend/issues/218). Перед началом прочитать [`docs/agents/remote-data.md`](https://github.com/dsc-sgu/mm-frontend/blob/main/docs/agents/remote-data.md) (обязательно по `AGENTS.md`).

Overall Feedback, root comments и replies пишутся и показываются на Plate по `ReviewTextDocument`. HTML нет ни в модели, ни в моках, ни на readonly-выходе. Ссылка вставляется через dialog.

**Ждёт DOC1** из epic Course editing: общий rich-text UI (`course/ui/rich-text`) и политику ссылок (`course/model/links.ts`). Epic ещё не создан, связь добавится при его создании.

### Делает

**`ReviewTextDocument`** — versioned project-owned schema `{ version: 1, children: ReviewTextBlock[] }` в model feature `review`. DTO-схемы операций Review её переиспользуют.
- Профиль v1:
  - paragraph и hard break;
  - bold, italic, strike, inline code;
  - blockquote;
  - nested ordered и unordered lists без произвольного start;
  - plain code block без языка;
  - links.
- Headings, horizontal rules и images не поддерживаются.
- Schema строгая к version, discriminants узлов и marks, полям и URL. Неизвестное делает ответ `invalid-response`, содержимое не урезается молча. Апгрейды версий — явные чистые миграции.
- Ссылки проверяет общая политика DOC1.

**Пустота.**
- Очищенный Overall Feedback — `null`; пустой paragraph допустим только в локальном черновике редактора.
- Root comment и reply сохраняются только непустыми после нормализации whitespace и hard breaks.

**Review-text editor и readonly.**
- Edit и readonly используют один Plate profile.
- Readonly строит React elements из проверенных узлов, без `dangerouslySetInnerHTML`.
- Root-relative ссылка открывается router'ом в текущей вкладке, внешняя — в новой с `rel="noopener noreferrer"`.

**Dialog ссылки** вместо `window.prompt`: валидация по политике ссылок, ошибка у поля, возврат фокуса в review-text editor. Кнопка картинки удаляется.

**Paste — единственная HTML trust seam:** DOMPurify → converter в профиль v1 → normalizer. Script, style, images и headings удаляются с сохранением текста. Plain-text paste остаётся plain.

**Fixtures** mock backend разово конвертируются в v1 без потери содержания.

### Удаляет

- TipTap и все `@tiptap/*`.
- HTML-поля в модели, DTO и fixtures, sanitize readonly-HTML.
- `window.prompt` для ссылки и картинки.

### Не входит

- Replies как отдельные операции — REV5.
- Изображения — только вместе с отдельным managed-asset contract.
- Dual reader, legacy HTML fallback, постоянный HTML→Plate adapter.

### Контракты

| id | Слой | Риск | Fixtures | Контракт |
|---|---|---|---|---|
| REV-13 | Model | Целостность | — | `ReviewTextDocument` schema строга к version, nodes, marks, fields; неизвестное → invalid response, содержимое не урезается молча. |
| REV-14 | Model | Целостность | — | Общая политика ссылок `model/links.ts`: `http`, `https`, root-relative → допустимы; protocol-relative, `#frag`, `mailto`, `tel`, `javascript`, `data`, неизвестные схемы → отклонены. |
| REV-15 | Model | Корректность | — | Очищенный Overall Feedback → `null`; root comment и reply только непустые после нормализации whitespace. |
| REV-16 | Real browser | Целостность | `text:paste-html` | Paste HTML → DOMPurify → converter → normalizer: script, style, images, headings удалены, текст сохранён; plain-text paste остаётся plain. |
| REV-17 | Component | Корректность | — | Readonly рендерит узлы без HTML; root-relative ссылка — router в текущей вкладке; внешняя — новая вкладка с `rel="noopener noreferrer"`. |
| REV-18 | Real browser | Корректность | — | Dialog ссылки вместо `window.prompt`: валидация, ошибка, возврат фокуса в review-text editor. |

REV-14 проверяет общую политику ссылок DOC1 на review-тексте; самой политикой владеет DOC1.

Fixtures описаны во вкладке «Fixtures» [матрицы](https://github.com/dsc-sgu/mm-frontend/blob/ddda126c5e73ec787362805c286ee081ee26244d/docs/prototypes/test-contract-matrix.html).

### Готово, когда

- Lint и build проходят.
- Контракты выше зелёные; browser-контракты — в Chromium, Firefox и WebKit.
- В `package.json` и коде нет TipTap.
- Ручная проверка review-text editor: форматирование, списки, ссылки, paste из браузера и IDE в трёх движках.

### Источники

- Epic [#218](https://github.com/dsc-sgu/mm-frontend/issues/218): «Review-текст (REV4)».
- [«Выбрать persisted contract review-текста при переходе на Plate»](https://github.com/dsc-sgu/mm-frontend/issues/109).
- [«Спроектировать Review → Grade → Student result vertical»](https://github.com/dsc-sgu/mm-frontend/issues/116): slice 4.
