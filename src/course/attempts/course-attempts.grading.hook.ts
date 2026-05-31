import { useCallback, useMemo, useState } from 'react';
import { Map as ImmutableMap } from 'immutable';

import {
  createQuickGradeUpdate,
  scoreDraftValidationError,
  scoreValue,
  type QuickGradeUpdate,
} from './course-attempts.grading';
import { isAttemptSelectable } from './course-attempts.selection';
import { useSaveQuickGradesMutation } from './course-attempts.queries';
import type { CourseAttempt } from './course-attempts.types';

export function useCourseAttemptsQuickGradingState() {
  const [quickGrading, setQuickGrading] = useState(false);
  const [draftScoresByAttemptId, setDraftScoresByAttemptId] = useState(() =>
    ImmutableMap<string, string>()
  );

  const startQuickGrading = useCallback(() => {
    setQuickGrading(true);
    setDraftScoresByAttemptId(ImmutableMap<string, string>());
  }, []);

  const exitQuickGrading = useCallback(() => {
    setQuickGrading(false);
    setDraftScoresByAttemptId(ImmutableMap<string, string>());
  }, []);

  const changeDraftScore = useCallback(
    (attempt: CourseAttempt, score: string) => {
      setDraftScoresByAttemptId((current) =>
        score === scoreValue(attempt)
          ? current.remove(attempt.id)
          : current.set(attempt.id, score)
      );
    },
    []
  );

  const resetDraftScore = useCallback((attempt: CourseAttempt) => {
    setDraftScoresByAttemptId((current) => current.remove(attempt.id));
  }, []);

  return {
    quickGrading,
    draftScoresByAttemptId,
    startQuickGrading,
    exitQuickGrading,
    changeDraftScore,
    resetDraftScore,
  };
}

export function useCourseAttemptsGrading({
  courseSlug,
  attemptById,
  selectedAttempts,
  clearSelection,
  quickGradingState,
}: {
  courseSlug: string;
  attemptById: Map<string, CourseAttempt>;
  selectedAttempts: CourseAttempt[];
  clearSelection: () => void;
  quickGradingState: ReturnType<typeof useCourseAttemptsQuickGradingState>;
}) {
  const saveQuickGradesMutation = useSaveQuickGradesMutation();
  const {
    quickGrading,
    draftScoresByAttemptId,
    startQuickGrading: startQuickGradingState,
    exitQuickGrading,
    changeDraftScore,
    resetDraftScore,
  } = quickGradingState;

  const hasDraftChanges = !draftScoresByAttemptId.isEmpty();
  const hasDraftValidationErrors = useMemo(
    () =>
      draftScoresByAttemptId.some((draftScore, attemptId) => {
        const attempt = attemptById.get(attemptId);

        return attempt
          ? Boolean(scoreDraftValidationError(attempt, draftScore))
          : false;
      }),
    [attemptById, draftScoresByAttemptId]
  );

  const startQuickGrading = useCallback(() => {
    startQuickGradingState();
    clearSelection();
  }, [clearSelection, startQuickGradingState]);

  const getDraftScore = useCallback(
    (attempt: CourseAttempt) =>
      draftScoresByAttemptId.get(attempt.id) ?? scoreValue(attempt),
    [draftScoresByAttemptId]
  );

  const saveSelectedMaxGrade = useCallback(async () => {
    const updates = selectedAttempts
      .filter(isAttemptSelectable)
      .map((attempt) => ({
        attemptId: attempt.id,
        score: attempt.task.maxScore,
      }));

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseSlug,
      updates,
    });
    clearSelection();
  }, [clearSelection, courseSlug, saveQuickGradesMutation, selectedAttempts]);

  const saveQuickGrades = useCallback(async () => {
    if (hasDraftValidationErrors) {
      return;
    }

    const updates = draftScoresByAttemptId
      .entrySeq()
      .map(([attemptId, draftScore]) =>
        createQuickGradeUpdate({
          attemptId,
          attempt: attemptById.get(attemptId),
          draftScore,
        })
      )
      .filter((update): update is QuickGradeUpdate => update !== null)
      .toArray();

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseSlug,
      updates,
    });
    exitQuickGrading();
  }, [
    attemptById,
    courseSlug,
    draftScoresByAttemptId,
    exitQuickGrading,
    hasDraftValidationErrors,
    saveQuickGradesMutation,
  ]);

  return {
    quickGrading,
    hasDraftChanges,
    hasDraftValidationErrors,
    savePending: saveQuickGradesMutation.isPending,
    getDraftScore,
    changeDraftScore,
    resetDraftScore,
    startQuickGrading,
    exitQuickGrading,
    saveSelectedMaxGrade,
    saveQuickGrades,
  };
}
