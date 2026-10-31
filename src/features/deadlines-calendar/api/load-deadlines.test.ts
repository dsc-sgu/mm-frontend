import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { server } from '@/app/mock-backend/node';
import { mockBackend } from '@/app/mock-backend/state';
import { loadDeadlines } from './load-deadlines';

const start = new Date('2026-05-25T00:00:00Z');
const end = new Date('2026-05-31T23:59:59Z');

test('читает дедлайны канонических заданий и отражает изменение курса и срока', async () => {
  const task = mockBackend.state.tasks[0];
  const course = mockBackend.state.courses.find(
    ({ id }) => id === task.courseId
  )!;
  mockBackend.state.session = {
    userId: mockBackend.state.memberships.find(
      ({ courseId }) => courseId === course.id
    )!.userId,
    expiresAt: '2099-01-01T00:00:00Z',
  };
  course.shortTitle = 'Новый курс';
  task.deadlineAt = '2026-05-28T12:00:00.000Z';
  const days = await loadDeadlines(start, end);
  expect(Object.values(days).flat()).toContainEqual(
    expect.objectContaining({
      courseId: course.id,
      taskId: task.id,
      taskText: task.title,
      courseShortTitle: 'Новый курс',
      dueDate: new Date(task.deadlineAt),
    })
  );
  expect(
    await loadDeadlines(new Date('2100-01-01'), new Date('2100-01-02'))
  ).toEqual({});
});

test.each([401, 403, 500, 204])(
  'отказ HTTP %i не становится пустым результатом',
  async (status) => {
    server.use(
      http.get('/api/v1/deadlines', () => new HttpResponse(null, { status }))
    );
    await expect(loadDeadlines(start, end)).rejects.toMatchObject({
      kind: 'unexpected-http-status',
    });
  }
);

test('невалидный ответ отклоняется целиком', async () => {
  server.use(
    http.get('/api/v1/deadlines', () =>
      HttpResponse.json([{ dueDate: 'yesterday' }])
    )
  );
  await expect(loadDeadlines(start, end)).rejects.toMatchObject({
    kind: 'invalid-response',
  });
});

test('передаёт границы периода и сохраняет отмену', async () => {
  server.use(
    http.get('/api/v1/deadlines', ({ request }) => {
      const url = new URL(request.url);
      expect(url.searchParams.get('start')).toBe(start.toISOString());
      expect(url.searchParams.get('end')).toBe(end.toISOString());
      return HttpResponse.json([]);
    })
  );
  expect(await loadDeadlines(start, end)).toEqual({});
  const controller = new AbortController();
  controller.abort();
  await expect(
    loadDeadlines(start, end, controller.signal)
  ).rejects.toMatchObject({ name: 'AbortError' });
});
