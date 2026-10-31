import { expect, it } from 'vitest';
import {
  findCoursePageLinkCandidates,
  normalizeCoursePageLinkInput,
} from './clipboard-links';

it.each([
  'javascript:alert(1)',
  'jav&#97;script:alert(1)',
  'ftp://example.com',
  '/a b',
  '#a b',
  '//example.com',
  '/\\course.invalid',
])('rejects unsupported link input %s', (value) => {
  expect(normalizeCoursePageLinkInput(value)).toBeNull();
});

it.each([
  '/courses/course',
  '#section',
  'mailto:teacher@example.com',
  'tel:+79991234567',
  'https://example.com/a%20b?q=%2F',
])('preserves accepted href %s', (value) => {
  expect(normalizeCoursePageLinkInput(value)?.href).toBe(value);
});

it('does not offer unsupported protocols from detected text', () => {
  expect(findCoursePageLinkCandidates('ftp://example.com')).toEqual([]);
});
