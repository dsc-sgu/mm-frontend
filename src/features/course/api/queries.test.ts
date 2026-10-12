import { describe, expect, test } from 'vitest';
import { http } from 'msw';
import { isCancelledError } from '@tanstack/react-query';
import { holdResponse, invalidBody } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  seededUsers,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { createQueryClient } from '@/app/remote-data/query-client';
import {
  coursesKeys,
  coursesQueryOptions,
} from '@/features/course/api/queries';

const DEV_SLUGS = [
  'algorithms-and-data-structures',
  'databases',
  'programming-languages',
  'frontend-engineering',
  'operating-systems',
  'computer-networks',
  'modern-information-technologies',
];

describe('course list against canonical memberships', () => {
  test('the seeded teacher keeps all demo courses, while the student sees only their course', async () => {
    const queryClient = createQueryClient();
    try {
      const teacherCourses = await queryClient.query(
        coursesQueryOptions(seededUsers.mitTeacher.id)
      );
      expect(teacherCourses.map(({ slug }) => slug)).toEqual(DEV_SLUGS);

      mockBackend.state.session = {
        userId: seededUsers.mitStudent.id,
        expiresAt: SESSION_EXPIRES_AT,
      };
      const studentCourses = await queryClient.query(
        coursesQueryOptions(seededUsers.mitStudent.id)
      );
      expect(studentCourses.map(({ slug }) => slug)).toEqual([
        'modern-information-technologies',
      ]);
    } finally {
      queryClient.clear();
    }
  });

  test('world:access lists both courses for the cross-role user with their card teachers', async () => {
    mockBackend.reset('world:access');
    mockBackend.state.session = {
      userId: accessWorld.users.vera.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    const queryClient = createQueryClient();
    try {
      const courses = await queryClient.query(
        coursesQueryOptions(accessWorld.users.vera.id)
      );

      expect(
        courses.map(({ slug, teachers }) => ({
          slug,
          teachers: teachers.map(({ firstName }) => firstName),
        }))
      ).toEqual([
        { slug: 'algorithms', teachers: ['Анна', 'Борис'] },
        { slug: 'databases', teachers: ['Вера'] },
      ]);
    } finally {
      queryClient.clear();
    }
  });

  test('world:access authenticated guest has a successful empty list', async () => {
    mockBackend.reset('world:access');
    mockBackend.state.session = {
      userId: accessWorld.users.guest.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    const queryClient = createQueryClient();
    try {
      await expect(
        queryClient.query(coursesQueryOptions(accessWorld.users.guest.id))
      ).resolves.toEqual([]);
    } finally {
      queryClient.clear();
    }
  });

  test('an invalid response never becomes course data in the user cache', async () => {
    server.use(http.get('/api/v1/courses', invalidBody([{ id: 'untrusted' }])));
    const queryClient = createQueryClient();
    const userId = seededUsers.mitTeacher.id;
    try {
      await expect(
        queryClient.query(coursesQueryOptions(userId))
      ).rejects.toMatchObject({ kind: 'invalid-response' });
      expect(
        queryClient.getQueryData(coursesKeys.user(userId))
      ).toBeUndefined();
    } finally {
      queryClient.clear();
    }
  });

  test('cancelling a held course list leaves the query without an operation failure', async () => {
    const held = holdResponse();
    server.use(http.get('/api/v1/courses', held.resolver));
    const queryClient = createQueryClient();
    const userId = seededUsers.mitTeacher.id;
    const pending = queryClient.query(coursesQueryOptions(userId));
    const rejection = expect(pending).rejects.toSatisfy(isCancelledError);
    try {
      await held.requested;
      await queryClient.cancelQueries({ queryKey: coursesKeys.user(userId) });
      await rejection;
      expect(
        queryClient.getQueryState(coursesKeys.user(userId))?.error
      ).toBeNull();
    } finally {
      held.release();
      queryClient.clear();
    }
  });
});
