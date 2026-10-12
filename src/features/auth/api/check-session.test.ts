import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { invalidBody, undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { mockBackend, seededUsers } from '@/app/mock-backend/state';
import { createQueryClient } from '@/app/remote-data/query-client';
import { reply } from '@/app/testing/reply';
import { checkSession } from '@/features/auth/api/check-session';
import { sessionKeys, sessionOptions } from '@/features/auth/api/queries';

const SESSION_URL = '/api/v1/auth/session';

const SESSION_DTO = {
  userID: '00000000-0000-4000-8000-0000000000aa',
  firstName: 'Анна',
  lastName: 'Иванова',
  patronymic: '',
  username: 'anna',
  email: 'anna@example.com',
  role: 'teacher',
  avatarURL: '',
  sessionExpiresAt: '2099-12-31T23:59:59.999Z',
};

const { userID, ...sessionFields } = SESSION_DTO;
const SESSION = { userId: userID, ...sessionFields };

describe('TR-05: check-session statuses', () => {
  test.each([
    {
      status: 200,
      body: SESSION_DTO,
      outcome: { status: 'authorized', session: SESSION },
    },
    { status: 401, body: undefined, outcome: { status: 'not-authorized' } },
  ])('$status → $outcome.status', async ({ status, body, outcome }) => {
    server.use(http.get(SESSION_URL, reply(status, body)));

    await expect(checkSession()).resolves.toEqual(outcome);
  });

  test.each([204, 403, 404, 500])(
    'undeclared %i → unexpected-http-status',
    async (status) => {
      server.use(http.get(SESSION_URL, undeclaredStatus(status)));

      await expect(checkSession()).rejects.toMatchObject({
        name: 'OperationFailure',
        operation: 'check-session',
        reason: { kind: 'unexpected-http-status', status },
      });
    }
  );

  test('200 with an invalid userID → invalid-response', async () => {
    server.use(
      http.get(SESSION_URL, invalidBody({ ...SESSION_DTO, userID: 'anna' }))
    );

    await expect(checkSession()).rejects.toMatchObject({
      operation: 'check-session',
      reason: { kind: 'invalid-response', explanation: 'userID' },
    });
  });

  test('session usernames use the canonical lowercase locator', async () => {
    server.use(
      http.get(SESSION_URL, reply(200, { ...SESSION_DTO, username: 'ANNA_1' }))
    );

    await expect(checkSession()).resolves.toMatchObject({
      status: 'authorized',
      session: { username: 'anna_1' },
    });
  });

  test('a session with an invalid username is an invalid response', async () => {
    server.use(
      http.get(
        SESSION_URL,
        invalidBody({ ...SESSION_DTO, username: 'anna ivanova' })
      )
    );

    await expect(checkSession()).rejects.toMatchObject({
      operation: 'check-session',
      kind: 'invalid-response',
    });
  });
});

describe('check-session against the mock backend', () => {
  test('a signed-in user gets their session', async () => {
    const { mitTeacher } = seededUsers;

    await expect(checkSession()).resolves.toMatchObject({
      status: 'authorized',
      session: { userId: mitTeacher.id, username: mitTeacher.username },
    });
  });

  test('without a session the user is not authorized', async () => {
    mockBackend.state.session = null;

    await expect(checkSession()).resolves.toEqual({
      status: 'not-authorized',
    });
  });
});

describe('TR-02: session cache', () => {
  test('an invalid response never reaches the query cache', async () => {
    const queryClient = createQueryClient();
    server.use(http.get(SESSION_URL, invalidBody({ username: 42 })));

    await expect(queryClient.query(sessionOptions)).rejects.toMatchObject({
      kind: 'invalid-response',
    });
    expect(queryClient.getQueryData(sessionKeys.all)).toBeUndefined();
  });
});
