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
test('ATT-04: список включает историю в порядке отправки и каталоги всего курса', async () => {
  const result = await loadCourseAttempts(input());
  expect(result.attempts.map((a) => a.id)).toEqual([
    reviewWorld.attempts[1].id,
    reviewWorld.attempts[2].id,
    reviewWorld.attempts[0].id,
  ]);
  expect(result.totalAttemptsCount).toBe(3);
  expect(result.students).toHaveLength(3);
});
test('ATT-02: один невалидный элемент отклоняет весь список', async () => {
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
test('ATT-01: порядок и дубликаты стабильных id не меняют ключ', () => {
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
