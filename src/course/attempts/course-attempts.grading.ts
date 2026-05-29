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
