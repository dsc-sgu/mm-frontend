import type { AttemptReviewLineComment } from './attempt-review.types';

export function canManageLineComment(
  comment: AttemptReviewLineComment
): boolean {
  return (comment.status ?? 'saved') === 'saved';
}

export function canReplyToLineComment(
  comment: AttemptReviewLineComment
): boolean {
  return (comment.status ?? 'saved') === 'saved';
}
