import {
  cancelLineCommentChange,
  deleteLineCommentChange,
  revertLineCommentChange,
  startLineCommentEditing,
  submitLineCommentChange,
} from './comment-lifecycle';
import type {
  ReviewAuthor,
  DiffLineRange,
} from '@/features/course/features/review/model/types';
import type { AttemptReviewLineComment } from './types';

export function addLineComment({
  comments,
  filePath,
  range,
  currentReviewer,
}: {
  comments: AttemptReviewLineComment[];
  filePath: string;
  range: DiffLineRange;
  currentReviewer: ReviewAuthor;
}): AttemptReviewLineComment[] {
  return [
    ...comments,
    createDraftLineComment({ filePath, range, currentReviewer }),
  ];
}

export function updateLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string,
  update: (comment: AttemptReviewLineComment) => AttemptReviewLineComment | null
): AttemptReviewLineComment[] {
  return comments.flatMap((comment) => {
    if (comment.id !== commentId) {
      return [comment];
    }

    const nextComment = update(comment);
    return nextComment ? [nextComment] : [];
  });
}

export function submitLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string,
  html: string
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) =>
    submitLineCommentChange(comment, html)
  );
}

export function cancelLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, cancelLineCommentChange);
}

export function editLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, startLineCommentEditing);
}

export function deleteLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, deleteLineCommentChange);
}

export function revertPendingLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string,
  savedCommentsById: Map<string, AttemptReviewLineComment>
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) =>
    revertLineCommentChange({
      comment,
      savedComment: savedCommentsById.get(comment.id),
    })
  );
}

export function addLineCommentReply({
  comments,
  commentId,
  reply,
}: {
  comments: AttemptReviewLineComment[];
  commentId: string;
  reply: NonNullable<AttemptReviewLineComment['replies']>[number];
}): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) => ({
    ...comment,
    replies: [...(comment.replies ?? []), reply],
  }));
}

export function updateLineCommentReply({
  comments,
  commentId,
  reply,
}: {
  comments: AttemptReviewLineComment[];
  commentId: string;
  reply: NonNullable<AttemptReviewLineComment['replies']>[number];
}): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) => ({
    ...comment,
    replies: (comment.replies ?? []).map((currentReply) =>
      currentReply.id === reply.id ? reply : currentReply
    ),
  }));
}

export function deleteLineCommentReply({
  comments,
  commentId,
  replyId,
}: {
  comments: AttemptReviewLineComment[];
  commentId: string;
  replyId: string;
}): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) => ({
    ...comment,
    replies: (comment.replies ?? []).filter((reply) => reply.id !== replyId),
  }));
}

function createDraftLineComment({
  filePath,
  range,
  currentReviewer,
}: {
  filePath: string;
  range: DiffLineRange;
  currentReviewer: ReviewAuthor;
}): AttemptReviewLineComment {
  const { start, end } = range;

  return {
    id: `draft-${filePath}-${start.side}-${start.lineNumber}-${end.side}-${end.lineNumber}-${Date.now()}`,
    filePath,
    range,
    html: '<p></p>',
    author: currentReviewer,
    createdAt: '',
    updatedAt: '',
    status: 'draft',
  };
}
