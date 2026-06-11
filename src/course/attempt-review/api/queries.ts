import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { COURSE_ATTEMPTS_QUERY_KEY } from '@/course/attempts/api/queries';
import {
  createAttemptReviewCommentReply,
  deleteAttemptReviewCommentReply,
  fetchAttemptReview,
  saveAttemptReview,
  updateAttemptReviewCommentReply,
} from './mock';
import type {
  AttemptReviewRouteParams,
  CreateAttemptReviewCommentReplyInput,
  DeleteAttemptReviewCommentReplyInput,
  SaveAttemptReviewInput,
  UpdateAttemptReviewCommentReplyInput,
} from '@/course/attempt-review/model/types';

export const ATTEMPT_REVIEW_QUERY_KEY = 'attempt-review';

export function attemptReviewQueryOptions(params: AttemptReviewRouteParams) {
  return queryOptions({
    queryKey: getAttemptReviewQueryKey(params),
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
        invalidateAttemptReviewQuery(queryClient, variables),
        queryClient.invalidateQueries({
          queryKey: [COURSE_ATTEMPTS_QUERY_KEY, variables.courseSlug],
        }),
      ]);
    },
  });
}

export function useCreateAttemptReviewCommentReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAttemptReviewCommentReplyInput) =>
      createAttemptReviewCommentReply(input),
    onSuccess: async (_data, variables) => {
      await invalidateAttemptReviewQuery(queryClient, variables);
    },
  });
}

export function useUpdateAttemptReviewCommentReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAttemptReviewCommentReplyInput) =>
      updateAttemptReviewCommentReply(input),
    onSuccess: async (_data, variables) => {
      await invalidateAttemptReviewQuery(queryClient, variables);
    },
  });
}

export function useDeleteAttemptReviewCommentReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteAttemptReviewCommentReplyInput) =>
      deleteAttemptReviewCommentReply(input),
    onSuccess: async (_data, variables) => {
      await invalidateAttemptReviewQuery(queryClient, variables);
    },
  });
}

function getAttemptReviewQueryKey(params: AttemptReviewRouteParams) {
  return [
    ATTEMPT_REVIEW_QUERY_KEY,
    params.courseSlug,
    params.taskId,
    params.studentUsername,
    params.attemptId,
  ];
}

function invalidateAttemptReviewQuery(
  queryClient: QueryClient,
  params: AttemptReviewRouteParams
) {
  return queryClient.invalidateQueries({
    queryKey: getAttemptReviewQueryKey(params),
  });
}
