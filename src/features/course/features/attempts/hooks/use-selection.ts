import { useCallback, useMemo, useState } from 'react';
import { Set as ImmutableSet } from 'immutable';

import { isAttemptSelectable } from '@/features/course/features/attempts/model/selection';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';

export function useCourseAttemptsSelection(attempts: CourseAttempt[]) {
  const [selectedAttemptIds, setSelectedAttemptIds] = useState(() =>
    ImmutableSet<string>()
  );
  const selectedAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) =>
          selectedAttemptIds.has(attempt.id) && isAttemptSelectable(attempt)
      ),
    [attempts, selectedAttemptIds]
  );

  const isAttemptSelected = useCallback(
    (attempt: CourseAttempt) =>
      isAttemptSelectable(attempt) && selectedAttemptIds.has(attempt.id),
    [selectedAttemptIds]
  );

  const setAttemptSelected = useCallback(
    (attempt: CourseAttempt, checked: boolean) => {
      if (!isAttemptSelectable(attempt)) {
        return;
      }

      setSelectedAttemptIds((current) =>
        checked ? current.add(attempt.id) : current.remove(attempt.id)
      );
    },
    []
  );

  const selectAll = useCallback(() => {
    setSelectedAttemptIds(
      ImmutableSet(
        attempts.filter(isAttemptSelectable).map((attempt) => attempt.id)
      )
    );
  }, [attempts]);

  const clearSelection = useCallback(() => {
    setSelectedAttemptIds(ImmutableSet<string>());
  }, []);

  const removeAttemptIds = useCallback((attemptIds: Iterable<string>) => {
    const attemptIdsSet = new Set(attemptIds);

    if (attemptIdsSet.size === 0) {
      return;
    }

    setSelectedAttemptIds((current) =>
      current.filter((attemptId) => !attemptIdsSet.has(attemptId))
    );
  }, []);

  return {
    selectedAttemptIds,
    selectedAttempts,
    isAttemptSelected,
    setAttemptSelected,
    selectAll,
    clearSelection,
    removeAttemptIds,
  };
}
