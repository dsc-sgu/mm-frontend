import type { UserId } from '@/features/auth/model/identity';
import { courseKeys } from '@/features/course/api/queries';
import type { AttemptId, CourseId } from '@/features/course/model/identity';

export const reviewKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'review'] as const,
  attempt: (courseId: CourseId, attemptId: AttemptId) =>
    [...reviewKeys.course(courseId), attemptId] as const,
  detail: (viewerId: UserId, courseId: CourseId, attemptId: AttemptId) =>
    [...reviewKeys.attempt(courseId, attemptId), viewerId] as const,
};
