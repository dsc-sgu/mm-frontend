import type { ReviewCommentInput } from '@/features/course/features/review/model/types';
import { getLineCommentStatus } from './comment-lifecycle';
import type { AttemptReviewLineComment } from './types';

/** The root comments of the next Review Revision; replies are not part of it. */
export function prepareLineCommentsForSave(
  comments: AttemptReviewLineComment[]
): ReviewCommentInput[] {
  return comments
    .filter((comment) => {
      const status = getLineCommentStatus(comment);

      return status !== 'draft' && status !== 'pending-delete';
    })
    .map((comment) => ({
      id: comment.id,
      filePath: comment.filePath,
      side: comment.side,
      lineNumber: comment.lineNumber,
      endSide: comment.endSide,
      endLineNumber: comment.endLineNumber,
      html: comment.html,
    }));
}
