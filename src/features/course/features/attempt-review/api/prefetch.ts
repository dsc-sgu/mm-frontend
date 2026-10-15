import type { QueryClient } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import { reviewOptions } from '@/features/course/features/review/api/queries';
import type { AttemptReviewIdentity } from '@/features/course/features/attempt-review/model/types';
import {
  attemptMaterialOptions,
  attemptSummaryOptions,
  studentAttemptsOptions,
} from './queries';

export type AttemptPageInput = { viewerId: UserId } & AttemptReviewIdentity;

/** Every read of the Attempt page; the page and its prefetch share it. */
export function attemptPageQueries({
  viewerId,
  courseId,
  taskId,
  studentId,
  attemptId,
}: AttemptPageInput) {
  return {
    summary: attemptSummaryOptions(viewerId, courseId, attemptId),
    review: reviewOptions(viewerId, courseId, attemptId),
    material: attemptMaterialOptions(viewerId, courseId, attemptId),
    attempts: studentAttemptsOptions(viewerId, courseId, taskId, studentId),
  };
}

/**
 * Starts every read of the Attempt page from the route loader, so the reads
 * load alongside the page's lazy chunk instead of after it mounts. Not awaited
 * by the loader: the page shows its own loading state, and the router never
 * keeps the previous Attempt on screen while the next one loads.
 */
export function prefetchAttemptPage(
  queryClient: QueryClient,
  input: AttemptPageInput
) {
  const queries = attemptPageQueries(input);
  // A failure stays in the query's state, where the page renders it.
  const ignore = () => undefined;
  queryClient.query(queries.summary).catch(ignore);
  queryClient.query(queries.review).catch(ignore);
  queryClient.query(queries.material).catch(ignore);
  queryClient.query(queries.attempts).catch(ignore);
}
