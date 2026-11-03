import * as v from 'valibot';
import { beforeEach, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockBackend, reviewWorld } from '@/app/mock-backend/state';
import { server } from '@/app/mock-backend/node';
import { GradeSchema } from '@/features/course/model/grade';
import { loadReview } from './load-review';
import { saveQuickGrade } from './save-quick-grade';

const courseId = reviewWorld.courses.algorithms.id;
const attempt = reviewWorld.attempts[0];

beforeEach(() => mockBackend.reset('world:review'));

test('publishes a grade over HTTP while preserving the existing feedback and comments', async () => {
  const previous = await loadReview(courseId, attempt.id);
  if (previous.status !== 'published') {
    throw new Error('Expected a Review');
  }

  const saved = await saveQuickGrade(
    courseId,
    attempt.id,
    v.parse(GradeSchema, 8)
  );
  const result = await loadReview(courseId, attempt.id);

  expect(saved).toEqual({
    attemptId: attempt.id,
    taskId: attempt.taskId,
    studentId: attempt.studentId,
  });
  expect(result).toMatchObject({
    status: 'published',
    review: {
      grade: v.parse(GradeSchema, 8),
      overallFeedbackHtml: previous.review.overallFeedbackHtml,
      comments: previous.review.comments,
    },
  });
});

test('rejects an invalid success response instead of claiming a saved grade', async () => {
  server.use(
    http.post(
      '/api/v1/courses/:courseId/attempts/:attemptId/review/quick-grade',
      () => HttpResponse.json({})
    )
  );

  await expect(
    saveQuickGrade(courseId, attempt.id, v.parse(GradeSchema, 8))
  ).rejects.toMatchObject({ kind: 'invalid-response' });
});

test('rejects a grade above the Task maximum without changing the published Review', async () => {
  const previous = await loadReview(courseId, attempt.id);

  await expect(
    saveQuickGrade(courseId, attempt.id, v.parse(GradeSchema, 11))
  ).rejects.toMatchObject({ kind: 'unexpected-http-status' });

  expect(await loadReview(courseId, attempt.id)).toEqual(previous);
});
