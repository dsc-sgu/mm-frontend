import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReviewCommentInput } from '@/features/course/features/review/model/types';
import type { Grade } from '@/features/course/model/grade';
import { reviewKeys } from './keys';
import { loadReview, type LoadReviewResult } from './load-review';
import { createReply, deleteReply, saveReview, updateReply } from './mock';
import { observeReviewRevision } from './observe-revision';
import { reviewOptions, type ReviewedAttempt } from './queries';

// Temporary mutations over the canonical mock backend state, not a reference
// for new operations (their failures are plain Errors); REV5 and REV6.2
// replace them with HTTP operations.

export type ReviewEdits = {
  grade: Grade;
  overallFeedbackHtml: string;
  comments: ReviewCommentInput[];
};

/**
 * Saves the next Review Revision and resolves with the published Review, or
 * with the denial that replaced it.
 */
export function useSaveReviewMutation(attempt: ReviewedAttempt) {
  const queryClient = useQueryClient();
  const { courseId, taskId, studentId, attemptId } = attempt;

  return useMutation({
    mutationFn: async (edits: ReviewEdits): Promise<LoadReviewResult> => {
      await saveReview({ courseId, attemptId, ...edits });
      // The save answers with nothing, so the published revision is reread.
      const result = await loadReview(courseId, attemptId);
      if (result.status === 'published') {
        const review = await observeReviewRevision(queryClient, {
          courseId,
          attemptId,
          taskId,
          studentId,
          revision: result.review,
        });
        return { status: 'published', review };
      }
      // A denial replaces the cached Review, and with it the page.
      const { queryKey } = reviewOptions(attempt);
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData(queryKey, result);
      return result;
    },
  });
}

export function useReplyMutations(attempt: ReviewedAttempt) {
  const queryClient = useQueryClient();
  const { courseId, attemptId } = attempt;
  const onSuccess = () =>
    queryClient.invalidateQueries({
      queryKey: reviewKeys.attempt(courseId, attemptId),
    });

  return {
    create: useMutation({
      mutationFn: (input: { commentId: string; html: string }) =>
        createReply({ courseId, attemptId, ...input }),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: (input: {
        commentId: string;
        replyId: string;
        html: string;
      }) => updateReply({ courseId, attemptId, ...input }),
      onSuccess,
    }),
    delete: useMutation({
      mutationFn: (input: { commentId: string; replyId: string }) =>
        deleteReply({ courseId, attemptId, ...input }),
      onSuccess,
    }),
  };
}
