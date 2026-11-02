import { beforeEach, describe, expect, it } from 'vitest';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { createQueryClient } from '@/app/remote-data/query-client';
import type { UserId } from '@/features/auth/model/identity';
import { coursePageKeys, coursePageQueryOptions } from './queries';

const COURSE = accessWorld.courses.algorithms;
const STUDENT = accessWorld.users.sasha;
const TEACHER = accessWorld.users.anna;

function signIn(userId: UserId) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

beforeEach(() => {
  mockBackend.reset('world:access');
});

describe('participant-bound Course Page cache', () => {
  it('does not reuse one participant’s Task Summary access for another', async () => {
    signIn(STUDENT.id);
    const queryClient = createQueryClient();
    try {
      await queryClient.query(
        coursePageQueryOptions({
          courseId: COURSE.id,
          viewerId: STUDENT.id,
          role: 'student',
        })
      );
      signIn(TEACHER.id);

      const teacherOutcome = await queryClient.query(
        coursePageQueryOptions({
          courseId: COURSE.id,
          viewerId: TEACHER.id,
          role: 'teacher',
        })
      );

      expect(teacherOutcome).toMatchObject({
        status: 'found',
        page: { taskSummaries: [{ status: 'teacher' }, {}, {}] },
      });
      expect(
        queryClient.getQueryData(
          coursePageKeys.detail(COURSE.id, STUDENT.id, 'student')
        )
      ).toMatchObject({
        status: 'found',
        page: { taskSummaries: [{ status: 'open' }, {}, {}] },
      });
    } finally {
      queryClient.clear();
    }
  });

  it('reads the projection again when the confirmed Course role changes', async () => {
    signIn(STUDENT.id);
    const queryClient = createQueryClient();
    try {
      await queryClient.query(
        coursePageQueryOptions({
          courseId: COURSE.id,
          viewerId: STUDENT.id,
          role: 'student',
        })
      );
      mockBackend.state.memberships = mockBackend.state.memberships.map(
        (membership) =>
          membership.courseId === COURSE.id && membership.userId === STUDENT.id
            ? { ...membership, role: 'teacher' }
            : membership
      );

      const outcome = await queryClient.query(
        coursePageQueryOptions({
          courseId: COURSE.id,
          viewerId: STUDENT.id,
          role: 'teacher',
        })
      );

      expect(outcome).toMatchObject({
        status: 'found',
        page: { taskSummaries: [{ status: 'teacher' }, {}, {}] },
      });
    } finally {
      queryClient.clear();
    }
  });
});
