import type { ReviewCommentSide } from '@/features/course/features/review/model/types';
import type { AttemptReviewLineComment } from './types';

export function formatAttemptReviewCommentRange(
  comment: AttemptReviewLineComment
): string {
  const { start, end } = comment.range;
  const startLabel = sideLabel(start.side).toLowerCase();

  if (start.side === end.side && start.lineNumber === end.lineNumber) {
    return `К ${startLabel} #${start.lineNumber}`;
  }

  if (start.side === end.side) {
    const from = Math.min(start.lineNumber, end.lineNumber);
    const to = Math.max(start.lineNumber, end.lineNumber);
    return `К ${pluralSideLabel(start.side).toLowerCase()} #${from}–${to}`;
  }

  return `К ${startLabel} #${start.lineNumber} → ${sideLabel(end.side).toLowerCase()} #${end.lineNumber}`;
}

function sideLabel(side: ReviewCommentSide): string {
  return side === 'additions' ? 'новой строке' : 'старой строке';
}

function pluralSideLabel(side: ReviewCommentSide): string {
  return side === 'additions' ? 'новым строкам' : 'старым строкам';
}
