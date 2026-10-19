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
import { loadReview } from './load-review';

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
