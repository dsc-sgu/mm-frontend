import type { UserId } from '@/features/auth/model/identity';
import { parseDiffFromFile } from '@pierre/diffs';
import { describe, expect, it } from 'vitest';

import { createAttemptReviewCodeViewItems } from './code-view-item';
import type {
  AttemptReviewChangedFile,
  AttemptReviewLineComment,
} from './types';

function changedFile(
  path: string,
  oldText: string,
  newText: string
): AttemptReviewChangedFile {
  return {
    path,
    status: 'changed',
    addedLines: 1,
    deletedLines: 1,
    contents: { oldText, newText },
    diff: parseDiffFromFile(
      { name: path, contents: oldText },
      { name: path, contents: newText }
    ),
  };
}

function lineComment(filePath: string): AttemptReviewLineComment {
  return {
    id: `comment-${filePath}`,
    filePath,
    side: 'additions',
    lineNumber: 1,
    html: '<p>Уточните формулировку.</p>',
    author: {
      id: '00000000-0000-4000-8000-000000000001' as UserId,
      name: 'Преподаватель',
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
}

const readme = changedFile('README.md', '# Практика\n', '# Решение\n');
const source = changedFile('src/main.ts', 'let a = 1;\n', 'const a = 1;\n');
const commentsByFile = new Map([
  ['README.md', [lineComment('README.md')]],
  ['src/main.ts', [lineComment('src/main.ts')]],
]);

describe('createAttemptReviewCodeViewItems', () => {
  it('shows a Markdown file switched to the rendered view as one rendered block', () => {
    const [readmeItem] = createAttemptReviewCodeViewItems({
      files: [readme],
      commentsByFile,
      collapsedFilePaths: new Set(),
      renderedFilePaths: new Set(['README.md']),
    });

    expect(readmeItem).toMatchObject({
      id: 'README.md',
      type: 'file',
      collapsed: false,
      annotations: [
        {
          lineNumber: 1,
          metadata: { type: 'rendered-markdown', file: readme },
        },
      ],
    });
  });

  it('keeps the source diff and its line comments for files in the source view', () => {
    const [readmeItem, sourceItem] = createAttemptReviewCodeViewItems({
      files: [readme, source],
      commentsByFile,
      collapsedFilePaths: new Set(['src/main.ts']),
      renderedFilePaths: new Set(),
    });

    expect(readmeItem).toMatchObject({
      id: 'README.md',
      type: 'diff',
      fileDiff: readme.diff,
      collapsed: false,
      annotations: [
        {
          side: 'additions',
          lineNumber: 1,
          metadata: {
            type: 'line-comment',
            comment: lineComment('README.md'),
          },
        },
      ],
    });
    expect(sourceItem).toMatchObject({
      id: 'src/main.ts',
      type: 'diff',
      fileDiff: source.diff,
      collapsed: true,
    });
  });

  it('never renders a file that is not Markdown', () => {
    const [sourceItem] = createAttemptReviewCodeViewItems({
      files: [source],
      commentsByFile,
      collapsedFilePaths: new Set(),
      renderedFilePaths: new Set(['src/main.ts']),
    });

    expect(sourceItem).toMatchObject({ id: 'src/main.ts', type: 'diff' });
  });

  it('keeps a collapsed Markdown file collapsed in the rendered view', () => {
    const [readmeItem] = createAttemptReviewCodeViewItems({
      files: [readme],
      commentsByFile,
      collapsedFilePaths: new Set(['README.md']),
      renderedFilePaths: new Set(['README.md']),
    });

    expect(readmeItem).toMatchObject({
      id: 'README.md',
      type: 'file',
      collapsed: true,
    });
  });
});
