import { http } from 'msw';
import type { QueryClient } from '@tanstack/react-query';
import * as v from 'valibot';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  accessWorld,
  reviewWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { server } from '@/app/mock-backend/node';
import {
  holdResponse,
  invalidBody,
  networkFailure,
  unreadableBody,
  undeclaredStatus,
} from '@/app/mock-backend/failures';
import { createQueryClient } from '@/app/remote-data/query-client';
import { reply } from '@/app/testing/reply';
import { UsernameSchema, type UserId } from '@/features/auth/model/identity';
import { AttemptNumberSchema } from '@/features/course/model/identity';
import { loadRepository } from '@/features/course/features/repository/api/load-repository';
import { repositoryLocatorOptions } from '@/features/course/features/repository/api/queries';
import { loadAttempt } from '@/features/course/features/attempt-review/api/load-attempt';
import { attemptLocatorOptions } from '@/features/course/features/attempt-review/api/locator-queries';
import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/queries';

const COURSE = accessWorld.courses.algorithms.id;
const ONE = v.parse(AttemptNumberSchema, 1);
const { sasha, petya, anna, vera, guest } = accessWorld.users;
const REPOSITORY_URL = `/api/v1/courses/${COURSE}/repositories/sasha`;
const ATTEMPT_URL = `/api/v1/courses/${COURSE}/tasks/1/attempts/sasha/1`;

function signIn(userId: UserId) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

beforeEach(() => {
  mockBackend.reset('world:review');
  signIn(sasha.id);
});

