import type { CourseAttempt } from './course-attempts.types';

export function scoreValue(attempt: CourseAttempt): string {
  return attempt.grade ? String(attempt.grade.score) : '';
}

export function scoreDraftChanged(
  attempt: CourseAttempt,
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
  attempt: CourseAttempt,
  draft: string | undefined
): string | null {
  return scoreDraftMaxScoreError(attempt.task.maxScore, draft);
}
