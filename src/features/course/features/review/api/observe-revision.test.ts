import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { http } from 'msw';
import * as v from 'valibot';
import { beforeEach, describe, expect, test } from 'vitest';
import { holdResponse } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { reply } from '@/app/testing/reply';
import { GradeSchema, gradeToNumber } from '@/features/course/model/grade';
import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/keys';
import { courseAttemptsKeys } from '@/features/course/features/attempts/api/queries';
import { ReviewRevisionSchema } from '@/features/course/features/review/model/revision';
import type { Review } from '@/features/course/features/review/model/types';
import { taskKeys } from '@/features/course/features/task/api/queries';
import { observeReviewRevision } from './observe-revision';
import { reviewOptions, type ReviewedAttempt } from './queries';

const { anna } = accessWorld.users;
const [sashaFirst] = reviewWorld.attempts;
const COURSE_ID = accessWorld.courses.algorithms.id;
const REVIEW_URL = `/api/v1/courses/${COURSE_ID}/attempts/${sashaFirst.id}/review`;
const ATTEMPT: ReviewedAttempt = {
  viewerId: anna.id,
  courseId: COURSE_ID,
  taskId: sashaFirst.taskId,
  studentId: sashaFirst.studentId,
  attemptId: sashaFirst.id,
};
const ADDRESS = {
  courseId: COURSE_ID,
  taskId: sashaFirst.taskId,
  studentId: sashaFirst.studentId,
  attemptId: sashaFirst.id,
};

// The projections that show the Grade, each under its owner's key factory.
const PROJECTIONS: [name: string, queryKey: QueryKey][] = [
  [
    'selector',
    attemptReviewKeys.studentAttempts(
      anna.id,
      COURSE_ID,
      sashaFirst.taskId,
      sashaFirst.studentId
    ),
  ],
  [
    'Task history',
    taskKeys.attemptHistory(
      sashaFirst.studentId,
      COURSE_ID,
      sashaFirst.taskId,
      sashaFirst.studentId
    ),
  ],
  [
    'Course Attempts',
    courseAttemptsKeys.list(COURSE_ID, {
      tasks: [],
      students: [],
      graded: 'any',
    }),
  ],
];

let queryClient: QueryClient;

async function loadedReview(): Promise<Review> {
  const result = await queryClient.query(reviewOptions(ATTEMPT));
  if (result.status !== 'published') throw new Error('Expected a Review');
  return result.review;
}

function cachedRevision() {
  const state = queryClient.getQueryState(reviewOptions(ATTEMPT).queryKey);
  // A failed read would keep the old revision for the wrong reason.
  expect(state?.error).toBeNull();
  return state?.data?.status === 'published'
    ? state.data.review.revision
    : null;
}

function withRevision(review: Review, revision: number): Review {
  return {
    ...review,
    revision: v.parse(ReviewRevisionSchema, revision),
    grade: v.parse(GradeSchema, revision),
  };
}

/** Answers every Review read with this revision, as a lagging replica would. */
function serveRevision(review: Review) {
  server.use(
    http.get(
      REVIEW_URL,
      reply(200, {
        status: 'published',
        review: { ...review, grade: gradeToNumber(review.grade) },
      })
    )
  );
}

/** Projections hold data that observing must not need: a marker. */
function seedProjections() {
  for (const [name, queryKey] of PROJECTIONS) {
    queryClient.setQueryData(queryKey, { marker: name });
  }
}

beforeEach(() => {
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: anna.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe('REV-27: observeReviewRevision', () => {
  test('a late revision 2 after 3 does not replace 3, and the read on its way is cancelled', async () => {
    const second = await loadedReview();
    const third = withRevision(second, 3);
    // The refetch started before revision 3 is published brings revision 2.
    serveRevision(second);
    const held = holdResponse();
    server.use(http.get(REVIEW_URL, held.resolver));
    const refetch = queryClient.refetchQueries({
      queryKey: reviewOptions(ATTEMPT).queryKey,
    });
    await held.requested;

    await observeReviewRevision(queryClient, { ...ADDRESS, revision: third });
    expect(
      queryClient.getQueryState(reviewOptions(ATTEMPT).queryKey)?.fetchStatus
    ).toBe('idle');
    held.release();
    await refetch;

    expect(cachedRevision()).toBe(3);
  });

  test('observing an older revision keeps the newer one', async () => {
    const second = await loadedReview();
    await observeReviewRevision(queryClient, {
      ...ADDRESS,
      revision: withRevision(second, 3),
    });

    await expect(
      observeReviewRevision(queryClient, { ...ADDRESS, revision: second })
    ).resolves.toMatchObject({ revision: 3 });
    expect(cachedRevision()).toBe(3);
  });

  test('a read that brings an older revision keeps the newer one', async () => {
    const second = await loadedReview();
    await observeReviewRevision(queryClient, {
      ...ADDRESS,
      revision: withRevision(second, 3),
    });
    serveRevision(second);

    await queryClient.refetchQueries({
      queryKey: reviewOptions(ATTEMPT).queryKey,
    });

    expect(cachedRevision()).toBe(3);
  });

  test.each(PROJECTIONS)(
    'a newer revision invalidates the %s by prefix without touching its data',
    async (name, queryKey) => {
      const second = await loadedReview();
      seedProjections();

      await observeReviewRevision(queryClient, {
        ...ADDRESS,
        revision: withRevision(second, 3),
      });

      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryData(queryKey)).toEqual({ marker: name });
    }
  );

  test('a revision the cache already has invalidates nothing', async () => {
    const second = await loadedReview();
    seedProjections();

    await observeReviewRevision(queryClient, { ...ADDRESS, revision: second });
    await queryClient.refetchQueries({
      queryKey: reviewOptions(ATTEMPT).queryKey,
    });

    for (const [, queryKey] of PROJECTIONS) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(false);
    }
  });

  test('the first load of a Review invalidates nothing', async () => {
    seedProjections();

    await loadedReview();

    for (const [, queryKey] of PROJECTIONS) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(false);
    }
  });

  test('a refetch that brings a newer revision invalidates the projections', async () => {
    const second = await loadedReview();
    seedProjections();
    serveRevision(withRevision(second, 3));

    await queryClient.refetchQueries({
      queryKey: reviewOptions(ATTEMPT).queryKey,
    });

    expect(cachedRevision()).toBe(3);
    for (const [, queryKey] of PROJECTIONS) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
    }
  });
});
