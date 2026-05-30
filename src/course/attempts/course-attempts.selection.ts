import type { CourseAttempt } from './course-attempts.types';

export function isAttemptSelectable(attempt: CourseAttempt): boolean {
  return !attempt.reviewLock;
}

export function selectedLockedAttemptsReason(
  attempts: CourseAttempt[]
): string | null {
  const locked = attempts.filter((attempt) => attempt.reviewLock);
  if (locked.length === 0) {
    return null;
  }

  return `Уже взяты на проверку: ${locked
    .map((attempt) => `${attempt.task.title} — ${attempt.student.fullName}`)
    .join('; ')}`;
}
