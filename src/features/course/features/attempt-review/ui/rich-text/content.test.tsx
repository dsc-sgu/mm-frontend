import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { RichTextContent } from './content';
test('REV-17: показывает форматирование и вложенные списки без HTML', () => {
  const { container } = render(
    <RichTextContent
      text={{
        version: 1,
        children: [
          {
            type: 'p',
            children: [
              { text: '<img src=x>', bold: true, strikethrough: true },
              {
                type: 'a',
                url: 'https://example.com',
                children: [{ text: 'Источник' }],
              },
            ],
          },
          {
            type: 'list-item',
            variant: 'ordered',
            indent: 0,
            children: [{ text: 'Первый' }],
          },
          {
            type: 'list-item',
            variant: 'unordered',
            indent: 1,
            children: [{ text: 'Вложенный' }],
          },
          {
            type: 'list-item',
            variant: 'ordered',
            indent: 0,
            children: [{ text: 'Второй' }],
          },
        ],
      }}
    />
  );
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('strong')?.textContent).toBe('<img src=x>');
  expect(container.querySelector('s')?.textContent).toBe('<img src=x>');
  expect(screen.getByText('<img src=x>')).toBeTruthy();
  const link = screen.getByRole('link', { name: 'Источник' });
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(container.querySelectorAll('ol')).toHaveLength(1);
  expect(container.querySelectorAll('ol > li')).toHaveLength(2);
  expect(container.querySelector('ol > li > ul > li')?.textContent).toBe(
    'Вложенный'
  );
});

test('элементы списка с уменьшением отступа не теряются', () => {
  const { container } = render(
    <RichTextContent
      text={{
        version: 1,
        children: [
          {
            type: 'list-item',
            variant: 'ordered',
            indent: 1,
            children: [{ text: 'Вложенный' }],
          },
          {
            type: 'list-item',
            variant: 'ordered',
            indent: 0,
            children: [{ text: 'Корневой' }],
          },
        ],
      }}
    />
  );
  expect(container.textContent).toContain('Вложенный');
  expect(container.textContent).toContain('Корневой');
});
