import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import {
  formatGrade,
  gradeInputMatches,
  parseGradeInput,
  type GradeInputError,
  type GradeInputResult,
} from '@/features/course/model/grade';
import { getLineCommentStatus } from './comment-lifecycle';
import type { AttemptReviewAggregate, AttemptReviewLineComment } from './types';

export type AttemptReviewDraft = {
  /** The Grade field's text; it becomes a Grade only by parsing on Save. */
  grade: string;
  overallFeedbackHtml: string;
  lineComments: AttemptReviewLineComment[];
};

export function useAttemptReviewDraft(review: AttemptReviewAggregate) {
  const [draft, setDraft] = useState<AttemptReviewDraft>(() =>
    createAttemptReviewDraft(review)
  );
  const savedDraft = useMemo(() => createAttemptReviewDraft(review), [review]);
  const gradeInput = parseGradeInput(draft.grade, review.current.task.maxGrade);
  // Compared as Grades: `7.50` over a saved 7,5 is not a change.
  const gradeChanged = !gradeInputMatches(
    draft.grade,
    review.current.grade?.value ?? null
  );
  const hasChanges =
    gradeChanged || !areAttemptReviewDraftsEqual(draft, savedDraft);

  return {
    draft,
    setDraft,
    savedDraft,
    gradeError: getDraftGradeError(gradeInput, hasChanges),
    /** The Grade to save, or null while the edits cannot be saved. */
    savableGrade:
      hasChanges && gradeInput.status === 'valid' ? gradeInput.grade : null,
    gradeChanged,
    hasChanges,
    setGrade: createDraftSetter(setDraft, 'grade'),
    setOverallFeedbackHtml: createDraftSetter(setDraft, 'overallFeedbackHtml'),
    setLineComments: createDraftSetter(setDraft, 'lineComments'),
    discard: () => setDraft(savedDraft),
    resetToReview: (nextReview: AttemptReviewAggregate) =>
      setDraft(createAttemptReviewDraft(nextReview)),
  };
}

export function createAttemptReviewDraft(
  review: AttemptReviewAggregate
): AttemptReviewDraft {
  return {
    grade: review.current.grade ? formatGrade(review.current.grade.value) : '',
    overallFeedbackHtml: review.overallFeedback.html,
    lineComments: review.lineComments.map(cloneLineComment),
  };
}

/**
 * Every Save carries a Grade, so an empty field invalidates the edits of a
 * first and an existing Review alike. An untouched empty field stays quiet:
 * there is nothing to save yet.
 */
function getDraftGradeError(
  gradeInput: GradeInputResult,
  hasChanges: boolean
): GradeInputError | null {
  if (gradeInput.status === 'valid') {
    return null;
  }

  return gradeInput.error === 'empty' && !hasChanges ? null : gradeInput.error;
}

function cloneLineComment(
  comment: AttemptReviewLineComment
): AttemptReviewLineComment {
  return {
    ...comment,
    replies: comment.replies?.map((reply) => ({ ...reply })),
  };
}

function createDraftSetter<Key extends keyof AttemptReviewDraft>(
  setDraft: Dispatch<SetStateAction<AttemptReviewDraft>>,
  key: Key
) {
  return (value: AttemptReviewDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
}

/** Compares everything but the Grade field, which is compared as a Grade. */
function areAttemptReviewDraftsEqual(
  first: AttemptReviewDraft,
  second: AttemptReviewDraft
): boolean {
  return (
    first.overallFeedbackHtml === second.overallFeedbackHtml &&
    areLineCommentsEqual(first.lineComments, second.lineComments)
  );
}

function areLineCommentsEqual(
  first: AttemptReviewLineComment[],
  second: AttemptReviewLineComment[]
): boolean {
  const firstPersisted = first.filter(isPersistedLineComment);
  const secondPersisted = second.filter(isPersistedLineComment);

  if (firstPersisted.length !== secondPersisted.length) {
    return false;
  }

  return firstPersisted.every((comment, index) => {
    const other = secondPersisted[index];

    return (
      other !== undefined &&
      comment.id === other.id &&
      comment.filePath === other.filePath &&
      comment.side === other.side &&
      comment.lineNumber === other.lineNumber &&
      comment.endSide === other.endSide &&
      comment.endLineNumber === other.endLineNumber &&
      comment.html === other.html &&
      comment.authorName === other.authorName &&
      comment.authorUsername === other.authorUsername &&
      comment.createdAt === other.createdAt &&
      comment.updatedAt === other.updatedAt &&
      getLineCommentStatus(comment) === getLineCommentStatus(other) &&
      areRepliesEqual(comment.replies ?? [], other.replies ?? [])
    );
  });
}

function areRepliesEqual(
  first: NonNullable<AttemptReviewLineComment['replies']>,
  second: NonNullable<AttemptReviewLineComment['replies']>
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((reply, index) => {
    const other = second[index];

    return (
      other !== undefined &&
      reply.id === other.id &&
      reply.html === other.html &&
      reply.authorName === other.authorName &&
      reply.authorUsername === other.authorUsername &&
      reply.createdAt === other.createdAt &&
      reply.updatedAt === other.updatedAt
    );
  });
}

function isPersistedLineComment(comment: AttemptReviewLineComment): boolean {
  return getLineCommentStatus(comment) !== 'draft';
}
