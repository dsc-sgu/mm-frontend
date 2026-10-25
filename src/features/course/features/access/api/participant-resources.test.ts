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
import { accessDenial } from '@/app/mock-backend/participant-access';
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
import {
  AttemptIdSchema,
  AttemptNumberSchema,
} from '@/features/course/model/identity';
import { loadRepository } from '@/features/course/features/repository/api/load-repository';
import { repositoryLocatorOptions } from '@/features/course/features/repository/api/queries';
import { loadAttempt } from '@/features/course/features/attempt-review/api/load-attempt';
import { attemptLocatorOptions } from '@/features/course/features/attempt-review/api/locator-queries';
import { loadReview } from '@/features/course/features/review/api/load-review';
import { loadCourse } from './load-course';
import { reviewKeys } from '@/features/course/features/review/api/keys';

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
        status: 'not-found',
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
        status: 'not-found',
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
    ).resolves.toEqual({ status: 'not-found' });
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
    ).resolves.toEqual({ status: 'not-found' });
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
    const key = reviewKeys.detail(sasha.id, COURSE, reviewWorld.attempts[0].id);
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
    const attemptId = reviewWorld.attempts[2].id;
    expect(reviewKeys.detail(sasha.id, COURSE, attemptId)).not.toEqual(
      reviewKeys.detail(anna.id, COURSE, attemptId)
    );
  });
});

async function wire(path: string) {
  // Compare what the backend puts on the wire, before any DTO mapping.
  // eslint-disable-next-line no-restricted-globals
  const response = await fetch(`http://localhost:3000/api/v1/courses/${path}`);
  return {
    status: response.status,
    headers: [...response.headers.entries()],
    body: await response.text(),
  };
}

describe('ADR 0006: a foreign resource is indistinguishable from a missing one', () => {
  const MISSING_ATTEMPT = v.parse(
    AttemptIdSchema,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );
  const PETYA_ATTEMPT = reviewWorld.attempts[2].id;
  const MISSING = v.parse(UsernameSchema, 'missing');

  test.each([
    {
      resource: 'Course',
      viewer: guest.id,
      missing: {
        path: accessWorld.missingSlug,
        load: () => loadCourse(accessWorld.missingSlug),
      },
      foreign: {
        path: accessWorld.courses.algorithms.slug,
        load: () => loadCourse(accessWorld.courses.algorithms.slug),
      },
    },
    {
      resource: 'Attempt locator',
      viewer: sasha.id,
      missing: {
        path: `${COURSE}/tasks/1/attempts/missing/1`,
        load: () => loadAttempt(COURSE, '1', MISSING, ONE),
      },
      foreign: {
        path: `${COURSE}/tasks/1/attempts/petya/1`,
        load: () => loadAttempt(COURSE, '1', petya.username, ONE),
      },
    },
    {
      resource: 'Repository',
      viewer: sasha.id,
      missing: {
        path: `${COURSE}/repositories/missing`,
        load: () => loadRepository(COURSE, MISSING),
      },
      foreign: {
        path: `${COURSE}/repositories/petya`,
        load: () => loadRepository(COURSE, petya.username),
      },
    },
    {
      resource: 'Review by AttemptId',
      viewer: sasha.id,
      missing: {
        path: `${COURSE}/attempts/${MISSING_ATTEMPT}/review`,
        load: () => loadReview(COURSE, MISSING_ATTEMPT),
      },
      foreign: {
        path: `${COURSE}/attempts/${PETYA_ATTEMPT}/review`,
        load: () => loadReview(COURSE, PETYA_ATTEMPT),
      },
    },
  ])(
    '$resource: the same body-less 404 and the same outcome',
    async ({ viewer, missing, foreign }) => {
      signIn(viewer);
      const missingWire = await wire(missing.path);
      expect(missingWire).toEqual({ status: 404, headers: [], body: '' });
      expect(await wire(foreign.path)).toEqual(missingWire);
      await expect(missing.load()).resolves.toEqual({ status: 'not-found' });
      await expect(foreign.load()).resolves.toEqual({ status: 'not-found' });
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
    // 403 is no denial: a foreign resource answers 404 (ADR 0006).
    test.each([401, 403, 409, 500, 503])(
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

    test('a 404 is resolved Query data, with no retry', async () => {
      let requests = 0;
      server.use(
        http.get(url, () => {
          requests += 1;
          return accessDenial('not-found');
        })
      );
      const client = createQueryClient();
      try {
        await expect(createQuery(client).run()).resolves.toEqual({
          status: 'not-found',
        });
        expect(requests).toBe(1);
      } finally {
        client.clear();
      }
    });

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
