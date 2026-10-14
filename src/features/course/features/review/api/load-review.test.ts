import { http } from 'msw';
import * as v from 'valibot';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  invalidBody,
  undeclaredStatus,
  unreadableBody,
} from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { reply } from '@/app/testing/reply';
import type { UserId } from '@/features/auth/model/identity';
import { GradeSchema } from '@/features/course/model/grade';
import { loadStudentAttempts } from '@/features/course/features/attempt-review/api/load-student-attempts';
import { loadReview } from './load-review';
import { createReply, saveReview } from './mock';

const { anna, boris, sasha, petya } = accessWorld.users;
const [sashaFirst, sashaSecond, petyaFirst] = reviewWorld.attempts;
const COURSE = accessWorld.courses.algorithms.id;
const REVIEW_URL = `/api/v1/courses/${COURSE}/attempts/${sashaFirst.id}/review`;

function signIn(userId: UserId) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

beforeEach(() => {
  mockBackend.reset('world:review');
  signIn(anna.id);
});

describe('REV-04: Review is loaded by AttemptId with its revision', () => {
  test('a reviewed Attempt has revision 2 with comments of two Teachers and a Student reply', async () => {
    const result = await loadReview(COURSE, sashaFirst.id);

    expect(result).toMatchObject({
      status: 'published',
      review: {
        revision: 2,
        overallFeedbackHtml: expect.stringContaining('пустой список'),
        publishedBy: { id: boris.id, name: 'Борис' },
        comments: [
          {
            author: { id: anna.id, name: 'Анна' },
            filePath: 'src/main.ts',
            side: 'additions',
            lineNumber: 2,
            replies: [{ author: { id: sasha.id, name: 'Саша' } }],
          },
          {
            author: { id: boris.id, name: 'Борис' },
            filePath: 'README.md',
            replies: [],
          },
        ],
      },
    });
    if (result.status !== 'published') throw new Error('Expected a Review');
    expect(result.review.grade).toEqual(v.parse(GradeSchema, 7.5));
  });

  test.each([
    ['Sasha #2', sashaSecond],
    ['Petya #1', petyaFirst],
  ])('%s without a Review is a declared outcome', async (_, attempt) => {
    await expect(loadReview(COURSE, attempt.id)).resolves.toEqual({
      status: 'none',
    });
  });

  test('the selector carries the same Grade with the same revision', async () => {
    const attempts = await loadStudentAttempts(COURSE, '1', sasha.id);
    const review = await loadReview(COURSE, sashaFirst.id);

    expect(attempts.map(({ attemptNumber }) => attemptNumber)).toEqual([2, 1]);
    expect(attempts[0].review).toBeNull();
    expect(attempts[1].review).toEqual({
      revision: 2,
      grade: v.parse(GradeSchema, 7.5),
    });
    expect(review).toMatchObject({ review: attempts[1].review });
  });

  test('a save publishes the next revision, seen alike by Review and selector', async () => {
    await saveReview({
      courseId: COURSE,
      attemptId: sashaFirst.id,
      grade: v.parse(GradeSchema, 8.25),
      overallFeedbackHtml: '<p>Исправлено</p>',
      comments: [
        {
          id: 'comment-anna-main-2',
          filePath: 'src/main.ts',
          side: 'additions',
          lineNumber: 2,
          html: '<p>Сумму можно посчитать через <code>reduce</code>.</p>',
        },
      ],
    });

    const review = await loadReview(COURSE, sashaFirst.id);
    const [, first] = await loadStudentAttempts(COURSE, '1', sasha.id);
    expect(review).toMatchObject({
      status: 'published',
      review: {
        revision: 3,
        grade: v.parse(GradeSchema, 8.25),
        publishedBy: { id: anna.id },
        // The kept comment keeps its author; its reply is not in the save.
        comments: [
          {
            id: 'comment-anna-main-2',
            author: { id: anna.id },
            replies: [{ author: { id: sasha.id } }],
          },
        ],
      },
    });
    expect(first.review).toEqual({
      revision: 3,
      grade: v.parse(GradeSchema, 8.25),
    });
    expect(first.commentCount).toBe(1);
  });

  test.each([
    { user: sasha, name: 'Саша' },
    { user: anna, name: 'Анна' },
  ])(
    'a reply belongs to the signed-in $name after reloading',
    async ({ user, name }) => {
      signIn(user.id);

      const created = await createReply({
        courseId: COURSE,
        attemptId: sashaFirst.id,
        commentId: 'comment-boris-readme-3',
        html: '<p>Добавлю.</p>',
      });

      expect(created.author).toEqual({ id: user.id, name });
      const result = await loadReview(COURSE, sashaFirst.id);
      if (result.status !== 'published') throw new Error('Expected a Review');
      expect(
        result.review.comments
          .flatMap(({ replies }) => replies)
          .find(({ id }) => id === created.id)
      ).toMatchObject({
        author: { id: user.id, name },
        html: '<p>Добавлю.</p>',
      });
    }
  );

  test("another Student's Review is not readable", async () => {
    signIn(petya.id);

    await expect(loadReview(COURSE, sashaFirst.id)).rejects.toMatchObject({
      operation: 'load-review',
      reason: { kind: 'unexpected-http-status', status: 403 },
    });
  });
});

describe('TR-05: load-review statuses', () => {
  test.each([401, 403, 404, 500])('undeclared %i rejects', async (status) => {
    server.use(http.get(REVIEW_URL, undeclaredStatus(status)));

    await expect(loadReview(COURSE, sashaFirst.id)).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: 'load-review',
      reason: { kind: 'unexpected-http-status', status },
    });
  });

  test('an unreadable body rejects', async () => {
    server.use(http.get(REVIEW_URL, unreadableBody));

    await expect(loadReview(COURSE, sashaFirst.id)).rejects.toMatchObject({
      operation: 'load-review',
      kind: 'unreadable-body',
    });
  });

  const review = {
    revision: 1,
    grade: 7.5,
    overallFeedbackHtml: '',
    publishedAt: '2026-05-20T13:05:00.000Z',
    publishedBy: { id: anna.id, name: 'Анна' },
    comments: [],
  };

  test('200 with a valid body resolves the declared outcome', async () => {
    server.use(
      http.get(REVIEW_URL, reply(200, { status: 'published', review }))
    );

    await expect(loadReview(COURSE, sashaFirst.id)).resolves.toMatchObject({
      status: 'published',
      review: { revision: 1, grade: v.parse(GradeSchema, 7.5) },
    });
  });

  test.each([
    ['an unknown status', { status: 'draft' }],
    [
      'a Review without a revision',
      { status: 'published', review: { ...review, revision: undefined } },
    ],
    ['revision 0', { status: 'published', review: { ...review, revision: 0 } }],
    [
      'a too precise Grade',
      { status: 'published', review: { ...review, grade: 7.1255 } },
    ],
    [
      'an author without UserId',
      {
        status: 'published',
        review: { ...review, publishedBy: { id: 'anna', name: 'Анна' } },
      },
    ],
  ])('200 with %s rejects', async (_, body) => {
    server.use(http.get(REVIEW_URL, invalidBody(body)));

    await expect(loadReview(COURSE, sashaFirst.id)).rejects.toMatchObject({
      operation: 'load-review',
      kind: 'invalid-response',
    });
  });
});
