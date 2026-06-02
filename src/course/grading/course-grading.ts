export interface CourseGradeDraftAttempt {
  id: string;
  task: {
    maxScore: number;
  };
  grade: {
    score: number;
  } | null;
  reviewLock?: unknown;
}

export interface QuickGradeUpdate {
  attemptId: string;
  score: number;
}

export function scoreValue(attempt: CourseGradeDraftAttempt): string {
  return attempt.grade ? String(attempt.grade.score) : '';
}

export function scoreDraftChanged(
  attempt: CourseGradeDraftAttempt,
  draft: string | undefined
): boolean {
  return (draft ?? '') !== scoreValue(attempt);
}

export function normalizeScoreDraftInput(value: string): string | null {
  const normalizedValue = value.replace(',', '.');

  if (normalizedValue === '') {
    return '';
  }

  if (!/^\d+(?:\.\d*)?$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

export function scoreDraftTextSizeClass(value: string): string {
  if (value.length <= 4) {
    return 'text-xl md:text-xl';
  }

  if (value.length <= 6) {
    return 'text-lg md:text-lg';
  }

  if (value.length <= 8) {
    return 'text-base md:text-base';
  }

  return 'text-sm md:text-sm';
}

export function scoreDraftMaxScoreError(
  maxScore: number,
  draft: string | undefined
): string | null {
  if (!draft) {
    return null;
  }

  if (Number(draft) > maxScore) {
    return `Не больше ${maxScore}`;
  }

  return null;
}

export function scoreDraftValidationError(
  attempt: CourseGradeDraftAttempt,
  draft: string | undefined
): string | null {
  if (attempt.grade && draft === '') {
    return 'Введите балл или верните прежнее значение';
  }

  return scoreDraftMaxScoreError(attempt.task.maxScore, draft);
}

export function createQuickGradeUpdate({
  attemptId,
  attempt,
  draftScore,
}: {
  attemptId: string;
  attempt: CourseGradeDraftAttempt | undefined;
  draftScore: string;
}): QuickGradeUpdate | null {
  if (
    !attempt ||
    attempt.reviewLock ||
    !scoreDraftChanged(attempt, draftScore) ||
    scoreDraftValidationError(attempt, draftScore)
  ) {
    return null;
  }

  return {
    attemptId,
    score: Math.max(0, Number(draftScore)),
  };
}
