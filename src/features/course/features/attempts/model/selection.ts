import type { CourseAttempt } from './types';

export function isAttemptSelectable(attempt: CourseAttempt): boolean {
  return !attempt.reviewLock;
}
