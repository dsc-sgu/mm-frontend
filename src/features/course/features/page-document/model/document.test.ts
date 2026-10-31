import { describe, expect, it } from 'vitest';
import { readDocument, editDocument } from './document';

describe('Документ страницы курса v1', () => {
  it('канонизирует текст и остаётся неизменным при повторной загрузке', () => {
    const input = [
      {
        id: 'p',
        type: 'paragraph',
        data: {
          formatVersion: 1,
          children: [
            { type: 'text', text: '', marks: [] },
            { type: 'text', text: 'а\r\n', marks: ['italic', 'bold', 'bold'] },
            { type: 'text', text: 'б', marks: ['bold', 'italic'] },
          ],
        },
      },
    ];
    const result = readDocument(input);
    expect(result).toEqual([
      {
        id: 'p',
        type: 'paragraph',
        data: {
          formatVersion: 1,
          children: [{ type: 'text', text: 'а\nб', marks: ['bold', 'italic'] }],
        },
      },
    ]);
    expect(readDocument(result)).toEqual(result);
  });
  it('отклоняет блок без data.formatVersion', () => {
    expect(
      editDocument([{ id: 'p', type: 'paragraph', data: { children: [] } }])
    ).toEqual({ status: 'unsupported-content' });
  });
  it('сохраняет место невалидного блока и запрещает его редактирование', () => {
    const input = [
      {
        id: 'future',
        type: 'paragraph',
        data: { formatVersion: 2, children: [] },
      },
    ];
    expect(readDocument(input)).toEqual([
      { id: 'future', type: 'unsupported' },
    ]);
    expect(editDocument(input)).toEqual({ status: 'unsupported-content' });
  });
});

it('нормализует уровни по соседству и не допускает задания и спойлеры внутри спойлера', () => {
  const item = (id: string, indent: unknown) => ({
    id,
    type: 'list-item',
    data: { formatVersion: 1, variant: 'ordered', indent, children: [] },
  });
  const blocks = readDocument([
    item('a', 9),
    item('b', 8),
    item('c', NaN),
    item('d', 2.7),
  ]);
  expect(
    blocks.map((block) =>
      block.type === 'list-item' ? block.data.indent : null
    )
  ).toEqual([1, 2, 1, 2]);
  expect(
    editDocument([
      {
        id: 's',
        type: 'spoiler',
        data: {
          formatVersion: 1,
          title: [],
          children: [
            {
              id: 't',
              type: 'assignment',
              data: { formatVersion: 1, taskId: '1' },
            },
          ],
        },
      },
    ])
  ).toEqual({ status: 'unsupported-content' });
});
