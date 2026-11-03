export type CourseAttemptsPageMode =
  | 'failed'
  | 'loading'
  | 'empty'
  | 'quick-grading'
  | 'selection'
  | 'idle';

export function getCourseAttemptsPageMode({
  loading,
  failed,
  attemptsCount,
  quickGrading,
  selectedAttemptsCount,
}: {
  loading: boolean;
  failed: boolean;
  attemptsCount: number;
  quickGrading: boolean;
  selectedAttemptsCount: number;
}): CourseAttemptsPageMode {
  if (failed) {
    return 'failed';
  }

  if (loading) {
    return 'loading';
  }

  if (attemptsCount === 0) {
    return 'empty';
  }

  if (quickGrading) {
    return 'quick-grading';
  }

  if (selectedAttemptsCount > 0) {
    return 'selection';
  }

  return 'idle';
}

export function getCourseAttemptsFilterActionsDisabledReason(
  mode: CourseAttemptsPageMode
): string | undefined {
  if (mode === 'quick-grading') {
    return 'Фильтры недоступны во время быстрой оценки. Выйдите из режима быстрой оценки.';
  }

  if (mode === 'selection') {
    return 'Фильтры недоступны, пока выбраны попытки. Очистите выбор.';
  }

  return undefined;
}
