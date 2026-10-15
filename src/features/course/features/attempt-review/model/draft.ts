import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import {
  formatGrade,
  gradeInputMatches,
  parseGradeInput,
  type Grade,
  type GradeInputError,
  type GradeInputResult,
} from '@/features/course/model/grade';
import {
  publishedReview,
  type ReviewResult,
} from '@/features/course/features/review/model/types';
import { getLineCommentStatus } from './comment-lifecycle';
import type { AttemptReviewLineComment } from './types';

export type AttemptReviewDraft = {
  /** The Grade field's text; it becomes a Grade only by parsing on Save. */
  grade: string;
  overallFeedbackHtml: string;
  lineComments: AttemptReviewLineComment[];
};

export function useAttemptReviewDraft(review: ReviewResult, maxGrade: Grade) {
  const [draft, setDraft] = useState<AttemptReviewDraft>(() =>
    createAttemptReviewDraft(review)
  );
  const savedDraft = useMemo(() => createAttemptReviewDraft(review), [review]);
  const gradeInput = parseGradeInput(draft.grade, maxGrade);
  // Compared as Grades: `7.50` over a saved 7,5 is not a change.
  const gradeChanged = !gradeInputMatches(
    draft.grade,
    publishedReview(review)?.grade ?? null
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
    resetToReview: (nextReview: ReviewResult) =>
      setDraft(createAttemptReviewDraft(nextReview)),
  };
}

export function createAttemptReviewDraft(
  review: ReviewResult
): AttemptReviewDraft {
  if (review.status === 'none') {
    return { grade: '', overallFeedbackHtml: '', lineComments: [] };
  }

  return {
    grade: formatGrade(review.review.grade),
    overallFeedbackHtml: review.review.overallFeedbackHtml,
    lineComments: review.review.comments.map(cloneLineComment),
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
      comment.author.id === other.author.id &&
      comment.author.name === other.author.name &&
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
      reply.author.id === other.author.id &&
      reply.author.name === other.author.name &&
      reply.createdAt === other.createdAt &&
      reply.updatedAt === other.updatedAt
    );
  });
}

function isPersistedLineComment(comment: AttemptReviewLineComment): boolean {
  return getLineCommentStatus(comment) !== 'draft';
}
