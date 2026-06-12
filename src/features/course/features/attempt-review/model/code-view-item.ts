import type { CodeViewItem } from '@pierre/diffs';

import type { AttemptReviewLineCommentAnnotation } from './comment-annotation';
import type {
  AttemptReviewChangedFile,
  AttemptReviewLineComment,
} from './types';

export function createAttemptReviewCodeViewItems({
  files,
  commentsByFile,
  collapsedFilePaths,
}: {
  files: AttemptReviewChangedFile[];
  commentsByFile: Map<string, AttemptReviewLineComment[]>;
  collapsedFilePaths: Set<string>;
}): CodeViewItem<AttemptReviewLineCommentAnnotation>[] {
  return files.map((file) => {
    const fileComments = commentsByFile.get(file.path) ?? [];
    const collapsed = collapsedFilePaths.has(file.path);

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
        metadata: { comment },
      })),
    };
  });
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
