import type {
  AttemptReviewLineComment,
  AttemptReviewLineCommentStatus,
} from './types';

export function getLineCommentStatus(
  comment: AttemptReviewLineComment
): AttemptReviewLineCommentStatus {
  return comment.status ?? 'saved';
}

export function isPendingLineComment(
  comment: AttemptReviewLineComment
): boolean {
  const status = getLineCommentStatus(comment);

  return (
    status === 'pending-create' ||
    status === 'pending-update' ||
    status === 'pending-delete'
  );
}

export function isEditableLineComment({
  comment,
  mode,
}: {
  comment: AttemptReviewLineComment;
  mode: 'editable' | 'readonly';
}): boolean {
  const status = getLineCommentStatus(comment);

  return (
    mode === 'editable' && (status === 'draft' || comment.isEditing === true)
  );
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
