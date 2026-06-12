import { getLineCommentStatus } from './comment-lifecycle';
import type { AttemptReviewLineComment } from './types';

export function canManageLineComment(
  comment: AttemptReviewLineComment
): boolean {
  const status = getLineCommentStatus(comment);

  return (
    status === 'saved' ||
    status === 'pending-create' ||
    status === 'pending-update'
  );
}

export function canReplyToLineComment(
  comment: AttemptReviewLineComment
): boolean {
  return getLineCommentStatus(comment) === 'saved';
}
