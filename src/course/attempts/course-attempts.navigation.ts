import type { CourseAttempt } from './course-attempts.types';

export function getAttemptDiffHref(
  courseSlug: string,
  attempt: CourseAttempt
): string {
  return `/courses/${courseSlug}/tasks/${attempt.task.id}/attempts/${attempt.student.username}/${attempt.attemptNumber}`;
}

export function getAttemptReviewHref(
  courseSlug: string,
  attempt: CourseAttempt
): string {
  return `${getAttemptDiffHref(courseSlug, attempt)}/review`;
}
