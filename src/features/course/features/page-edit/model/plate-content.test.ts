import { describe, expect, it } from 'vitest';
import {
  deserializeCourseContentToPlate,
  serializePlateToCourseContent,
} from './plate-content';
import { editDocument } from '@/features/course/features/page-document/model/document';

describe('Plate content adapter', () => {
  it('не создаёт изменений при открытии и возврате исходного документа', () => {
    const initial = editDocument([
      {
        id: 'h',
        type: 'heading',
        data: {
          formatVersion: 1,
          level: 2,
          children: [{ type: 'text', text: 'Курс' }],
        },
      },
      {
        id: 'a',
        type: 'list-item',
        data: {
          formatVersion: 1,
          variant: 'ordered',
          children: [{ type: 'text', text: 'Первый' }],
        },
      },
      {
        id: 'b',
        type: 'list-item',
        data: {
          formatVersion: 1,
          variant: 'ordered',
          children: [{ type: 'text', text: 'Второй' }],
        },
      },
      {
        id: 'i',
        type: 'image',
        data: {
          formatVersion: 1,
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
    expect(saved).toStrictEqual(initial.blocks);
  });
});
