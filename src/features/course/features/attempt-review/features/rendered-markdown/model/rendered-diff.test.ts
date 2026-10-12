// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { buildRenderedMarkdownDiff } from './rendered-diff';

describe('buildRenderedMarkdownDiff', () => {
  it('keeps unchanged blocks and shows a rewritten paragraph as deleted then added', () => {
    const diff = buildRenderedMarkdownDiff(
      '# Практика\n\nПервое решение задачи.\n',
      '# Практика\n\nДобавлена обработка **пустого** списка.\n'
    );

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        { change: 'unchanged', html: '<h1>Практика</h1>' },
        { change: 'deleted', html: '<p>Первое решение задачи.</p>' },
        {
          change: 'added',
          html: '<p>Добавлена обработка <strong>пустого</strong> списка.</p>',
        },
      ],
    });
  });

  it('marks every block of an added file as added', () => {
    const diff = buildRenderedMarkdownDiff('', '# Отчёт\n\nВсё готово.\n');

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        { change: 'added', html: '<h1>Отчёт</h1>' },
        { change: 'added', html: '<p>Всё готово.</p>' },
      ],
    });
  });

  it('compares list items one by one', () => {
    const diff = buildRenderedMarkdownDiff(
      '- [x] Парсер\n- [ ] Тесты\n- [ ] Отчёт\n',
      '- [x] Парсер\n- [x] Тесты\n- [ ] Отчёт\n'
    );

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        {
          change: 'unchanged',
          html: '<ul>\n<li><input checked="" disabled="" type="checkbox"> Парсер</li>\n</ul>',
        },
        {
          change: 'deleted',
          html: '<ul>\n<li><input disabled="" type="checkbox"> Тесты</li>\n</ul>',
        },
        {
          change: 'added',
          html: '<ul>\n<li><input checked="" disabled="" type="checkbox"> Тесты</li>\n</ul>',
        },
        {
          change: 'unchanged',
          html: '<ul>\n<li><input disabled="" type="checkbox"> Отчёт</li>\n</ul>',
        },
      ],
    });
  });

  it('keeps ordered list numbering when an item is inserted', () => {
    const diff = buildRenderedMarkdownDiff(
      '1. Склонировать\n2. Собрать\n',
      '1. Склонировать\n2. Установить\n3. Собрать\n'
    );

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        { change: 'unchanged', html: '<ol>\n<li>Склонировать</li>\n</ol>' },
        {
          change: 'added',
          html: '<ol start="2">\n<li>Установить</li>\n</ol>',
        },
        {
          change: 'unchanged',
          html: '<ol start="3">\n<li>Собрать</li>\n</ol>',
        },
      ],
    });
  });

  it('drops executable and styling markup from raw HTML', () => {
    const diff = buildRenderedMarkdownDiff(
      '',
      [
        '<script>alert(1)</script>',
        '',
        '<div class="fixed inset-0" style="color: red" id="login" onclick="alert(1)">Текст</div>',
        '',
        '<img src="https://example.com/a.png" onerror="alert(1)" alt="Схема">',
        '',
        '<iframe src="https://example.com"></iframe>',
        '',
        '<form action="https://example.com"><input type="password" name="secret"></form>',
        '',
        '<!-- заметка для себя -->',
        '',
      ].join('\n')
    );

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        { change: 'added', html: '<div>Текст</div>' },
        {
          change: 'added',
          html: '<img src="https://example.com/a.png" alt="Схема" loading="lazy" referrerpolicy="no-referrer">',
        },
      ],
    });
  });

  it('opens only absolute web links, in a new tab', () => {
    const diff = buildRenderedMarkdownDiff(
      '',
      [
        '[Документация](https://example.com/docs)',
        '',
        '[Клик](javascript:alert(1))',
        '',
        '[Настройка](docs/setup.md)',
        '',
        '<a href="https://example.com" target="_self">Сайт</a>',
        '',
        '![Схема](images/flow.png)',
        '',
      ].join('\n')
    );

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        {
          change: 'added',
          html: '<p><a href="https://example.com/docs" target="_blank" rel="noopener noreferrer">Документация</a></p>',
        },
        { change: 'added', html: '<p><a>Клик</a></p>' },
        { change: 'added', html: '<p><a>Настройка</a></p>' },
        {
          change: 'added',
          html: '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Сайт</a></p>',
        },
        { change: 'added', html: '<p>Схема</p>' },
      ],
    });
  });

  it('renders malformed Markdown without letting a block swallow the next one', () => {
    const diff = buildRenderedMarkdownDiff(
      '',
      [
        '<details>',
        '<summary>Подробнее</summary>',
        '',
        '**Незакрытое выделение и [ссылка без адреса]',
        '',
        '| Таблица | без',
        '|---',
        '',
        '```ts',
        'const unclosed = true;',
      ].join('\n')
    );

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        {
          change: 'added',
          html: '<details>\n<summary>Подробнее</summary></details>',
        },
        {
          change: 'added',
          html: '<p>**Незакрытое выделение и [ссылка без адреса]</p>',
        },
        { change: 'added', html: '<p>| Таблица | без\n|---</p>' },
        {
          change: 'added',
          html: '<pre><code>const unclosed = true;\n</code></pre>',
        },
      ],
    });
  });

  it('declines to render a version too large to render without freezing the page', () => {
    const largeText = '- пункт\n'.repeat(20_000);

    expect(buildRenderedMarkdownDiff('# Отчёт\n', largeText)).toEqual({
      status: 'too-large',
    });
    expect(buildRenderedMarkdownDiff(largeText, '')).toEqual({
      status: 'too-large',
    });
  });

  it('marks every block of a deleted file as deleted', () => {
    const diff = buildRenderedMarkdownDiff('# Отчёт\n\n---\n', '');

    expect(diff).toEqual({
      status: 'rendered',
      blocks: [
        { change: 'deleted', html: '<h1>Отчёт</h1>' },
        { change: 'deleted', html: '<hr>' },
      ],
    });
  });
});
