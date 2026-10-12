import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { mockBackend } from '@/app/mock-backend/state';
import { reply } from '@/app/testing/reply';
import { checkSession } from '@/features/auth/api/check-session';
import { logout } from '@/features/auth/api/logout';

const LOGOUT_URL = '/api/v1/auth/logout';

describe('TR-05: logout statuses', () => {
  // 401: the session has already ended, which is what logout asks for.
  test.each([204, 401])('%i → signed out', async (status) => {
    server.use(http.post(LOGOUT_URL, reply(status)));

    await expect(logout()).resolves.toBeUndefined();
  });

  test.each([200, 403, 500])(
    'undeclared %i → unexpected-http-status',
    async (status) => {
      server.use(http.post(LOGOUT_URL, undeclaredStatus(status)));

      await expect(logout()).rejects.toMatchObject({
        name: 'OperationFailure',
        operation: 'logout',
        reason: { kind: 'unexpected-http-status', status },
      });
    }
  );
});

describe('logout against the mock backend', () => {
  test('ends the session', async () => {
    await logout();

    await expect(checkSession()).resolves.toEqual({
      status: 'not-authorized',
    });
  });

  test('succeeds when the session has already ended', async () => {
    mockBackend.state.session = null;

    await expect(logout()).resolves.toBeUndefined();
  });
});
