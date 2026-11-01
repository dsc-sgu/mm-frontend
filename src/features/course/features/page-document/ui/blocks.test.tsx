import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CourseContentBlocks } from './blocks';

describe('CourseContentBlocks', () => {
  it('shows a placeholder for an unsupported block', () => {
    render(
      <CourseContentBlocks
        courseSlug="course"
        resources={{ images: [], files: [] }}
        blocks={[{ id: 'bad', type: 'future', data: { formatVersion: 2 } }]}
      />
    );
    expect(screen.getByText('Блок не удалось показать')).toBeTruthy();
  });

  it('groups list items and nests a list in its parent item', () => {
    const item = (id: string, text: string, indent: number) => ({
      id,
      type: 'list-item',
      data: {
        formatVersion: 1,
        variant: 'ordered',
        indent,
        children: [{ type: 'text', text }],
      },
    });
    const { container } = render(
      <CourseContentBlocks
        courseSlug="course"
        resources={{ images: [], files: [] }}
        blocks={[
          item('a', 'Первый', 1),
          item('b', 'Вложенный', 2),
          item('c', 'Второй', 1),
        ]}
      />
    );
    expect(container.querySelectorAll('div > ol')).toHaveLength(1);
    expect(container.querySelector('ol')?.children).toHaveLength(2);
    expect(
      container.querySelector('ol')?.firstElementChild?.querySelector('ol')
        ?.firstElementChild?.textContent
    ).toBe('Вложенный');
  });

  it('shows a closed task summary and its unavailable state without a content link', () => {
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
          {
            id: 'a',
            type: 'assignment',
            data: { formatVersion: 1, taskId: '1' },
          },
          {
            id: 'b',
            type: 'assignment',
            data: { formatVersion: 1, taskId: '2' },
          },
        ]}
      />
    );
    expect(screen.getByText('Закрытое задание')).toBeTruthy();
    expect(screen.getByText(/Сначала выполните: Вводное задание/)).toBeTruthy();
    expect(screen.getByText(/Задание курса недоступно/)).toBeTruthy();
    expect(container.querySelector('a')).toBeNull();
  });
});
