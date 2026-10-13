import { http } from 'msw';
import * as v from 'valibot';
import {
  holdResponse,
  invalidBody,
  networkFailure,
  undeclaredStatus,
  unreadableBody,
} from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { reply } from '@/app/testing/reply';
import { describe, expect, test } from 'vitest';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { loadCourse } from './load-course';
import { CourseIdSchema } from '@/features/course/model/identity';

const ALGORITHMS = {
  id: '20000000-0000-4000-8000-000000000001',
  title: 'Алгоритмы',
  shortTitle: 'Алгоритмы',
  iconName: 'code-xml',
  color: 'teal',
};

const LOOKUP_URL = '/api/v1/courses/algorithms';
const FOUND = { status: 'found', course: ALGORITHMS, role: 'student' };

function signInAs(userId: typeof accessWorld.users.vera.id) {
  mockBackend.reset('world:access');
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

describe('ACC-04: course lookup against canonical memberships', () => {
  test('returns shell metadata and each course-local role of the cross-role user', async () => {
    signInAs(accessWorld.users.vera.id);

    await expect(
      loadCourse(accessWorld.courses.algorithms.slug)
    ).resolves.toEqual({
      status: 'found',
      course: ALGORITHMS,
      role: 'student',
    });
    await expect(
      loadCourse(accessWorld.courses.databases.slug)
    ).resolves.toEqual({
      status: 'found',
      course: {
        id: '20000000-0000-4000-8000-000000000002',
        title: 'Базы данных',
        shortTitle: 'БД',
        iconName: 'database',
        color: 'blue',
      },
      role: 'teacher',
    });
  });

  test('resolves a stable CourseId to shell metadata and the current User membership', async () => {
    signInAs(accessWorld.users.vera.id);

    await expect(
      loadCourse(accessWorld.courses.algorithms.id)
    ).resolves.toEqual({
      status: 'found',
      course: ALGORITHMS,
      role: 'student',
    });
  });

  test('UUID letter casing preserves Course identity and its membership outcome', async () => {
    signInAs(accessWorld.users.vera.id);
    const course = mockBackend.state.courses.find(
      ({ id }) => id === accessWorld.courses.algorithms.id
    );
    if (!course) throw new Error('The fixture has no Algorithms Course');
    const canonicalId = v.parse(
      CourseIdSchema,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
    course.id = canonicalId;
    mockBackend.state.memberships = mockBackend.state.memberships.map(
      (membership) =>
        membership.courseId === accessWorld.courses.algorithms.id
          ? { ...membership, courseId: canonicalId }
          : membership
    );
    const locator = v.parse(
      CourseIdSchema,
      'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'
    );

    await expect(loadCourse(locator)).resolves.toEqual({
      status: 'found',
      course: { ...ALGORITHMS, id: canonicalId },
      role: 'student',
    });
    mockBackend.state.session = {
      userId: accessWorld.users.guest.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    await expect(loadCourse(locator)).resolves.toEqual({
      status: 'not-member',
    });
  });

  test.each([
    {
      kind: 'slug',
      missing: accessWorld.missingSlug,
      existing: accessWorld.courses.algorithms.slug,
    },
    {
      kind: 'id',
      missing: v.parse(CourseIdSchema, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      existing: accessWorld.courses.algorithms.id,
    },
  ])(
    '$kind distinguishes an unknown locator from a non-member without leaking metadata',
    async ({ missing, existing }) => {
      signInAs(accessWorld.users.guest.id);

      await expect(loadCourse(missing)).resolves.toEqual({
        status: 'course-not-found',
      });
      await expect(loadCourse(existing)).resolves.toEqual({
        status: 'not-member',
      });
    }
  );
});

describe('ACC-04 / TR-05: lookup transport contract', () => {
  test.each([204, 400, 401, 403, 409, 500, 503])(
    'undeclared %i is a failure, never an access denial',
    async (status) => {
      server.use(http.get(LOOKUP_URL, undeclaredStatus(status)));

      await expect(
        loadCourse(accessWorld.courses.algorithms.slug)
      ).rejects.toMatchObject({
        name: 'OperationFailure',
        operation: 'load-course',
        reason: { kind: 'unexpected-http-status', status },
      });
    }
  );

  test.each([
    ['identity', { ...FOUND, course: { ...ALGORITHMS, id: 'algorithms' } }],
    ['title', { ...FOUND, course: { ...ALGORITHMS, title: 42 } }],
    ['short title', { ...FOUND, course: { ...ALGORITHMS, shortTitle: null } }],
    ['icon', { ...FOUND, course: { ...ALGORITHMS, iconName: 'invalid-icon' } }],
    ['color', { ...FOUND, course: { ...ALGORITHMS, color: 'invalid-color' } }],
    ['role', { ...FOUND, role: 'admin' }],
    ['status', { ...FOUND, status: 'allowed' }],
    ['denial with success status', { status: 'not-member' }],
  ])(
    'an invalid %s rejects instead of exposing untrusted context',
    async (_, body) => {
      server.use(http.get(LOOKUP_URL, invalidBody(body)));

      await expect(
        loadCourse(accessWorld.courses.algorithms.slug)
      ).rejects.toMatchObject({
        operation: 'load-course',
        kind: 'invalid-response',
      });
    }
  );

  test.each([{ status: 'forbidden' }, FOUND, {}])(
    'a malformed 404 payload is a failure, not a fabricated denial',
    async (body) => {
      server.use(http.get(LOOKUP_URL, reply(404, body)));

      await expect(
        loadCourse(accessWorld.courses.algorithms.slug)
      ).rejects.toMatchObject({ kind: 'invalid-response' });
    }
  );

  test.each([
    ['network', networkFailure],
    ['unreadable-body', unreadableBody],
  ])('%s remains an operation failure', async (kind, resolver) => {
    server.use(http.get(LOOKUP_URL, resolver));

    await expect(
      loadCourse(accessWorld.courses.algorithms.slug)
    ).rejects.toMatchObject({ name: 'OperationFailure', kind });
  });

  test('cancellation preserves the caller reason rather than becoming a denial or failure', async () => {
    const held = holdResponse();
    server.use(http.get(LOOKUP_URL, held.resolver));
    const controller = new AbortController();
    const reason = new Error('left the course route');
    const pending = loadCourse(
      accessWorld.courses.algorithms.slug,
      controller.signal
    );
    const rejection = expect(pending).rejects.toBe(reason);
    try {
      await held.requested;
      controller.abort(reason);
      await rejection;
    } finally {
      held.release();
    }
  });

  test('an unauthenticated session is an HTTP failure, not a course access denial', async () => {
    mockBackend.state.session = null;

    await expect(
      loadCourse(accessWorld.courses.algorithms.slug)
    ).rejects.toMatchObject({
      kind: 'unexpected-http-status',
      reason: { status: 401 },
    });
  });
});
