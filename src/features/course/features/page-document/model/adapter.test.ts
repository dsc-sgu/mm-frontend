import { expect, it } from 'vitest';
import {
  deserializeCourseContentToPlate,
  serializePlateToCourseContent,
} from '@/features/course/features/page-edit/model/plate-content';
import { editDocument } from './document';
import { equalJson } from './equality';

it('не создаёт изменений при открытии и возврате исходного документа', () => {
  const initial = editDocument([
    {
      id: 'h',
      type: 'heading',
      version: 1,
      data: { level: 2, children: [{ type: 'text', text: 'Курс' }] },
    },
    {
      id: 'a',
      type: 'list-item',
      version: 1,
      data: {
        variant: 'ordered',
        children: [{ type: 'text', text: 'Первый' }],
      },
    },
    {
      id: 'b',
      type: 'list-item',
      version: 1,
      data: {
        variant: 'ordered',
        children: [{ type: 'text', text: 'Второй' }],
      },
    },
    {
      id: 'i',
      type: 'image',
      version: 1,
      data: {
        imageId: 'img',
        alt: 'Рисунок',
        caption: [{ type: 'text', text: 'Подпись' }],
      },
    },
  ]);
  if (initial.status !== 'supported')
    throw new Error('Нужен поддерживаемый документ');
  const saved = serializePlateToCourseContent(
    deserializeCourseContentToPlate(initial.blocks)
  );
  expect(saved).toEqual(initial.blocks);
  expect(equalJson(saved, initial.blocks)).toBe(true);
});
