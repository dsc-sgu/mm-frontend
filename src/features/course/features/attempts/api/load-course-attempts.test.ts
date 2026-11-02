import { runHttpOperation } from '@/app/remote-data/http';
import { beforeEach, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockBackend, reviewWorld } from '@/app/mock-backend/state';
import { server } from '@/app/mock-backend/node';
import { loadCourseAttempts } from './load-course-attempts';
import { courseAttemptsKeys } from './queries';

const courseId = reviewWorld.courses.algorithms.id;
const filters = { tasks: [], students: [], graded: 'any' } as const;

const input = () => ({
  courseId,
  filters: { ...filters, tasks: [], students: [] },
});

beforeEach(() => mockBackend.reset('world:review'));

test('ATT-04: includes history in submission order and course-wide catalogs', async () => {
  const result = await loadCourseAttempts(input());

  expect(result.attempts.map((a) => a.id)).toEqual([
    reviewWorld.attempts[1].id,
    reviewWorld.attempts[2].id,
    reviewWorld.attempts[0].id,
  ]);
  expect(result.totalAttemptsCount).toBe(3);
  expect(result.students).toHaveLength(3);
});

test('ATT-02: rejects the entire list when one item is invalid', async () => {
  server.use(
    http.get('/api/v1/courses/:courseId/attempts', () =>
      HttpResponse.json({
        totalAttemptsCount: 1,
        tasks: [],
        students: [],
        attempts: [{}],
      })
    )
  );

  await expect(loadCourseAttempts(input())).rejects.toMatchObject({
    kind: 'invalid-response',
  });
});

test('ATT-01: ID order and duplicates do not change the key', () => {
  const a = reviewWorld.users.sasha.id;
  const b = reviewWorld.users.petya.id;

  expect(
    courseAttemptsKeys.list(courseId, {
      ...input().filters,
      students: [b, a, b],
    })
  ).toEqual(
    courseAttemptsKeys.list(courseId, { ...input().filters, students: [a, b] })
  );
});

test('ATT-04: breaks timestamp ties by AttemptId', async () => {
  mockBackend.state.attempts.forEach((attempt) => {
    attempt.submittedAt = '2026-05-22T09:00:00.000Z';
  });

  const result = await loadCourseAttempts(input());

  expect(result.attempts.map((a) => a.id)).toEqual(
    reviewWorld.attempts.map((a) => a.id)
  );
});

test('ATT-04: preserves course-wide catalogs when filtered', async () => {
  const filtered = await loadCourseAttempts({
    ...input(),
    filters: { ...input().filters, students: [reviewWorld.users.sasha.id] },
  });

  expect(filtered.attempts).toHaveLength(2);
  expect(filtered.students).toHaveLength(3);
  expect(filtered.totalAttemptsCount).toBe(3);
});

test('preserves cancellation', async () => {
  const controller = new AbortController();
  controller.abort();

  await expect(
    loadCourseAttempts(input(), controller.signal)
  ).rejects.toMatchObject({ name: 'AbortError' });
});

test.each([
  ['missing course', 'missing', 404],
  ['course without membership', reviewWorld.courses.databases.id, 404],
  ['course section forbidden to a Student', courseId, 403],
])('denies %s without a response body', async (_scenario, id, status) => {
  mockBackend.state.session!.userId = reviewWorld.users.sasha.id;

  const response = await runHttpOperation(
    {
      name: 'test-course-attempts-denial',
      url: `/api/v1/courses/${id}/attempts`,
    },
    async ({ response }) => ({
      status: response.status,
      body: await response.text(),
    })
  );

  expect(response.status).toBe(status);
  expect(response.body).toBe('');
});
