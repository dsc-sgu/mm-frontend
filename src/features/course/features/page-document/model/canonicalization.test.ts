import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';
import { readDocument } from './document';

test.prop([
  fc.array(
    fc.record({
      type: fc.constant('text'),
      text: fc.string(),
      marks: fc.array(fc.constantFrom('bold', 'italic', 'code')),
    })
  ),
])(
  'канонизация идемпотентна для произвольных текстовых фрагментов',
  (children) => {
    const once = readDocument([
      { id: 'p', type: 'paragraph', data: { formatVersion: 1, children } },
    ]);
    expect(readDocument(once)).toEqual(once);
  }
);
