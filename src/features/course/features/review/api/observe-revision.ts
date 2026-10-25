import {
  hashKey,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/keys';
import { courseAttemptsKeys } from '@/features/course/features/attempts/api/queries';
import type { Review } from '@/features/course/features/review/model/types';
import { taskKeys } from '@/features/course/features/task/api/queries';
import type { LoadReviewResult } from './load-review';
import { reviewKeys } from './keys';

export type ObservedReviewRevision = {
  courseId: CourseId;
  attemptId: AttemptId;
  taskId: string;
  studentId: UserId;
  /** An authoritative published revision: loaded, saved or pushed. */
  revision: Review;
};

/**
 * The one way a Review Revision enters the cache. The Review cache never goes
 * back to an older revision. A newer one cancels the Review reads still on
 * their way, so none of them lands after it, and invalidates every projection
 * that shows the Grade by its owner's key prefix, without reading its data.
 * Revisions are compared only inside the Review cache: this is not an event
 * bus.
 *
 * `readKey` is the Review read that brought the revision: it is not cancelled,
 * and its own result is the returned revision.
 *
 * @returns the revision the cache keeps
 */
export async function observeReviewRevision(
  queryClient: QueryClient,
  { courseId, attemptId, taskId, studentId, revision }: ObservedReviewRevision,
  readKey?: QueryKey
): Promise<Review> {
  const reviews = reviewKeys.attempt(courseId, attemptId);
  const cached = queryClient
    .getQueriesData<LoadReviewResult>({ queryKey: reviews })
    .flatMap(([, data]) => (data === undefined ? [] : [data]));
  const known = newestRevision(cached);
  if (known && known.revision >= revision.revision) {
    return known;
  }

  const readHash = readKey === undefined ? undefined : hashKey(readKey);
  const otherReads = {
    queryKey: reviews,
    predicate: ({ queryHash }: { queryHash: string }) => queryHash !== readHash,
  };
  await queryClient.cancelQueries(otherReads);
  queryClient.setQueriesData<LoadReviewResult>(otherReads, (data) =>
    data === undefined ? data : { status: 'published', review: revision }
  );

  // A revision is news only against a Review the cache already showed: the
  // first load reads the projections at the same moment as they did.
  if (cached.length > 0) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: attemptReviewKeys.student(courseId, taskId, studentId),
      }),
      queryClient.invalidateQueries({
        queryKey: taskKeys.student(courseId, taskId, studentId),
      }),
      queryClient.invalidateQueries({
        queryKey: courseAttemptsKeys.course(courseId),
      }),
    ]);
  }
  return revision;
}

function newestRevision(results: LoadReviewResult[]): Review | null {
  let newest: Review | null = null;
  for (const result of results) {
    if (
      result.status === 'published' &&
      (newest === null || result.review.revision > newest.revision)
    ) {
      newest = result.review;
    }
  }
  return newest;
}
