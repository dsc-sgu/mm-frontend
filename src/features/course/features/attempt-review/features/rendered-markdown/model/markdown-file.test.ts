import { describe, expect, it } from 'vitest';

import { isMarkdownFile } from './markdown-file';

describe('isMarkdownFile', () => {
  it.each([
    'README.md',
    'docs/guide.markdown',
    'notes/day.mdown',
    'notes/day.mkd',
    'notes/day.mkdn',
    'notes/day.mdwn',
    'docs/CHANGELOG.MD',
  ])('recognizes %s as Markdown', (path) => {
    expect(isMarkdownFile(path)).toBe(true);
  });

  it.each([
    'src/main.ts',
    'docs/page.mdx',
    'README',
    'md',
    'docs.md/index.ts',
    'notes/.md.bak',
  ])('does not treat %s as Markdown', (path) => {
    expect(isMarkdownFile(path)).toBe(false);
  });
});
