import type { AttemptReviewLineComment } from './types';

export function canManageLineComment(
  comment: AttemptReviewLineComment
): boolean {
  const status = comment.status ?? 'saved';

  return (
    status === 'saved' ||
    status === 'pending-create' ||
    status === 'pending-update'
  );
}

export function canReplyToLineComment(
  comment: AttemptReviewLineComment
): boolean {
  return (comment.status ?? 'saved') === 'saved';
}
