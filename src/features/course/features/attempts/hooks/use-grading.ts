import { useCallback, useMemo, useReducer } from 'react';
import { Map as ImmutableMap } from 'immutable';

import {
  createQuickGradeUpdate,
  scoreDraftValidationError,
  scoreValue,
  type QuickGradeUpdate,
} from '@/features/course/features/grading';
import { isAttemptSelectable } from '@/features/course/features/attempts/model/selection';
import { useSaveQuickGradesMutation } from '@/features/course/features/attempts/api/queries';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';

type QuickGradingState =
  | { mode: 'idle' }
  | {
      mode: 'quick-grading';
      draftScoresByAttemptId: ImmutableMap<string, string>;
    };

type QuickGradingEvent =
  | { type: 'start' }
  | { type: 'exit' }
  | { type: 'changeDraftScore'; attempt: CourseAttempt; score: string }
  | { type: 'resetDraftScore'; attempt: CourseAttempt }
  | { type: 'saved' };

const EMPTY_DRAFT_SCORES = ImmutableMap<string, string>();
const INITIAL_QUICK_GRADING_STATE: QuickGradingState = { mode: 'idle' };

function quickGradingReducer(
  state: QuickGradingState,
  event: QuickGradingEvent
): QuickGradingState {
  switch (event.type) {
    case 'start':
      return {
        mode: 'quick-grading',
        draftScoresByAttemptId: EMPTY_DRAFT_SCORES,
      };

    case 'exit':
    case 'saved':
      return { mode: 'idle' };

    case 'changeDraftScore': {
      if (state.mode !== 'quick-grading') {
        return state;
      }

      return {
        mode: 'quick-grading',
        draftScoresByAttemptId:
          event.score === scoreValue(event.attempt)
            ? state.draftScoresByAttemptId.remove(event.attempt.id)
            : state.draftScoresByAttemptId.set(event.attempt.id, event.score),
      };
    }

    case 'resetDraftScore': {
      if (state.mode !== 'quick-grading') {
        return state;
      }

      return {
        mode: 'quick-grading',
        draftScoresByAttemptId: state.draftScoresByAttemptId.remove(
          event.attempt.id
        ),
      };
    }
  }
}

export function useCourseAttemptsQuickGradingState() {
  const [state, dispatch] = useReducer(
    quickGradingReducer,
    INITIAL_QUICK_GRADING_STATE
  );
  const quickGrading = state.mode === 'quick-grading';
  const draftScoresByAttemptId = quickGrading
    ? state.draftScoresByAttemptId
    : EMPTY_DRAFT_SCORES;

  const startQuickGrading = useCallback(() => {
    dispatch({ type: 'start' });
  }, []);

  const exitQuickGrading = useCallback(() => {
    dispatch({ type: 'exit' });
  }, []);

  const changeDraftScore = useCallback(
    (attempt: CourseAttempt, score: string) => {
      dispatch({ type: 'changeDraftScore', attempt, score });
    },
    []
  );

  const resetDraftScore = useCallback((attempt: CourseAttempt) => {
    dispatch({ type: 'resetDraftScore', attempt });
  }, []);

  const markQuickGradesSaved = useCallback(() => {
    dispatch({ type: 'saved' });
  }, []);

  return {
    quickGrading,
    draftScoresByAttemptId,
    startQuickGrading,
    exitQuickGrading,
    changeDraftScore,
    resetDraftScore,
    markQuickGradesSaved,
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
    markQuickGradesSaved,
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
    markQuickGradesSaved();
  }, [
    attemptById,
    courseSlug,
    draftScoresByAttemptId,
    hasDraftValidationErrors,
    markQuickGradesSaved,
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
