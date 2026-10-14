import {
  formatGrade,
  parseGradeInput,
  type Grade,
  type GradeInputError,
} from '@/features/course/model/grade';
import type { CourseAttempt } from './types';

export type QuickGradeAttempt = {
  task: Pick<CourseAttempt['task'], 'maxGrade'>;
} & Pick<CourseAttempt, 'grade' | 'reviewLock'>;

export type QuickGradeUpdate = {
  attemptId: string;
  grade: Grade;
};

/** The Grade field's text before the Teacher edits it. */
export function savedGradeText(attempt: QuickGradeAttempt): string {
  return attempt.grade ? formatGrade(attempt.grade.value) : '';
}

export function isQuickGradeDraftChanged(
  attempt: QuickGradeAttempt,
  draft: string | undefined
): boolean {
  return (draft ?? '') !== savedGradeText(attempt);
}

/** An untouched field is never an error; an existing Grade cannot be erased. */
export function getQuickGradeDraftError(
  attempt: QuickGradeAttempt,
  draft: string | undefined
): GradeInputError | null {
  if (draft === undefined || !isQuickGradeDraftChanged(attempt, draft)) {
    return null;
  }

  const result = parseGradeInput(draft, attempt.task.maxGrade);

  return result.status === 'invalid' ? result.error : null;
}

export function createQuickGradeUpdate({
  attemptId,
  attempt,
  draft,
}: {
  attemptId: string;
  attempt: QuickGradeAttempt | undefined;
  draft: string;
}): QuickGradeUpdate | null {
  if (
    !attempt ||
    attempt.reviewLock ||
    !isQuickGradeDraftChanged(attempt, draft)
  ) {
    return null;
  }

  const result = parseGradeInput(draft, attempt.task.maxGrade);

  return result.status === 'valid' ? { attemptId, grade: result.grade } : null;
}