describe('ACC-08: backend resolves participant resources without a client roster', () => {
  test.each(['world:access', 'world:review'] as const)(
    '%s gives each Student only their own Repository',
    async (world) => {
      mockBackend.reset(world);
      signIn(sasha.id);
      await expect(loadRepository(COURSE, sasha.username)).resolves.toEqual({
        status: 'found',
        repository: { studentId: sasha.id },
      });
      await expect(loadRepository(COURSE, petya.username)).resolves.toEqual({
        status: 'forbidden',
      });
      await expect(loadRepository(COURSE, anna.username)).resolves.toEqual({
        status: 'not-found',
      });
      await expect(
        loadRepository(COURSE, v.parse(UsernameSchema, 'missing'))
      ).resolves.toEqual({ status: 'not-found' });
      signIn(anna.id);
      for (const student of [sasha, petya, vera]) {
        await expect(loadRepository(COURSE, student.username)).resolves.toEqual(
          { status: 'found', repository: { studentId: student.id } }
        );
      }
      signIn(guest.id);
      await expect(loadRepository(COURSE, sasha.username)).resolves.toEqual({
        status: 'forbidden',
      });
    }
  );

  test('Attempt numbers resolve to distinct internal identities, scoped to Task and Student', async () => {
    const first = await loadAttempt(COURSE, '1', sasha.username, ONE);
    const second = await loadAttempt(
      COURSE,
      '1',
      sasha.username,
      v.parse(AttemptNumberSchema, 2)
    );
    expect(first).toEqual({
      status: 'found',
      attempt: {
        id: reviewWorld.attempts[0].id,
        studentId: sasha.id,
        taskId: '1',
        attemptNumber: 1,
      },
    });
    expect(second).toEqual({
      status: 'found',
      attempt: {
        id: reviewWorld.attempts[1].id,
        studentId: sasha.id,
        taskId: '1',
        attemptNumber: 2,
      },
    });
    await expect(
      loadAttempt(COURSE, '1', petya.username, ONE)
    ).resolves.toEqual({ status: 'forbidden' });
    await expect(
      loadAttempt(COURSE, '2', sasha.username, ONE)
    ).resolves.toEqual({ status: 'not-found' });
    await expect(
      loadAttempt(COURSE, '1', sasha.username, v.parse(AttemptNumberSchema, 3))
    ).resolves.toEqual({ status: 'not-found' });
    signIn(anna.id);
    await expect(
      loadAttempt(COURSE, '1', petya.username, ONE)
    ).resolves.toEqual({
      status: 'found',
      attempt: {
        id: reviewWorld.attempts[2].id,
        studentId: petya.id,
        taskId: '1',
        attemptNumber: 1,
      },
    });
    signIn(vera.id);
    await expect(
      loadAttempt(COURSE, '1', petya.username, ONE)
    ).resolves.toEqual({ status: 'forbidden' });
    mockBackend.reset('world:access');
    signIn(sasha.id);
    await expect(
      loadAttempt(COURSE, '1', sasha.username, ONE)
    ).resolves.toEqual({ status: 'not-found' });
  });

  test('renaming a User locator leaves resolved identities and content keys unchanged', async () => {
    const user = mockBackend.state.users.find(({ id }) => id === sasha.id);
    if (!user) throw new Error('Missing Sasha');
    user.username = v.parse(UsernameSchema, 'renamed-sasha');
    await expect(loadRepository(COURSE, user.username)).resolves.toEqual({
      status: 'found',
      repository: { studentId: sasha.id },
    });
    await expect(
      loadAttempt(COURSE, '1', user.username, ONE)
    ).resolves.toMatchObject({
      status: 'found',
      attempt: { id: reviewWorld.attempts[0].id, studentId: sasha.id },
    });
    await expect(loadRepository(COURSE, sasha.username)).resolves.toEqual({
      status: 'not-found',
    });
    const key = attemptReviewKeys.detail(sasha.id, {
      courseId: COURSE,
      studentId: sasha.id,
      attemptId: reviewWorld.attempts[0].id,
    });
    expect(key).not.toContain(sasha.username);
    expect(key).not.toContain(user.username);
    expect(key).not.toContain(ONE);
  });

  test('lookup and content caches are scoped to the signed-in User identity', () => {
    expect(
      repositoryLocatorOptions(sasha.id, COURSE, petya.username).queryKey
    ).not.toEqual(
      repositoryLocatorOptions(anna.id, COURSE, petya.username).queryKey
    );
    expect(
      attemptLocatorOptions(sasha.id, COURSE, '1', petya.username, ONE).queryKey
    ).not.toEqual(
      attemptLocatorOptions(anna.id, COURSE, '1', petya.username, ONE).queryKey
    );
    const identity = {
      courseId: COURSE,
      studentId: petya.id,
      attemptId: reviewWorld.attempts[2].id,
    };
    expect(attemptReviewKeys.detail(sasha.id, identity)).not.toEqual(
      attemptReviewKeys.detail(anna.id, identity)
    );
  });

  test.each(['repositories/petya', 'tasks/1/attempts/petya/1'])(
    'denial of %s carries no owner/resource body or headers',
    async (path) => {
      // Inspect the actual backend wire response, independently of DTO mapping.
      // eslint-disable-next-line no-restricted-globals
      const response = await fetch(
        `http://localhost:3000/api/v1/courses/${COURSE}/${path}`
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ status: 'forbidden' });
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(
        [...response.headers.keys()].every((name) =>
          ['content-type', 'content-length'].includes(name)
        )
      ).toBe(true);
    }
  );
});

const operations = [
  {
    name: 'load-repository',
    url: REPOSITORY_URL,
    load: (signal?: AbortSignal) =>
      loadRepository(COURSE, sasha.username, signal),
    query: (client: QueryClient) => {
      const options = repositoryLocatorOptions(
        sasha.id,
        COURSE,
        sasha.username
      );
      return { key: options.queryKey, run: () => client.fetchQuery(options) };
    },
  },
  {
    name: 'load-attempt',
    url: ATTEMPT_URL,
    load: (signal?: AbortSignal) =>
      loadAttempt(COURSE, '1', sasha.username, ONE, signal),
    query: (client: QueryClient) => {
      const options = attemptLocatorOptions(
        sasha.id,
        COURSE,
        '1',
        sasha.username,
        ONE
      );
      return { key: options.queryKey, run: () => client.fetchQuery(options) };
    },
  },
];

