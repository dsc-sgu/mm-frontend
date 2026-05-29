import type { CourseAttempt } from './course-attempts.types';

export function selectedBulkDisableReason(
  attempts: CourseAttempt[]
): string | null {
  const locked = attempts.filter((attempt) => attempt.reviewLock);
  if (locked.length > 0) {
    return `Уже взяты на проверку: ${locked
      .map((attempt) => `${attempt.task.title} — ${attempt.student.fullName}`)
      .join('; ')}`;
  }

  const maxScores = new Set(attempts.map((attempt) => attempt.task.maxScore));
  if (maxScores.size > 1) {
    return 'Нельзя оценивать вместе попытки с разным максимальным баллом.';
  }

  return null;
}
