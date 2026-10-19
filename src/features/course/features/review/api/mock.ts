import { http, HttpResponse } from 'msw';
import {
  accessDenial,
  resolveAttemptAccess,
} from '@/app/mock-backend/participant-access';
import {
  mockBackend,
  mockUserName,
  type MockReview,
} from '@/app/mock-backend/state';
import type { UserId } from '@/features/auth/model/identity';
import { gradeToNumber } from '@/features/course/model/grade';
import type { AttemptId } from '@/features/course/model/identity';
import type {
  ReviewAuthor,
  ReviewReply,
} from '@/features/course/features/review/model/types';

// Working Review wire contract pending backend confirmation #113.
export const reviewHandlers = [
  http.get(
    '/api/v1/courses/:courseId/attempts/:attemptId/review',
    ({ params }) => {
      const access = resolveAttemptAccess(
        String(params.courseId),
        String(params.attemptId)
      );
      if (access.status !== 'found') return accessDenial(access.status);
      const review = findReview(access.attempt.id);
      if (!review) return HttpResponse.json({ status: 'none' });
      return HttpResponse.json({
        status: 'published',
        review: toReviewDto(review),
      });
    }
  ),
];

function toReviewDto({ revision, replies }: MockReview) {
  return {
    revision: revision.number,
    grade: gradeToNumber(revision.grade),
    overallFeedbackHtml: revision.overallFeedbackHtml,
    publishedAt: revision.publishedAt,
    publishedBy: author(revision.publishedBy),
    comments: revision.comments.map(({ authorId, ...comment }) => ({
      ...comment,
      author: author(authorId),
      replies: replies
        .filter(({ commentId }) => commentId === comment.id)
        .map(toReply),
    })),
  };
}

function toReply({
  id,
  authorId,
  html,
  createdAt,
  updatedAt,
}: MockReview['replies'][number]): ReviewReply {
  return { id, author: author(authorId), html, createdAt, updatedAt };
}

function author(userId: UserId): ReviewAuthor {
  const user = mockBackend.state.users.find(({ id }) => id === userId);
  if (!user) throw new Error(`The mock backend has no User ${userId}`);
  return { id: user.id, name: mockUserName(user) };
}

function findReview(attemptId: AttemptId): MockReview | undefined {
  return mockBackend.state.reviews.find(
    (review) => review.attemptId === attemptId
  );
}
