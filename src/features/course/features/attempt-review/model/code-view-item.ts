import type { CodeViewItem } from '@pierre/diffs';

import { isMarkdownFile } from '@/features/course/features/attempt-review/features/rendered-markdown/model/markdown-file';
import type { AttemptReviewCodeViewAnnotation } from './code-view-annotation';
import type {
  AttemptReviewChangedFile,
  AttemptReviewLineComment,
} from './types';

export function createAttemptReviewCodeViewItems({
  files,
  commentsByFile,
  collapsedFilePaths,
  renderedFilePaths,
}: {
  files: AttemptReviewChangedFile[];
  commentsByFile: Map<string, AttemptReviewLineComment[]>;
  collapsedFilePaths: Set<string>;
  renderedFilePaths: Set<string>;
}): CodeViewItem<AttemptReviewCodeViewAnnotation>[] {
  return files.map((file) => {
    const collapsed = collapsedFilePaths.has(file.path);

    if (renderedFilePaths.has(file.path) && isMarkdownFile(file.path)) {
      return createRenderedMarkdownItem(file, collapsed);
    }

    const fileComments = commentsByFile.get(file.path) ?? [];

    return {
      id: file.path,
      type: 'diff',
      fileDiff: file.diff,
      collapsed,
      version: buildAttemptReviewCodeViewItemVersion(
        file.path,
        collapsed,
        fileComments
      ),
      annotations: fileComments.map((comment) => ({
        side: comment.endSide ?? comment.side,
        lineNumber: comment.endLineNumber ?? comment.lineNumber,
        metadata: { type: 'line-comment', comment },
      })),
    };
  });
}

// CodeView has no item for arbitrary content, so the rendered view is the
// annotation of a one-line file whose line the view's CSS hides.
function createRenderedMarkdownItem(
  file: AttemptReviewChangedFile,
  collapsed: boolean
): CodeViewItem<AttemptReviewCodeViewAnnotation> {
  return {
    id: file.path,
    type: 'file',
    file: {
      name: file.path,
      contents: ' ',
      lang: 'text',
      cacheKey: `${file.path}:rendered-markdown`,
    },
    collapsed,
    version: hashText(JSON.stringify({ filePath: file.path, collapsed })),
    annotations: [
      { lineNumber: 1, metadata: { type: 'rendered-markdown', file } },
    ],
  };
}

export function groupAttemptReviewCommentsByFile(
  comments: AttemptReviewLineComment[]
) {
  const grouped = new Map<string, AttemptReviewLineComment[]>();

  comments.forEach((comment) => {
    grouped.set(comment.filePath, [
      ...(grouped.get(comment.filePath) ?? []),
      comment,
    ]);
  });

  return grouped;
}

function buildAttemptReviewCodeViewItemVersion(
  filePath: string,
  collapsed: boolean,
  comments: AttemptReviewLineComment[]
): number {
  return hashText(
    JSON.stringify({
      filePath,
      collapsed,
      comments: comments.map((comment) => ({
        id: comment.id,
        side: comment.side,
        lineNumber: comment.lineNumber,
        endSide: comment.endSide,
        endLineNumber: comment.endLineNumber,
        html: comment.html,
        authorUsername: comment.authorUsername,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        status: comment.status,
        isEditing: comment.isEditing,
        replies: comment.replies,
      })),
    })
  );
}

function hashText(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return hash;
}
