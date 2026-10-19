import { http } from 'msw';
import * as v from 'valibot';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  invalidBody,
  undeclaredStatus,
  unreadableBody,
} from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { accessDenial } from '@/app/mock-backend/participant-access';
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
const COURSE_ID = accessWorld.courses.algorithms.id;
const REVIEW_URL = `/api/v1/courses/${COURSE_ID}/attempts/${sashaFirst.id}/review`;

function signIn(userId: UserId) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

async function studentAttempts(studentId: UserId) {
  const result = await loadStudentAttempts(COURSE_ID, '1', studentId);
  if (result.status !== 'found') throw new Error('Expected the Attempts');
  return result.attempts;
}

beforeEach(() => {
  mockBackend.reset('world:review');
  signIn(anna.id);
});

describe('REV-04: Review is loaded by AttemptId with its revision', () => {
  test('a reviewed Attempt has revision 2 with comments of two Teachers and a Student reply', async () => {
    const result = await loadReview(COURSE_ID, sashaFirst.id);

    expect(result).toMatchObject({
      status: 'published',
      review: {
        revision: 2,
        overallFeedbackHtml: expect.stringContaining('пустой список'),
        // world:review Users have only a given name, so no patronymic.
        publishedBy: { id: boris.id, lastName: '', firstName: 'Борис' },
        comments: [
          {
            author: { id: anna.id, lastName: '', firstName: 'Анна' },
            filePath: 'src/main.ts',
            side: 'additions',
            lineNumber: 2,
            replies: [
              { author: { id: sasha.id, lastName: '', firstName: 'Саша' } },
            ],
          },
          {
            author: { id: boris.id, lastName: '', firstName: 'Борис' },
            filePath: 'README.md',
            replies: [],
          },
        ],
      },
    });
    if (result.status !== 'published') throw new Error('Expected a Review');
    expect(result.review.grade).toEqual(v.parse(GradeSchema, 7.5));
  });

  // An unreviewed Attempt answers 200 with `none`, not 404: 404 already means
  // the Attempt itself is gone or hidden (a ResourceDenial). Sharing the status
  // would show a missing Attempt as "not reviewed yet". Working contract
  // pending backend confirmation #113.
  test.each([
    ['Sasha #2', sashaSecond],
    ['Petya #1', petyaFirst],
  ])('%s without a Review is a declared outcome', async (_, attempt) => {
    await expect(loadReview(COURSE_ID, attempt.id)).resolves.toEqual({
      status: 'none',
    });
  });

  test('the selector carries the same Grade with the same revision', async () => {
    const attempts = await studentAttempts(sasha.id);
    const review = await loadReview(COURSE_ID, sashaFirst.id);

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
      courseId: COURSE_ID,
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

    const review = await loadReview(COURSE_ID, sashaFirst.id);
    const [, first] = await studentAttempts(sasha.id);
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

  test.each([sasha, anna])(
    'a reply belongs to the signed-in $username after reloading',
    async ({ id, lastName, firstName }) => {
      const author = { id, lastName, firstName };
      signIn(id);

      const created = await createReply({
        courseId: COURSE_ID,
        attemptId: sashaFirst.id,
        commentId: 'comment-boris-readme-3',
        html: '<p>Добавлю.</p>',
      });

      expect(created.author).toEqual(author);
      const result = await loadReview(COURSE_ID, sashaFirst.id);
      if (result.status !== 'published') throw new Error('Expected a Review');
      expect(
        result.review.comments
          .flatMap(({ replies }) => replies)
          .find(({ id }) => id === created.id)
      ).toMatchObject({
        author,
        html: '<p>Добавлю.</p>',
      });
    }
  );

  test("another Student's Review is a declared denial", async () => {
    signIn(petya.id);

    await expect(loadReview(COURSE_ID, sashaFirst.id)).resolves.toEqual({
      status: 'forbidden',
    });
  });
});

describe('TR-05: load-review statuses', () => {
  test.each([401, 500])('undeclared %i rejects', async (status) => {
    server.use(http.get(REVIEW_URL, undeclaredStatus(status)));

    await expect(loadReview(COURSE_ID, sashaFirst.id)).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: 'load-review',
      reason: { kind: 'unexpected-http-status', status },
    });
  });

  test.each(['forbidden', 'not-found'] as const)(
    'a body-less %s denial resolves as declared',
    async (status) => {
      server.use(http.get(REVIEW_URL, () => accessDenial(status)));

      await expect(loadReview(COURSE_ID, sashaFirst.id)).resolves.toEqual({
        status,
      });
    }
  );

  test('an unreadable body rejects', async () => {
    server.use(http.get(REVIEW_URL, unreadableBody));

    await expect(loadReview(COURSE_ID, sashaFirst.id)).rejects.toMatchObject({
      operation: 'load-review',
      kind: 'unreadable-body',
    });
  });

  const review = {
    revision: 1,
    grade: 7.5,
    overallFeedbackHtml: '',
    publishedAt: '2026-05-20T13:05:00.000Z',
    publishedBy: {
      id: anna.id,
      lastName: 'Смирнова',
      firstName: 'Анна',
      patronymic: 'Сергеевна',
    },
    comments: [],
  };

  test('200 with a valid body resolves the declared outcome', async () => {
    server.use(
      http.get(REVIEW_URL, reply(200, { status: 'published', review }))
    );

    await expect(loadReview(COURSE_ID, sashaFirst.id)).resolves.toMatchObject({
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
        review: {
          ...review,
          publishedBy: { ...review.publishedBy, id: 'anna' },
        },
      },
    ],
  ])('200 with %s rejects', async (_, body) => {
    server.use(http.get(REVIEW_URL, invalidBody(body)));

    await expect(loadReview(COURSE_ID, sashaFirst.id)).rejects.toMatchObject({
      operation: 'load-review',
      kind: 'invalid-response',
    });
  });
});
