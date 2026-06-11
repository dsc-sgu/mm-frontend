import type {
  AttemptReviewCommentAuthor,
  AttemptReviewCommentSide,
  AttemptReviewLineComment,
} from './attempt-review.types';

export interface AttemptReviewLineRange {
  start: number;
  side?: AttemptReviewCommentSide;
  end: number;
  endSide?: AttemptReviewCommentSide;
}

export function addLineComment({
  comments,
  filePath,
  range,
  currentReviewer,
}: {
  comments: AttemptReviewLineComment[];
  filePath: string;
  range: AttemptReviewLineRange;
  currentReviewer: AttemptReviewCommentAuthor;
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
  return updateLineComment(comments, commentId, (comment) => ({
    ...comment,
    html,
    status:
      comment.status === 'draft' || comment.status === 'pending-create'
        ? 'pending-create'
        : 'pending-update',
    isEditing: false,
  }));
}

export function cancelLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) => {
    if (comment.status === 'draft') {
      return null;
    }

    return { ...comment, isEditing: false };
  });
}

export function editLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) => ({
    ...comment,
    isEditing: true,
  }));
}

export function deleteLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) => {
    if (comment.status === 'draft' || comment.status === 'pending-create') {
      return null;
    }

    return { ...comment, status: 'pending-delete', isEditing: false };
  });
}

export function revertPendingLineComment(
  comments: AttemptReviewLineComment[],
  commentId: string,
  savedCommentsById: Map<string, AttemptReviewLineComment>
): AttemptReviewLineComment[] {
  return updateLineComment(comments, commentId, (comment) => {
    if (comment.status === 'pending-create') {
      return null;
    }

    return savedCommentsById.get(comment.id) ?? null;
  });
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
  range: AttemptReviewLineRange;
  currentReviewer: AttemptReviewCommentAuthor;
}): AttemptReviewLineComment {
  const side = range.side ?? range.endSide ?? 'additions';
  const endSide = range.endSide ?? side;
  const lineNumber = range.start;
  const endLineNumber = range.end;

  return {
    id: `draft-${filePath}-${side}-${lineNumber}-${endSide}-${endLineNumber}-${Date.now()}`,
    filePath,
    side,
    lineNumber,
    endSide:
      endSide === side && endLineNumber === lineNumber ? undefined : endSide,
    endLineNumber: endLineNumber === lineNumber ? undefined : endLineNumber,
    html: '<p></p>',
    authorName: currentReviewer.name,
    authorUsername: currentReviewer.username,
    createdAt: '',
    updatedAt: '',
    status: 'draft',
  };
}
