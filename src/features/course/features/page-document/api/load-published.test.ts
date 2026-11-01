import { createQueryClient } from '@/app/remote-data/query-client';
import { coursePageQueryOptions } from '@/features/course/features/page-document/api/queries';
import { describe, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/app/mock-backend/node';
import {
  mockBackend,
  accessWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { getPageDocument } from '@/app/mock-backend/page-documents';
import { loadPublishedPage } from './load-published';

function setup() {
  mockBackend.reset('world:access');
  mockBackend.state.session = {
    userId: accessWorld.users.vera.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
  const course = mockBackend.state.courses.find(
    (c) => c.id === accessWorld.courses.algorithms.id
  )!;
  return { course, document: getPageDocument(course) };
}
describe('DRF-22: опубликованная страница', () => {
  test('читает последнюю опубликованную версию, скрывает черновик и удалённый блок', async () => {
    const { course, document } = setup();
    const first = document.versions[0];
    document.versions.push({
      ...first,
      version: 2,
      block: {
        id: first.id,
        type: 'paragraph',
        data: {
          formatVersion: 1,
          children: [{ type: 'text', text: 'Опубликовано' }],
        },
      },
    });
    document.versions.push({ ...first, version: 3, publication: 'draft' });
    document.versions.push({
      ...document.versions[1],
      version: 2,
      deleted: true,
    });
    const result = await loadPublishedPage(course.id);
    if (result.status === 'not-found') throw new Error('Page denied');
    expect(result?.courseId).toBe(course.id);
    expect(result?.content[0]).toMatchObject({
      id: first.id,
      version: 2,
      type: 'paragraph',
    });
    expect(result?.content.some((b) => b.id === document.versions[1].id)).toBe(
      false
    );
  });
  test('возвращает саммари студента и преподавателя из контракта чтения', async () => {
    const { course, document } = setup();
    document.page.taskSummaries = [
      { status: 'open', taskId: '1', title: 'Открыто' },
      {
        status: 'locked',
        taskId: '2',
        title: 'Закрыто',
        prerequisite: 'Сдать первое',
      },
      { status: 'unavailable', taskId: '3' },
    ];
    expect(
      (await pageFor(course.id)).taskSummaries.map((s) => s.status)
    ).toEqual(['open', 'locked', 'unavailable']);
    const membership = mockBackend.state.memberships.find(
      (m) => m.courseId === course.id && m.userId === accessWorld.users.vera.id
    )!;
    membership.role = 'teacher';
    expect(
      (await pageFor(course.id)).taskSummaries.map((s) => s.status)
    ).toEqual(['teacher', 'teacher', 'unavailable']);
  });
  test('отсутствующий курс и потеря участия дают одинаковый отказ в доступе', async () => {
    const { course } = setup();
    mockBackend.state.memberships = [];
    expect(await loadPublishedPage(course.id)).toEqual({ status: 'not-found' });
    mockBackend.state.courses = [];
    expect(await loadPublishedPage(course.id)).toEqual({ status: 'not-found' });
  });
  test('невалидный DTO и неожиданный статус отклоняют операцию', async () => {
    const { course } = setup();
    server.use(
      http.get('/api/v1/courses/:id/page', () => HttpResponse.json({}))
    );
    await expect(loadPublishedPage(course.id)).rejects.toMatchObject({
      kind: 'invalid-response',
    });
    server.use(
      http.get(
        '/api/v1/courses/:id/page',
        () => new HttpResponse(null, { status: 503 })
      )
    );
    await expect(loadPublishedPage(course.id)).rejects.toMatchObject({
      kind: 'unexpected-http-status',
    });
  });
});

async function pageFor(id: Parameters<typeof loadPublishedPage>[0]) {
  const result = await loadPublishedPage(id);
  if (result.status === 'not-found') throw new Error('Page denied');
  return result;
}

test('отмена остаётся отменой', async () => {
  const { course } = setup();
  const controller = new AbortController();
  controller.abort();
  await expect(
    loadPublishedPage(course.id, controller.signal)
  ).rejects.toMatchObject({ name: 'AbortError' });
});

test('кэш саммари не переносит доступ между участниками', async () => {
  const { course, document } = setup();
  const vera = accessWorld.users.vera.id;
  const sasha = accessWorld.users.sasha.id;
  const membership = mockBackend.state.memberships.find(
    (m) => m.courseId === course.id && m.userId === vera
  )!;
  mockBackend.state.memberships.push({
    ...membership,
    userId: sasha,
    role: 'student',
  });
  document.studentTaskSummaries[vera] = [
    { status: 'open', taskId: '1', title: 'Задание' },
  ];
  document.studentTaskSummaries[sasha] = [
    {
      status: 'locked',
      taskId: '1',
      title: 'Задание',
      prerequisite: 'Предыдущее задание',
    },
  ];
  const client = createQueryClient();
  const first = await client.query(coursePageQueryOptions(course.id, vera));
  mockBackend.state.session = { userId: sasha, expiresAt: SESSION_EXPIRES_AT };
  const second = await client.query(coursePageQueryOptions(course.id, sasha));
  expect(first.status === 'found' && first.taskSummaries[0].status).toBe(
    'open'
  );
  expect(second.status === 'found' && second.taskSummaries[0].status).toBe(
    'locked'
  );
  expect(
    client.getQueryData(coursePageQueryOptions(course.id, vera).queryKey)
  ).toEqual(first);
  client.clear();
});
