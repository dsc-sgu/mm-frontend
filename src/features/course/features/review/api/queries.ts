import { queryOptions } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { reviewKeys } from './keys';
import { loadReview } from './load-review';
import { observeReviewRevision } from './observe-revision';

export type ReviewedAttempt = {
  viewerId: UserId;
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptId: AttemptId;
};

export function reviewOptions({
  viewerId,
  courseId,
  taskId,
  studentId,
  attemptId,
}: ReviewedAttempt) {
  return queryOptions({
    queryKey: reviewKeys.detail(viewerId, courseId, attemptId),
    queryFn: async ({ client, queryKey, signal }) => {
      const result = await loadReview(courseId, attemptId, signal);
      if (result.status !== 'published') {
        return result;
      }
      const review = await observeReviewRevision(
        client,
        { courseId, attemptId, taskId, studentId, revision: result.review },
        queryKey
      );
      return { status: 'published' as const, review };
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