describe.each(operations)(
  'TR-05: $name',
  ({ name, url, load, query: createQuery }) => {
    test.each([401, 409, 500, 503])(
      'undeclared HTTP %i rejects and is never cached as a denial',
      async (status) => {
        server.use(http.get(url, undeclaredStatus(status)));
        const client = createQueryClient();
        const query = createQuery(client);
        try {
          await expect(query.run()).rejects.toMatchObject({
            operation: name,
            kind: 'unexpected-http-status',
            reason: { status },
          });
          expect(client.getQueryData(query.key)).toBeUndefined();
        } finally {
          client.clear();
        }
      }
    );

    test.each([
      [200, { status: 'found' }],
      [
        200,
        {
          status: 'found',
          repository: { studentId: 'sasha' },
          attempt: {
            id: '1',
            studentId: 'sasha',
            taskId: '1',
            attemptNumber: 1,
          },
        },
      ],
      [404, { status: 'forbidden' }],
      [403, { status: 'not-found' }],
      [403, { status: 'forbidden', studentId: petya.id }],
      [404, { status: 'not-found', resource: {} }],
    ])(
      'invalid HTTP %i payload rejects before entering the cache',
      async (status, body) => {
        server.use(http.get(url, reply(status, body)));
        const client = createQueryClient();
        const query = createQuery(client);
        try {
          await expect(query.run()).rejects.toMatchObject({
            operation: name,
            kind: 'invalid-response',
          });
          expect(client.getQueryData(query.key)).toBeUndefined();
        } finally {
          client.clear();
        }
      }
    );

    test.each([
      ['network', networkFailure],
      ['unreadable-body', unreadableBody],
    ] as const)(
      '%s rejects as an operation failure',
      async (kind, resolver) => {
        server.use(http.get(url, resolver));
        await expect(load()).rejects.toMatchObject({ operation: name, kind });
      }
    );

    test('a JSON scalar cannot masquerade as an operation result', async () => {
      server.use(http.get(url, invalidBody('{')));
      await expect(load()).rejects.toMatchObject({
        operation: name,
        kind: 'invalid-response',
      });
    });

    test.each([
      [403, 'forbidden'],
      [404, 'not-found'],
    ] as const)(
      '%i is resolved Query data, with no retry',
      async (status, outcome) => {
        let requests = 0;
        server.use(
          http.get(url, (args) => {
            requests += 1;
            return reply(status, { status: outcome })(args);
          })
        );
        const client = createQueryClient();
        try {
          await expect(createQuery(client).run()).resolves.toEqual({
            status: outcome,
          });
          expect(requests).toBe(1);
        } finally {
          client.clear();
        }
      }
    );

    test('caller cancellation preserves the reason', async () => {
      const held = holdResponse();
      server.use(http.get(url, held.resolver));
      const controller = new AbortController();
      const reason = new Error('Left resource route');
      const pending = load(controller.signal);
      const rejection = expect(pending).rejects.toBe(reason);
      try {
        await held.requested;
        controller.abort(reason);
        await rejection;
      } finally {
        held.release();
      }
    });

    test('Query cancellation reaches the HTTP operation', async () => {
      const held = holdResponse();
      server.use(http.get(url, held.resolver));
      const client = createQueryClient();
      const query = createQuery(client);
      const pending = query.run();
      const rejection = expect(pending).rejects.toMatchObject({
        name: 'Error',
      });
      try {
        await held.requested;
        await client.cancelQueries({ queryKey: query.key, exact: true });
        await rejection;
        expect(client.getQueryData(query.key)).toBeUndefined();
      } finally {
        held.release();
        client.clear();
      }
    });
  }
);
