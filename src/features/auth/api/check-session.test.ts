import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { invalidBody, undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { mockBackend, seededUsers } from '@/app/mock-backend/state';
import { createQueryClient } from '@/app/remote-data/query-client';
import { checkSession } from '@/features/auth/api/check-session';
import { sessionKeys, sessionOptions } from '@/features/auth/api/queries';

const SESSION_URL = '/api/v1/auth/session';

describe('TR-05: check-session', () => {
  test('200 → authorized with the validated session', async () => {
    const { mitTeacher } = seededUsers;

    await expect(checkSession()).resolves.toEqual({
      status: 'authorized',
      session: {
        userId: mitTeacher.id,
        username: mitTeacher.username,
        email: mitTeacher.email,
        firstName: mitTeacher.firstName,
        lastName: mitTeacher.lastName,
        patronymic: mitTeacher.patronymic,
        avatarURL: mitTeacher.avatarURL,
        role: mitTeacher.role,
        sessionExpiresAt: '2099-12-31T23:59:59.999Z',
      },
    });
  });

  test('401 → not-authorized, as data rather than a failure', async () => {
    mockBackend.state.session = null;

    await expect(checkSession()).resolves.toEqual({
      status: 'not-authorized',
    });
  });

  test('an undeclared status → unexpected-http-status', async () => {
    server.use(http.get(SESSION_URL, undeclaredStatus(500)));

    await expect(checkSession()).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: 'check-session',
      reason: { kind: 'unexpected-http-status', status: 500 },
    });
  });

  test('a session without a valid userID → invalid-response', async () => {
    const { id, ...withoutId } = seededUsers.mitTeacher;
    server.use(
      http.get(
        SESSION_URL,
        invalidBody({
          ...withoutId,
          userID: id.slice(1),
          sessionExpiresAt: '2099-12-31T23:59:59.999Z',
        })
      )
    );

    await expect(checkSession()).rejects.toMatchObject({
      operation: 'check-session',
      reason: { kind: 'invalid-response', explanation: 'userID' },
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
