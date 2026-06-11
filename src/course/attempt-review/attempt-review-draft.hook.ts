import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { scoreDraftMaxScoreError } from '@/course/grading';
import type {
  AttemptReviewAggregate,
  AttemptReviewLineComment,
} from './attempt-review.types';

export interface AttemptReviewDraft {
  score: string;
  overallFeedbackHtml: string;
  lineComments: AttemptReviewLineComment[];
}

export function useAttemptReviewDraft(review: AttemptReviewAggregate) {
  const [draft, setDraft] = useState<AttemptReviewDraft>(() =>
    createAttemptReviewDraft(review)
  );
  const savedDraft = useMemo(() => createAttemptReviewDraft(review), [review]);
  const scoreError = scoreDraftMaxScoreError(
    review.current.task.maxScore,
    draft.score
  );
  const hasChanges = !areAttemptReviewDraftsEqual(draft, savedDraft);

  return {
    draft,
    setDraft,
    savedDraft,
    scoreError,
    hasChanges,
    setScore: createDraftSetter(setDraft, 'score'),
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
    score: review.current.grade ? String(review.current.grade.score) : '',
    overallFeedbackHtml: review.overallFeedback.html,
    lineComments: review.lineComments.map((comment) => ({ ...comment })),
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

function areAttemptReviewDraftsEqual(
  first: AttemptReviewDraft,
  second: AttemptReviewDraft
): boolean {
  return (
    first.score === second.score &&
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
  return comment.status !== 'draft';
}
