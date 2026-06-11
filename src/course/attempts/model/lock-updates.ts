import type { CourseAttempt, CourseAttemptReviewLock } from './types';

export type CourseAttemptReviewLockUpdate = {
  attemptId: string;
  reviewLock: CourseAttemptReviewLock | null;
};

export function applyReviewLockUpdatesToAttempts(
  attempts: CourseAttempt[],
  updates: CourseAttemptReviewLockUpdate[]
): CourseAttempt[] {
  if (updates.length === 0) {
    return attempts;
  }

  const updateByAttemptId = new Map(
    updates.map((update) => [update.attemptId, update.reviewLock])
  );

  return attempts.map((attempt) => {
    if (!updateByAttemptId.has(attempt.id)) {
      return attempt;
    }

    return {
      ...attempt,
      reviewLock: updateByAttemptId.get(attempt.id) ?? null,
    };
  });
}
