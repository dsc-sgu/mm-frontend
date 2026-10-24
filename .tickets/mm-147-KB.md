---
id: mm-147-KB
status: closed
deps: [mm-146]
links: []
created: 2026-10-11T12:28:55Z
type: task
priority: 2
external-ref: gh-147
parent: mm-151
tags: [ready-for-agent]
closed: 2026-10-12T10:46:11Z
close-reason: completed
---
# KB: Свести определение клавиш в один keyboard module

### Делает

Один keyboard module вместо трёх копий определения платформы:

- `src/features/course/features/attempt-review/model/keyboard-shortcuts.ts`;
- `src/features/course/features/page-edit/model/platform.ts`;
- `src/features/course/features/attempts/ui/sidebar.tsx` (`navigator.platform` в подписи Mod).

Правила:

- Сочетание определяется по `KeyboardEvent`: Mod — это Meta или Ctrl.
- Буква в сочетании определяется по символу (`KeyboardEvent.key`), если клавиша печатает латинскую букву, иначе — по физической клавише (`KeyboardEvent.code`). Сочетания работают в русской раскладке, а подписи верны в Dvorak и AZERTY. Раньше здесь стояла привязка только к физической клавише; почему её заменили — [решение с источниками](https://github.com/dsc-sgu/mm-frontend/issues/147#issuecomment-6120349109).
- Определение платформы нужно только для подписей: `⌘`/`Ctrl`, `⌥`/`Alt`.

Место модуля выбирается по `AGENTS.md`, без `src/shared`.

### Удаляет

Три копии определения платформы и проверки сочетаний по `navigator.platform`/`userAgent`.

### Не входит

- UA-проверка Firefox в `page-edit/ui/selection-toolbar.tsx` — это политика clipboard, она в DOC3.
- Собственные hotkeys Plate.

### Контракты

В матрице у KB контрактов нет. Таблица решений модуля проверяется Model-тестами в Vitest из K. Браузерный контракт DOC-22 («Shortcuts определяются по `KeyboardEvent`…») принадлежит DOC4. Клавиши quick grading (QG-13, QG-14) принадлежат ATT6.

### Готово, когда

- Lint и build проходят, Model-тесты модуля зелёные.
- Вручную проверено: `Mod+S` и сочетания review editor, Course Page editor и Course Attempts на macOS и не-macOS.

### Источники

- [«Разобрать низкоуровневые browser- и scheduling-механизмы»](https://github.com/dsc-sgu/mm-frontend/issues/72): «Keyboard semantics».
- [«Выбрать размещение Overall Feedback в compact quick grading»](https://github.com/dsc-sgu/mm-frontend/issues/121): «Клавиши», физическая клавиша, три копии.

## Comments

### 2026-10-12T08:12:50Z · t3m8ch

## Решение: буква определяется по символу, а без латиницы — по физической клавише

Правило «Сочетания с буквами привязаны к физической клавише (`KeyboardEvent.code`)» заменено гибридом:

- если клавиша печатает латинскую букву (`KeyboardEvent.key` — от `a` до `z`, регистр не важен), сравнивается эта буква;
- иначе сравнивается физическая клавиша (`KeyboardEvent.code`). Это русская раскладка, а на macOS — символы Option и dead keys.

Цель прежнего правила сохраняется: Mod+S работает в русской раскладке, ⌥G — на macOS. Реализация в #166, таблица решений в `src/features/keyboard/shortcut.test.ts`.

### Почему

**Наши сочетания мнемонические, а не позиционные.** «S» в Mod+S значит «сохранить», а не место на клавиатуре. С привязкой к `code` в Dvorak сочетание срабатывало на клавише, которая печатает «o», а в Colemak — «r». Подпись «S» указывала на другую клавишу, а Ctrl вместе с клавишей, которая печатает «s», ничего не делал.

**Так ведут себя ОС.**

- Windows: раскладка переводит scan code в virtual-key code, а приложения разбирают нажатия по virtual-key code. Scan code Microsoft советует брать, только когда важна позиция клавиши независимо от раскладки, «например, WASD в играх». Источник: [Microsoft Learn, Keyboard Input Overview → Scan Codes](https://learn.microsoft.com/en-us/windows/win32/inputdev/about-keyboard-input#scan-codes).
- macOS: если раскладка в основном не ASCII, то при зажатом Cmd система отдаёт ASCII-символы. Источник: [Zed, Key bindings](https://zed.dev/docs/key-bindings).

**Так работал браузерный `keyCode`, и на нём построены редакторы.**

- Chrome и Safari берут US-код для символа, который можно набрать в US-раскладке. Firefox для раскладки без латиницы берёт ASCII-раскладку с наивысшим приоритетом. Источник: [MDN, KeyboardEvent.keyCode](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode).
- ProseMirror (TipTap в review editor) сначала ищет сочетание по `key`, а если зажат модификатор, пробует `keyCode`: [prosemirror-keymap 1.2.3](https://github.com/ProseMirror/prosemirror-keymap/blob/1.2.3/src/keymap.ts#L81-L103).
- is-hotkey (Slate, Plate) по умолчанию сравнивает по `which`: [is-hotkey 0.2.0](https://github.com/ianstormtaylor/is-hotkey/blob/v0.2.0/src/index.js#L144-L147).

**Так делают приложения с поддержкой международных раскладок.**

- [Zed](https://zed.dev/docs/key-bindings) задаёт сочетания символами и в нелатинской раскладке сравнивает и с ASCII-раскладкой, и с реальной.
- [VS Code](https://github.com/microsoft/vscode/wiki/Keybinding-Issues) на macOS и Linux переводит сочетания, записанные символами, в `code` по текущей раскладке и строит из неё подписи.
- [Figma](https://www.figma.com/blog/behind-the-scenes-international-keyboard-shortcuts/) держит отдельные таблицы сочетаний для раскладок.

**`code` рассчитан на позиционные привязки.** По спеке это физическая позиция с именами из US-раскладки, и значения «not intended for display to the user». Источник: [W3C, UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/). Keyboard Map API, который даёт подписи для `code`, предназначен для приложений, которые «treat the keyboard as a set of buttons»; его пример — WASD. Работает он только в Chromium. Источник: [WICG, Keyboard Map](https://wicg.github.io/keyboard-map/).

### Отвергнуто

- **Только `code` (прежнее правило).** Подпись неверна в Dvorak и Colemak, а в AZERTY и QWERTZ — для A, Q, W, Z, M, Y.
- **Только `key`.** Ломается русская раскладка, где `key` равен «ы», и ⌥-сочетания на macOS, где `key` равен «©».
- **`keyCode`.** Свойство deprecated, а значения различаются между браузерами ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode)).
- **Keyboard Map API для подписей.** Есть только в Chromium и рассчитан на позиционные привязки.

### Следствия

- Статичная подпись «S» верна во всех латинских раскладках. В русской она совпадает с латинской буквой на клавише.
- На macOS в Dvorak ⌥-сочетание срабатывает на позиции QWERTY: Option печатает символ, поэтому решает `code`.
- Если в раскладке одна клавиша печатает латинскую букву, а другая — её нелатинский вариант (турецкая Q: «i» и «ı»), сочетание с I срабатывает на обеих.
- В #121 («Клавиши») сказано про физическую клавишу. Для латинских раскладок теперь действует это решение.
