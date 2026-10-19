import { queryOptions } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import { courseKeys } from '@/features/course/api/queries';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { loadReview } from './load-review';

export const reviewKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'review'] as const,
  attempt: (courseId: CourseId, attemptId: AttemptId) =>
    [...reviewKeys.course(courseId), attemptId] as const,
  detail: (viewerId: UserId, courseId: CourseId, attemptId: AttemptId) =>
    [...reviewKeys.attempt(courseId, attemptId), viewerId] as const,
};

export function reviewOptions(
  viewerId: UserId,
  courseId: CourseId,
  attemptId: AttemptId
) {
  return queryOptions({
    queryKey: reviewKeys.detail(viewerId, courseId, attemptId),
    queryFn: ({ signal }) => loadReview(courseId, attemptId, signal),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
