import type {
  AttemptReviewCommentSide,
  AttemptReviewLineComment,
} from './types';

export function formatAttemptReviewCommentRange(
  comment: AttemptReviewLineComment
): string {
  const startLabel = sideLabel(comment.side).toLowerCase();
  const endSide = comment.endSide ?? comment.side;
  const endLineNumber = comment.endLineNumber ?? comment.lineNumber;

  if (comment.side === endSide && comment.lineNumber === endLineNumber) {
    return `К ${startLabel} #${comment.lineNumber}`;
  }

  if (comment.side === endSide) {
    const from = Math.min(comment.lineNumber, endLineNumber);
    const to = Math.max(comment.lineNumber, endLineNumber);
    return `К ${pluralSideLabel(comment.side).toLowerCase()} #${from}–${to}`;
  }

  return `К ${startLabel} #${comment.lineNumber} → ${sideLabel(endSide).toLowerCase()} #${endLineNumber}`;
}

function sideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'новой строке' : 'старой строке';
}

function pluralSideLabel(side: AttemptReviewCommentSide): string {
  return side === 'additions' ? 'новым строкам' : 'старым строкам';
}
