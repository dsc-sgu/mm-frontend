import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/queries';
import { courseAttemptsKeys } from '@/features/course/features/attempts/api/queries';
import type {
  ReviewCommentInput,
  ReviewResult,
} from '@/features/course/features/review/model/types';
import type { Grade } from '@/features/course/model/grade';
import { loadReview } from './load-review';
import { createReply, deleteReply, saveReview, updateReply } from './mock';
import { reviewKeys } from './queries';

// Temporary mutations over the canonical mock backend state; REV5 and REV6.2
// replace them with HTTP operations.

export type ReviewedAttempt = {
  viewerId: UserId;
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptId: AttemptId;
};

export type ReviewEdits = {
  grade: Grade;
  overallFeedbackHtml: string;
  comments: ReviewCommentInput[];
};

/** Saves the next Review Revision and resolves with the published Review. */
export function useSaveReviewMutation(attempt: ReviewedAttempt) {
  const queryClient = useQueryClient();
  const { viewerId, courseId, taskId, studentId, attemptId } = attempt;

  return useMutation({
    mutationFn: async (edits: ReviewEdits): Promise<ReviewResult> => {
      await saveReview({ courseId, attemptId, ...edits });
      return loadReview(courseId, attemptId);
    },
    onSuccess: async (review) => {
      queryClient.setQueryData(
        reviewKeys.detail(viewerId, courseId, attemptId),
        review
      );
      // The Grade, its revision and the comment count show in both lists.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: attemptReviewKeys.student(courseId, taskId, studentId),
        }),
        queryClient.invalidateQueries({
          queryKey: courseAttemptsKeys.course(courseId),
        }),
      ]);
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
