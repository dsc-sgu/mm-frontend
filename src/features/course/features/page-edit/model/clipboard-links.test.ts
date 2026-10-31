import { describe, expect, it } from 'vitest';
import {
  findCoursePageLinkCandidates,
  normalizeCoursePageLinkInput,
} from './clipboard-links';

describe('Course page link input', () => {
  it.each(['javascript:alert(1)', 'jav&#97;script:alert(1)'])(
    'rejects unsupported link input %s',
    (value) => {
      expect(normalizeCoursePageLinkInput(value)).toBeNull();
    }
  );

  it.each([
    '/courses/course',
    '#section',
    'ftp://example.com',
    'vscode://file/path',
    'mailto:teacher@example.com',
    'tel:+79991234567',
    'https://example.com/a%20b?q=%2F',
  ])('preserves accepted href %s', (value) => {
    expect(normalizeCoursePageLinkInput(value)?.href).toBe(value);
  });

  it('offers FTP links detected in text', () => {
    expect(findCoursePageLinkCandidates('ftp://example.com')[0]?.href).toBe(
      'ftp://example.com'
    );
  });
});
