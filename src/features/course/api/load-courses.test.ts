import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { invalidBody, undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { reply } from '@/app/testing/reply';
import { loadCourses } from '@/features/course/api/load-courses';

const COURSES_URL = '/api/v1/courses';
const COURSE_DTO = {
  id: '10000000-0000-4000-8000-000000000001',
  slug: 'algorithms',
  title: 'Алгоритмы',
  shortTitle: 'Алг',
  iconName: 'code-xml',
  color: 'teal',
  teachers: [{ firstName: 'Анна', lastName: 'Иванова', username: 'anna' }],
};

describe('TR-05: load-courses statuses', () => {
  test('200 returns the validated course list with separate identity and locator', async () => {
    server.use(http.get(COURSES_URL, reply(200, [COURSE_DTO])));

    await expect(loadCourses()).resolves.toEqual([COURSE_DTO]);
  });

  test.each([204, 401, 403, 404, 500])(
    'undeclared %i rejects instead of resolving an empty list',
    async (status) => {
      server.use(http.get(COURSES_URL, undeclaredStatus(status)));

      await expect(loadCourses()).rejects.toMatchObject({
        name: 'OperationFailure',
        operation: 'load-courses',
        reason: { kind: 'unexpected-http-status', status },
      });
    }
  );

  test.each([
    ['id', 'algorithms'],
    ['slug', 'Invalid slug'],
    ['iconName', 'not-a-lucide-icon'],
    ['color', 'not-a-course-color'],
    ['teachers', [{ firstName: 'Анна', lastName: 'Иванова', username: 42 }]],
    [
      'teachers',
      [{ firstName: 'Анна', lastName: 'Иванова', username: 'anna ivanova' }],
    ],
  ])('200 with an invalid %s rejects the entire list', async (field, value) => {
    server.use(
      http.get(COURSES_URL, invalidBody([{ ...COURSE_DTO, [field]: value }]))
    );

    await expect(loadCourses()).rejects.toMatchObject({
      operation: 'load-courses',
      kind: 'invalid-response',
    });
  });
});
