import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { courseKeys } from '@/features/course/api/queries';
import { courseAttemptsKeys } from '@/features/course/features/attempts/api/queries';
import type { UserId } from '@/features/auth/model/identity';
import type { CourseId } from '@/features/course/model/identity';
import {
  createAttemptReviewCommentReply,
  deleteAttemptReviewCommentReply,
  fetchAttemptReview,
  saveAttemptReview,
  updateAttemptReviewCommentReply,
} from './mock';
import type {
  AttemptReviewIdentity,
  CreateAttemptReviewCommentReplyInput,
  DeleteAttemptReviewCommentReplyInput,
  SaveAttemptReviewInput,
  UpdateAttemptReviewCommentReplyInput,
} from '@/features/course/features/attempt-review/model/types';

export const attemptReviewKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'attempt-review'] as const,
  attempt: (params: AttemptReviewIdentity) =>
    [
      ...attemptReviewKeys.course(params.courseId),
      params.studentId,
      params.attemptId,
    ] as const,
  detail: (viewerId: UserId, params: AttemptReviewIdentity) =>
    [...attemptReviewKeys.attempt(params), viewerId] as const,
};

export function attemptReviewQueryOptions(
  viewerId: UserId,
  params: AttemptReviewIdentity
) {
  return queryOptions({
    queryKey: attemptReviewKeys.detail(viewerId, params),
    queryFn: () => fetchAttemptReview(params),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAttemptReviewQuery(
  viewerId: UserId,
  params: AttemptReviewIdentity
) {
  return useQuery(attemptReviewQueryOptions(viewerId, params));
}

export function useSaveAttemptReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveAttemptReviewInput) => saveAttemptReview(input),
    onSuccess: async (_data, variables) => {
      // A saved grade changes the Course's attempt list projections.
      await Promise.all([
        invalidateAttemptReviewQuery(queryClient, variables),
        queryClient.invalidateQueries({
          queryKey: courseAttemptsKeys.course(variables.courseId),
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

function invalidateAttemptReviewQuery(
  queryClient: QueryClient,
  params: AttemptReviewIdentity
) {
  return queryClient.invalidateQueries({
    queryKey: attemptReviewKeys.attempt(params),
  });
}
