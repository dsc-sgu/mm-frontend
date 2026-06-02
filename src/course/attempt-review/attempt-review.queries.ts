import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { COURSE_ATTEMPTS_QUERY_KEY } from '@/course/attempts/course-attempts.queries';
import {
  fetchAttemptReview,
  saveAttemptReview,
} from './attempt-review.api.mock';
import type {
  AttemptReviewRouteParams,
  SaveAttemptReviewInput,
} from './attempt-review.types';

export const ATTEMPT_REVIEW_QUERY_KEY = 'attempt-review';

export function attemptReviewQueryOptions(params: AttemptReviewRouteParams) {
  return queryOptions({
    queryKey: [
      ATTEMPT_REVIEW_QUERY_KEY,
      params.courseSlug,
      params.taskId,
      params.studentUsername,
      params.attemptId,
    ],
    queryFn: () => fetchAttemptReview(params),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAttemptReviewQuery(params: AttemptReviewRouteParams) {
  return useQuery(attemptReviewQueryOptions(params));
}

export function useSaveAttemptReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveAttemptReviewInput) => saveAttemptReview(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            ATTEMPT_REVIEW_QUERY_KEY,
            variables.courseSlug,
            variables.taskId,
            variables.studentUsername,
            variables.attemptId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [COURSE_ATTEMPTS_QUERY_KEY, variables.courseSlug],
        }),
      ]);
    },
  });
}
