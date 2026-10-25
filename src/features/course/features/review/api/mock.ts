import * as v from 'valibot';
import { http, HttpResponse } from 'msw';
import {
  accessDenial,
  resolveAttemptAccess,
} from '@/app/mock-backend/participant-access';
import {
  mockBackend,
  mockUserName,
  type MockReview,
  type MockReviewComment,
} from '@/app/mock-backend/state';
import { formatFullName } from '@/features/auth/model/full-name';
import type { UserId } from '@/features/auth/model/identity';
import { gradeToNumber, type Grade } from '@/features/course/model/grade';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { upsertMockCourseAttemptGrade } from '@/features/course/features/attempts/api/mock';
import { ReviewRevisionSchema } from '@/features/course/features/review/model/revision';
import type {
  ReviewAuthor,
  ReviewCommentInput,
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
  return { id: user.id, ...mockUserName(user) };
}

function findReview(attemptId: AttemptId): MockReview | undefined {
  return mockBackend.state.reviews.find(
    (review) => review.attemptId === attemptId
  );
}

// Temporary in-process mutations. Their HTTP cutover belongs to REV5 (replies)
// and REV6.2 (publication); until then they write the canonical state directly
// by stable identities, and reads observe it through the HTTP handlers above.

type AttemptAddress = {
  courseId: CourseId;
  attemptId: AttemptId;
};

export type SaveReviewInput = AttemptAddress & {
  grade: Grade;
  overallFeedbackHtml: string;
  comments: ReviewCommentInput[];
};

export type CreateReplyInput = AttemptAddress & {
  commentId: string;
  html: string;
};

export type UpdateReplyInput = AttemptAddress & {
  commentId: string;
  replyId: string;
  html: string;
};

export type DeleteReplyInput = AttemptAddress & {
  commentId: string;
  replyId: string;
};

/** Publishes the next Review Revision; replies stay with their comments. */
export async function saveReview(input: SaveReviewInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 220));

  const { attempt, viewerId } = authorize(input, 'teacher');
  const previous = findReview(attempt.id);
  const previousComments = new Map(
    previous?.revision.comments.map((comment) => [comment.id, comment])
  );
  const now = new Date().toISOString();
  const comments = input.comments.map((comment): MockReviewComment => {
    const saved = previousComments.get(comment.id);
    return {
      ...comment,
      authorId: saved?.authorId ?? viewerId,
      createdAt: saved?.createdAt ?? now,
      updatedAt: saved && saved.html === comment.html ? saved.updatedAt : now,
    };
  });
  const review: MockReview = {
    attemptId: attempt.id,
    revision: {
      number: v.parse(
        ReviewRevisionSchema,
        (previous?.revision.number ?? 0) + 1
      ),
      grade: input.grade,
      overallFeedbackHtml: input.overallFeedbackHtml,
      comments,
      publishedAt: now,
      publishedBy: viewerId,
    },
    replies: previous?.replies ?? [],
  };
  const { reviews, users, unseenAttemptUpdates } = mockBackend.state;
  mockBackend.state.reviews = [
    ...reviews.filter(({ attemptId }) => attemptId !== attempt.id),
    review,
  ];
  // The Student has not seen the new revision yet.
  if (!unseenAttemptUpdates.includes(attempt.id)) {
    mockBackend.state.unseenAttemptUpdates = [
      ...unseenAttemptUpdates,
      attempt.id,
    ];
  }

  // Course Attempts still read their own RAM mock until ATT1 removes this.
  const student = users.find(({ id }) => id === attempt.studentId);
  if (student) {
    upsertMockCourseAttemptGrade({
      courseId: attempt.courseId,
      taskId: attempt.taskId,
      studentUsername: student.username,
      attemptNumber: attempt.attemptNumber,
      grade: input.grade,
      gradedAt: now,
      gradedBy: formatFullName(author(viewerId)),
    });
  }
}

export async function createReply(
  input: CreateReplyInput
): Promise<ReviewReply> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const { review, viewerId } = findCommentReview(input);
  const now = new Date().toISOString();
  const reply = {
    id: `reply-${input.commentId}-${Date.now()}`,
    commentId: input.commentId,
    authorId: viewerId,
    html: input.html,
    createdAt: now,
    updatedAt: now,
  };
  review.replies = [...review.replies, reply];
  return toReply(reply);
}

export async function updateReply(
  input: UpdateReplyInput
): Promise<ReviewReply> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const { review, viewerId } = findCommentReview(input);
  const reply = findOwnReply(review, input, viewerId);
  reply.html = input.html;
  reply.updatedAt = new Date().toISOString();
  return toReply(reply);
}

export async function deleteReply(input: DeleteReplyInput): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const { review, viewerId } = findCommentReview(input);
  const reply = findOwnReply(review, input, viewerId);
  review.replies = review.replies.filter(({ id }) => id !== reply.id);
}

function authorize(address: AttemptAddress, role?: 'teacher') {
  const access = resolveAttemptAccess(address.courseId, address.attemptId);
  const viewerId = mockBackend.state.session?.userId;
  if (access.status !== 'found' || !viewerId) {
    throw new Error(`The Attempt is ${access.status} for the signed-in User`);
  }
  const isTeacher = mockBackend.state.memberships.some(
    (membership) =>
      membership.courseId === address.courseId &&
      membership.userId === viewerId &&
      membership.role === 'teacher'
  );
  if (role === 'teacher' && !isTeacher) {
    throw new Error('Only a Course Teacher publishes a Review');
  }
  return { attempt: access.attempt, viewerId };
}

function findCommentReview(input: AttemptAddress & { commentId: string }) {
  const { attempt, viewerId } = authorize(input);
  const review = findReview(attempt.id);
  if (!review?.revision.comments.some(({ id }) => id === input.commentId)) {
    throw new Error(`Comment ${input.commentId} is not in the Review`);
  }
  return { review, viewerId };
}

function findOwnReply(
  review: MockReview,
  { commentId, replyId }: { commentId: string; replyId: string },
  viewerId: UserId
) {
  const reply = review.replies.find(
    (candidate) => candidate.id === replyId && candidate.commentId === commentId
  );
  if (!reply || reply.authorId !== viewerId) {
    throw new Error(`Reply ${replyId} is not the signed-in User's`);
  }
  return reply;
}
