import { useCallback, useMemo, useState } from 'react';

import {
  areCourseAttemptsFiltersEqual,
  EMPTY_COURSE_ATTEMPTS_FILTERS,
  normalizeCourseAttemptsFilters,
} from './course-attempts.filters';
import type { CourseAttemptsFilters } from './course-attempts.types';

export function useCourseAttemptsFilters({
  appliedFilters,
  onApplyFilters,
}: {
  appliedFilters: CourseAttemptsFilters;
  onApplyFilters: (filters: CourseAttemptsFilters) => void;
}) {
  const normalizedAppliedFilters = useMemo(
    () => normalizeCourseAttemptsFilters(appliedFilters),
    [appliedFilters]
  );
  const [draftState, setDraftState] = useState(() => ({
    baseAppliedFilters: normalizedAppliedFilters,
    draftFilters: normalizedAppliedFilters,
  }));

  // If filters changed outside of this component, for example via URL navigation,
  // discard the stale draft and start from the new applied filters.
  const draftFilters = areCourseAttemptsFiltersEqual(
    draftState.baseAppliedFilters,
    normalizedAppliedFilters
  )
    ? draftState.draftFilters
    : normalizedAppliedFilters;

  const setDraftFilters = useCallback(
    (filters: CourseAttemptsFilters) => {
      setDraftState({
        baseAppliedFilters: normalizedAppliedFilters,
        draftFilters: normalizeCourseAttemptsFilters(filters),
      });
    },
    [normalizedAppliedFilters]
  );

  const applyDraftFilters = useCallback(() => {
    onApplyFilters(draftFilters);
  }, [draftFilters, onApplyFilters]);

  const resetFilters = useCallback(() => {
    setDraftState({
      baseAppliedFilters: normalizedAppliedFilters,
      draftFilters: EMPTY_COURSE_ATTEMPTS_FILTERS,
    });
    onApplyFilters(EMPTY_COURSE_ATTEMPTS_FILTERS);
  }, [normalizedAppliedFilters, onApplyFilters]);

  return {
    normalizedAppliedFilters,
    draftFilters,
    setDraftFilters,
    applyDraftFilters,
    resetFilters,
  };
}
