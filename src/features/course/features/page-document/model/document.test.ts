import { describe, expect, it } from 'vitest';
import { readDocument, editDocument } from './document';

describe('Course page document v1', () => {
  it('canonicalizes text and stays unchanged when loaded again', () => {
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

  it('rejects a block without data.formatVersion', () => {
    expect(
      editDocument([{ id: 'p', type: 'paragraph', data: { children: [] } }])
    ).toEqual({ status: 'unsupported-content' });
  });

  it('preserves the position of an invalid block and prevents editing it', () => {
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

  it('normalizes list item nesting', () => {
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
  });

  it('rejects a task block inside a spoiler', () => {
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

  it('canonicalizes missing and undefined optional fields identically', () => {
    const omitted = [
      { id: 'c', type: 'code', data: { formatVersion: 1, code: 'x' } },
      { id: 'i', type: 'image', data: { formatVersion: 1, imageId: 'image' } },
      {
        id: 's',
        type: 'spoiler',
        data: { formatVersion: 1, title: [], children: [] },
      },
    ];
    const explicit = [
      {
        id: 'c',
        type: 'code',
        data: {
          formatVersion: 1,
          code: 'x',
          language: undefined,
          fileName: undefined,
        },
      },
      {
        id: 'i',
        type: 'image',
        data: {
          formatVersion: 1,
          imageId: 'image',
          alt: undefined,
          caption: undefined,
        },
      },
      {
        id: 's',
        type: 'spoiler',
        data: {
          formatVersion: 1,
          title: [],
          children: [],
          defaultOpen: undefined,
        },
      },
    ];
    const normalized = editDocument(omitted);
    expect(normalized).toStrictEqual({ status: 'supported', blocks: omitted });
    expect(normalized).toStrictEqual(editDocument(explicit));
  });

  it('rejects unsafe saved links instead of replacing them with about:blank', () => {
    const blocks = [
      {
        id: 'p',
        type: 'paragraph',
        data: {
          formatVersion: 1,
          children: [
            { type: 'link', text: 'Link', href: 'javascript:alert(1)' },
          ],
        },
      },
    ];
    expect(editDocument(blocks)).toEqual({ status: 'unsupported-content' });
    expect(readDocument(blocks)).toEqual([{ id: 'p', type: 'unsupported' }]);
  });
});
