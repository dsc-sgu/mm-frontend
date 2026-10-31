import { expect, it } from 'vitest';
import { isSafeCourseHref } from './links';

it.each([
  'https://example.com/a%20b?q=%2F',
  'http://localhost:5178',
  'mailto:teacher@example.com',
  'tel:+79991234567',
  '/courses/course',
  '#section',
])('accepts supported href %s', (href) => {
  expect(isSafeCourseHref(href)).toBe(true);
});

it.each([
  'javascript:alert(1)',
  'jav&#97;script:alert(1)',
  '%6aavascript:alert(1)',
  'java\nscript:alert(1)',
  'data:text/html,test',
  'vbscript:test',
  'about:blank',
  'ftp://example.com',
  '//example.com',
  '/\\example.com',
  '/\\course.invalid',
  '/\n/course.invalid',
  '/\t\\course.invalid',
  '/a b',
  '#a b',
  'https://example.com/a b',
  'https://',
  'https://[invalid',
  '',
])('rejects unsafe or unsupported href %s', (href) => {
  expect(isSafeCourseHref(href)).toBe(false);
});
