import { expect, it } from 'vitest';
import { editDocument } from './document';
import { buildListTree } from './lists';

it('продолжает родительскую нумерацию после вложенного списка и сбрасывает её при смене маркера', () => {
  const result = editDocument(
    [
      ['a', 1, 'ordered'],
      ['b', 2, 'ordered'],
      ['c', 2, 'ordered'],
      ['d', 1, 'ordered'],
      ['e', 1, 'unordered'],
      ['f', 1, 'ordered'],
    ].map(([id, indent, variant]) => ({
      id,
      type: 'list-item',
      data: { formatVersion: 1, indent, variant, children: [] },
    }))
  );
  if (result.status !== 'supported')
    throw new Error('Ожидается поддерживаемый документ');
  const tree = buildListTree(
    result.blocks.filter((block) => block.type === 'list-item')
  );
  expect(tree.map((item) => [item.block.id, item.number])).toEqual([
    ['a', 1],
    ['d', 2],
    ['e', 1],
    ['f', 1],
  ]);
  expect(tree[0].nestedItems.map((item) => item.number)).toEqual([1, 2]);
});
