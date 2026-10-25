import { courseKeys } from '@/features/course/api/queries';
import type { UserId } from '@/features/auth/model/identity';
import type { AttemptId, CourseId } from '@/features/course/model/identity';

/**
 * ['course', courseId, 'attempt-review']
 * ├── 'attempt', attemptId
 * │   ├── 'summary', viewerId
 * │   └── 'material', viewerId
 * └── 'student', taskId, studentId
 *     └── 'attempts', viewerId
 *
 * `viewerId` comes last, so a prefix without it invalidates every viewer.
 */
export const attemptReviewKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'attempt-review'] as const,
  attempt: (courseId: CourseId, attemptId: AttemptId) =>
    [...attemptReviewKeys.course(courseId), 'attempt', attemptId] as const,
  summary: (viewerId: UserId, courseId: CourseId, attemptId: AttemptId) =>
    [
      ...attemptReviewKeys.attempt(courseId, attemptId),
      'summary',
      viewerId,
    ] as const,
  material: (viewerId: UserId, courseId: CourseId, attemptId: AttemptId) =>
    [
      ...attemptReviewKeys.attempt(courseId, attemptId),
      'material',
      viewerId,
    ] as const,
  student: (courseId: CourseId, taskId: string, studentId: UserId) =>
    [
      ...attemptReviewKeys.course(courseId),
      'student',
      taskId,
      studentId,
    ] as const,
  studentAttempts: (
    viewerId: UserId,
    courseId: CourseId,
    taskId: string,
    studentId: UserId
  ) =>
    [
      ...attemptReviewKeys.student(courseId, taskId, studentId),
      'attempts',
      viewerId,
    ] as const,
};
