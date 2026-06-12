import { getLineCommentStatus } from './comment-lifecycle';
import type { AttemptReviewLineComment } from './types';

export function prepareLineCommentsForSave(
  comments: AttemptReviewLineComment[]
): AttemptReviewLineComment[] {
  const now = new Date().toISOString();

  return comments
    .filter((comment) => {
      const status = getLineCommentStatus(comment);

      return status !== 'draft' && status !== 'pending-delete';
    })
    .map((comment) => prepareLineCommentForSave(comment, now));
}

function prepareLineCommentForSave(
  comment: AttemptReviewLineComment,
  fallbackDate: string
): AttemptReviewLineComment {
  const status = getLineCommentStatus(comment);
  const createdAt =
    status === 'pending-create'
      ? fallbackDate
      : comment.createdAt || fallbackDate;
  const updatedAt =
    status === 'pending-create' || status === 'pending-update'
      ? fallbackDate
      : comment.updatedAt || fallbackDate;

  return {
    id: comment.id,
    filePath: comment.filePath,
    side: comment.side,
    lineNumber: comment.lineNumber,
    endSide: comment.endSide,
    endLineNumber: comment.endLineNumber,
    html: comment.html,
    authorName: comment.authorName,
    authorUsername: comment.authorUsername,
    createdAt,
    updatedAt,
    status: 'saved',
    replies: comment.replies?.map((reply) => ({
      id: reply.id,
      html: reply.html,
      authorName: reply.authorName,
      authorUsername: reply.authorUsername,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    })),
  };
}
