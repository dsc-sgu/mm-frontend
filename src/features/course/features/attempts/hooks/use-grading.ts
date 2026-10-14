import { useCallback, useMemo, useReducer } from 'react';
import { Map as ImmutableMap } from 'immutable';

import {
  createQuickGradeUpdate,
  getQuickGradeDraftError,
  savedGradeText,
  type QuickGradeUpdate,
} from '@/features/course/features/attempts/model/quick-grade';
import { isAttemptSelectable } from '@/features/course/features/attempts/model/selection';
import type { CourseId } from '@/features/course/model/identity';
import { useSaveQuickGradesMutation } from '@/features/course/features/attempts/api/queries';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';

type QuickGradingState =
  | { mode: 'idle' }
  | {
      mode: 'quick-grading';
      draftGradesByAttemptId: ImmutableMap<string, string>;
    };

type QuickGradingEvent =
  | { type: 'start' }
  | { type: 'exit' }
  | { type: 'changeDraftGrade'; attempt: CourseAttempt; grade: string }
  | { type: 'resetDraftGrade'; attempt: CourseAttempt }
  | { type: 'saved' };

const EMPTY_DRAFT_GRADES = ImmutableMap<string, string>();
const INITIAL_QUICK_GRADING_STATE: QuickGradingState = { mode: 'idle' };

function quickGradingReducer(
  state: QuickGradingState,
  event: QuickGradingEvent
): QuickGradingState {
  switch (event.type) {
    case 'start':
      return {
        mode: 'quick-grading',
        draftGradesByAttemptId: EMPTY_DRAFT_GRADES,
      };

    case 'exit':
    case 'saved':
      return { mode: 'idle' };

    case 'changeDraftGrade': {
      if (state.mode !== 'quick-grading') {
        return state;
      }

      return {
        mode: 'quick-grading',
        draftGradesByAttemptId:
          event.grade === savedGradeText(event.attempt)
            ? state.draftGradesByAttemptId.remove(event.attempt.id)
            : state.draftGradesByAttemptId.set(event.attempt.id, event.grade),
      };
    }

    case 'resetDraftGrade': {
      if (state.mode !== 'quick-grading') {
        return state;
      }

      return {
        mode: 'quick-grading',
        draftGradesByAttemptId: state.draftGradesByAttemptId.remove(
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
  const draftGradesByAttemptId = quickGrading
    ? state.draftGradesByAttemptId
    : EMPTY_DRAFT_GRADES;

  const startQuickGrading = useCallback(() => {
    dispatch({ type: 'start' });
  }, []);

  const exitQuickGrading = useCallback(() => {
    dispatch({ type: 'exit' });
  }, []);

  const changeDraftGrade = useCallback(
    (attempt: CourseAttempt, grade: string) => {
      dispatch({ type: 'changeDraftGrade', attempt, grade });
    },
    []
  );

  const resetDraftGrade = useCallback((attempt: CourseAttempt) => {
    dispatch({ type: 'resetDraftGrade', attempt });
  }, []);

  const markQuickGradesSaved = useCallback(() => {
    dispatch({ type: 'saved' });
  }, []);

  return {
    quickGrading,
    draftGradesByAttemptId,
    startQuickGrading,
    exitQuickGrading,
    changeDraftGrade,
    resetDraftGrade,
    markQuickGradesSaved,
  };
}

export function useCourseAttemptsGrading({
  courseId,
  attemptById,
  selectedAttempts,
  clearSelection,
  quickGradingState,
}: {
  courseId: CourseId;
  attemptById: Map<string, CourseAttempt>;
  selectedAttempts: CourseAttempt[];
  clearSelection: () => void;
  quickGradingState: ReturnType<typeof useCourseAttemptsQuickGradingState>;
}) {
  const saveQuickGradesMutation = useSaveQuickGradesMutation();
  const {
    quickGrading,
    draftGradesByAttemptId,
    startQuickGrading: startQuickGradingState,
    exitQuickGrading,
    changeDraftGrade,
    resetDraftGrade,
    markQuickGradesSaved,
  } = quickGradingState;

  const hasDraftChanges = !draftGradesByAttemptId.isEmpty();
  const hasDraftValidationErrors = useMemo(
    () =>
      draftGradesByAttemptId.some((draftGrade, attemptId) => {
        const attempt = attemptById.get(attemptId);

        return attempt
          ? Boolean(getQuickGradeDraftError(attempt, draftGrade))
          : false;
      }),
    [attemptById, draftGradesByAttemptId]
  );

  const startQuickGrading = useCallback(() => {
    startQuickGradingState();
    clearSelection();
  }, [clearSelection, startQuickGradingState]);

  const getDraftGrade = useCallback(
    (attempt: CourseAttempt) =>
      draftGradesByAttemptId.get(attempt.id) ?? savedGradeText(attempt),
    [draftGradesByAttemptId]
  );

  const saveSelectedMaxGrade = useCallback(async () => {
    const updates = selectedAttempts
      .filter(isAttemptSelectable)
      .map((attempt) => ({
        attemptId: attempt.id,
        grade: attempt.task.maxGrade,
      }));

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseId,
      updates,
    });
    clearSelection();
  }, [clearSelection, courseId, saveQuickGradesMutation, selectedAttempts]);

  const saveQuickGrades = useCallback(async () => {
    if (hasDraftValidationErrors) {
      return;
    }

    const updates = draftGradesByAttemptId
      .entrySeq()
      .map(([attemptId, draftGrade]) =>
        createQuickGradeUpdate({
          attemptId,
          attempt: attemptById.get(attemptId),
          draft: draftGrade,
        })
      )
      .filter((update): update is QuickGradeUpdate => update !== null)
      .toArray();

    if (updates.length === 0) {
      return;
    }

    await saveQuickGradesMutation.mutateAsync({
      courseId,
      updates,
    });
    markQuickGradesSaved();
  }, [
    attemptById,
    courseId,
    draftGradesByAttemptId,
    hasDraftValidationErrors,
    markQuickGradesSaved,
    saveQuickGradesMutation,
  ]);

  return {
    quickGrading,
    hasDraftChanges,
    hasDraftValidationErrors,
    savePending: saveQuickGradesMutation.isPending,
    getDraftGrade,
    changeDraftGrade,
    resetDraftGrade,
    startQuickGrading,
    exitQuickGrading,
    saveSelectedMaxGrade,
    saveQuickGrades,
  };
}
