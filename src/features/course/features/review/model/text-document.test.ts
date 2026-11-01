import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import {
  ReviewTextDocumentSchema,
  NonemptyReviewTextSchema,
  normalizeReviewText,
  areReviewTextsEqual,
  type ReviewTextDocument,
} from './text-document';
import { fromReviewPlate, toReviewPlate } from './plate';

const document: ReviewTextDocument = {
  version: 1,
  children: [
    {
      type: 'blockquote',
      children: [{ text: 'Цитата', bold: true, strikethrough: true }],
    },
    {
      type: 'p',
      children: [
        { text: 'Проверка', bold: true },
        { type: 'a', url: '/courses/course', children: [{ text: 'Курс' }] },
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
    { type: 'code', text: 'const a = 1;\nprint(a)' },
  ],
};
describe('REV-13—REV-15: документ текста проверки', () => {
  it('сохраняет профиль при редактировании в Plate', () => {
    expect(fromReviewPlate(toReviewPlate(document))).toEqual(document);
  });
  it.each([
    { ...document, version: 2 },
    { ...document, extra: true },
    {
      version: 1,
      children: [{ type: 'heading', children: [{ text: 'Заголовок' }] }],
    },
    {
      version: 1,
      children: [{ type: 'p', children: [{ text: 'Текст', underline: true }] }],
    },
    {
      version: 1,
      children: [{ type: 'p', children: [{ text: 'Текст', bold: false }] }],
    },
    { version: 1, children: [{ type: 'code', text: 'код', language: 'ts' }] },
  ])('отклоняет неизвестную версию, узлы, поля и форматирование', (value) => {
    expect(v.safeParse(ReviewTextDocumentSchema, value).success).toBe(false);
  });
  it.each([
    '//example.com',
    '#frag',
    'mailto:a@b.ru',
    'tel:123',
    'javascript:alert(1)',
    'data:text/plain,test',
    'ftp://example.com',
  ])('отклоняет адрес %s', (url) => {
    expect(
      v.safeParse(ReviewTextDocumentSchema, {
        version: 1,
        children: [
          {
            type: 'p',
            children: [{ type: 'a', url, children: [{ text: 'Ссылка' }] }],
          },
        ],
      }).success
    ).toBe(false);
  });
  it('очищенный отзыв становится null и не сохраняется как комментарий', () => {
    const empty: ReviewTextDocument = {
      version: 1,
      children: [{ type: 'p', children: [{ text: ' \n\u00a0\t' }] }],
    };
    expect(normalizeReviewText(empty)).toBeNull();
    expect(v.safeParse(NonemptyReviewTextSchema, empty).success).toBe(false);
  });
  it('сравнивает содержимое независимо от порядка полей', () => {
    expect(
      areReviewTextsEqual(document, { children: document.children, version: 1 })
    ).toBe(true);
  });
});

it('пустые абзацы остаются только в локальном редакторе', () => {
  const value: ReviewTextDocument = {
    version: 1,
    children: [
      { type: 'p', children: [{ text: 'Отзыв' }] },
      { type: 'p', children: [{ text: '\n ' }] },
    ],
  };
  expect(normalizeReviewText(value)?.children).toHaveLength(1);
  expect(v.safeParse(NonemptyReviewTextSchema, value).success).toBe(false);
});

it('сохраняет границы абзацев цитаты как жёсткие переносы', () => {
  expect(
    fromReviewPlate([
      {
        type: 'blockquote',
        children: [
          { type: 'p', children: [{ text: 'Первая', bold: true }] },
          { type: 'p', children: [{ text: 'Вторая' }] },
        ],
      },
    ])
  ).toEqual({
    version: 1,
    children: [
      {
        type: 'blockquote',
        children: [
          { text: 'Первая', bold: true },
          { text: '\n' },
          { text: 'Вторая' },
        ],
      },
    ],
  });
});
