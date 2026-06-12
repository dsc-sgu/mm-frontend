import type {
  AttemptReviewLineComment,
  AttemptReviewLineCommentStatus,
} from './types';

function getLineCommentStatus(
  comment: AttemptReviewLineComment
): AttemptReviewLineCommentStatus {
  return comment.status ?? 'saved';
}

export function submitLineCommentChange(
  comment: AttemptReviewLineComment,
  html: string
): AttemptReviewLineComment {
  const status = getLineCommentStatus(comment);
  const nextStatus =
    status === 'draft' || status === 'pending-create'
      ? 'pending-create'
      : 'pending-update';

  return {
    ...comment,
    html,
    status: nextStatus,
    isEditing: false,
  };
}

export function cancelLineCommentChange(
  comment: AttemptReviewLineComment
): AttemptReviewLineComment | null {
  const status = getLineCommentStatus(comment);

  if (status === 'draft' || status === 'pending-create') {
    return null;
  }

  return { ...comment, isEditing: false };
}

export function startLineCommentEditing(
  comment: AttemptReviewLineComment
): AttemptReviewLineComment {
  return {
    ...comment,
    isEditing: true,
  };
}

export function deleteLineCommentChange(
  comment: AttemptReviewLineComment
): AttemptReviewLineComment | null {
  const status = getLineCommentStatus(comment);

  if (status === 'draft' || status === 'pending-create') {
    return null;
  }

  return {
    ...comment,
    status: 'pending-delete',
    isEditing: false,
  };
}

export function revertLineCommentChange({
  comment,
  savedComment,
}: {
  comment: AttemptReviewLineComment;
  savedComment?: AttemptReviewLineComment;
}): AttemptReviewLineComment | null {
  const status = getLineCommentStatus(comment);

  if (status === 'pending-create') {
    return null;
  }

  return savedComment ?? null;
}
