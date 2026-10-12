import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { mockBackend, seededUsers } from '@/app/mock-backend/state';
import { reply } from '@/app/testing/reply';
import { login } from '@/features/auth/api/login';

const LOGIN_URL = '/api/v1/auth/login';
const CREDENTIALS = { email: 'anna@example.com', password: 'Secret123' };

describe('TR-05: login statuses', () => {
  test.each([
    {
      status: 200,
      body: { userID: '00000000-0000-4000-8000-0000000000aa' },
      outcome: { status: 'signed-in' },
    },
    {
      status: 400,
      body: undefined,
      outcome: { status: 'invalid-credentials' },
    },
  ])('$status → $outcome.status', async ({ status, body, outcome }) => {
    server.use(http.post(LOGIN_URL, reply(status, body)));

    await expect(login(CREDENTIALS)).resolves.toEqual(outcome);
  });

  test.each([201, 204, 401, 422, 500])(
    'undeclared %i → unexpected-http-status',
    async (status) => {
      server.use(http.post(LOGIN_URL, undeclaredStatus(status)));

      await expect(login(CREDENTIALS)).rejects.toMatchObject({
        name: 'OperationFailure',
        operation: 'login',
        reason: { kind: 'unexpected-http-status', status },
      });
    }
  );
});

describe('login against the mock backend', () => {
  test('valid credentials sign the user in', async () => {
    const { mitStudent } = seededUsers;

    await expect(
      login({ email: mitStudent.email, password: mitStudent.password })
    ).resolves.toEqual({ status: 'signed-in' });
    expect(mockBackend.state.session?.userId).toBe(mitStudent.id);
  });

  test('a wrong password leaves the user signed out', async () => {
    mockBackend.state.session = null;

    await expect(
      login({ email: seededUsers.mitStudent.email, password: 'wrong' })
    ).resolves.toEqual({ status: 'invalid-credentials' });
    expect(mockBackend.state.session).toBeNull();
  });
});
