import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CourseContentBlocks } from './blocks';

it('показывает заглушку на месте неизвестного блока и семантические вложенные списки', () => {
  const item = (id: string, text: string, indent: number) => ({
    id,
    type: 'list-item',
    version: 1,
    data: { variant: 'ordered', indent, children: [{ type: 'text', text }] },
  });
  const { container } = render(
    <CourseContentBlocks
      courseSlug="course"
      resources={{ images: [], files: [] }}
      blocks={[
        { id: 'bad', type: 'future', version: 2, data: {} },
        item('a', 'Первый', 1),
        item('b', 'Вложенный', 2),
        item('c', 'Второй', 1),
      ]}
    />
  );
  expect(screen.getByText('Блок не удалось показать')).toBeTruthy();
  expect(container.querySelectorAll('div > ol')).toHaveLength(1);
  expect(container.querySelector('ol')?.children).toHaveLength(2);
  expect(
    container.querySelector('ol')?.firstElementChild?.querySelector('ol')
      ?.firstElementChild?.textContent
  ).toBe('Вложенный');
});

it('показывает саммари закрытого задания и недоступность без ссылки на содержимое', () => {
  const { container } = render(
    <CourseContentBlocks
      courseSlug="course"
      resources={{ images: [], files: [] }}
      taskSummaries={[
        {
          status: 'locked',
          taskId: '1',
          title: 'Закрытое задание',
          prerequisite: 'Вводное задание',
        },
        { status: 'unavailable', taskId: '2' },
      ]}
      blocks={[
        { id: 'a', type: 'assignment', version: 1, data: { taskId: '1' } },
        { id: 'b', type: 'assignment', version: 1, data: { taskId: '2' } },
      ]}
    />
  );
  expect(screen.getByText('Закрытое задание')).toBeTruthy();
  expect(screen.getByText(/Сначала выполните: Вводное задание/)).toBeTruthy();
  expect(screen.getByText(/Задание курса недоступно/)).toBeTruthy();
  expect(container.querySelector('a')).toBeNull();
});
