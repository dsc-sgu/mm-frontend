import type { TaskSummary } from '@/features/course/features/page/model/types';
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
  test('читает последнюю опубликованную версию, игнорируя более новый черновик', async () => {
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

    const result = await pageFor(course.id);

    expect(result.courseId).toBe(course.id);
    expect(result.content[0]).toMatchObject({
      id: first.id,
      version: 2,
      type: 'paragraph',
    });
  });

  test('не возвращает блок с опубликованной версией удаления', async () => {
    const { course, document } = setup();
    const block = document.versions[1];
    document.versions.push({ ...block, version: 2, deleted: true });

    const result = await pageFor(course.id);

    expect(result.content.some(({ id }) => id === block.id)).toBe(false);
  });

  test('возвращает состояния доступа студента в саммари заданий', async () => {
    const { course, document } = setup();
    document.page.taskSummaries = taskSummaries();

    const result = await pageFor(course.id);

    expect(result.role).toBe('student');
    expect(result.taskSummaries.map(({ status }) => status)).toEqual([
      'open',
      'locked',
      'unavailable',
    ]);
  });

  test('возвращает саммари преподавателя без состояний доступа студента', async () => {
    const { course, document } = setup();
    document.page.taskSummaries = taskSummaries();
    const membership = mockBackend.state.memberships.find(
      (m) => m.courseId === course.id && m.userId === accessWorld.users.vera.id
    )!;
    membership.role = 'teacher';

    const result = await pageFor(course.id);

    expect(result.role).toBe('teacher');
    expect(result.taskSummaries.map(({ status }) => status)).toEqual([
      'teacher',
      'teacher',
      'unavailable',
    ]);
    expect(result.taskSummaries[1]).not.toHaveProperty('prerequisite');
  });

  test('потеря участия даёт отказ в доступе к существующему курсу', async () => {
    const { course } = setup();
    mockBackend.state.memberships = [];

    const result = await loadPublishedPage(course.id);

    expect(result).toEqual({ status: 'not-found' });
  });

  test('отсутствующий курс даёт отказ в доступе при сохранённом участии', async () => {
    const { course } = setup();
    mockBackend.state.courses = [];

    const result = await loadPublishedPage(course.id);

    expect(result).toEqual({ status: 'not-found' });
  });

  test('невалидный DTO отклоняет операцию', async () => {
    const { course } = setup();
    server.use(
      http.get('/api/v1/courses/:id/page', () => HttpResponse.json({}))
    );

    await expect(loadPublishedPage(course.id)).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  test('неожиданный HTTP 503 отклоняет операцию', async () => {
    const { course } = setup();
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

function taskSummaries(): TaskSummary[] {
  return [
    { status: 'open', taskId: '1', title: 'Открыто' },
    {
      status: 'locked',
      taskId: '2',
      title: 'Закрыто',
      prerequisite: 'Сдать первое',
    },
    { status: 'unavailable', taskId: '3' },
  ];
}

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
