import type { CourseAttempt } from './course-attempts.types';

export function isAttemptSelectable(attempt: CourseAttempt): boolean {
  return !attempt.reviewLock;
}
