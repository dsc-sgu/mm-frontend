import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { mockBackend } from '@/app/mock-backend/state';
import { checkSession } from '@/features/auth/api/check-session';
import { logout } from '@/features/auth/api/logout';

describe('TR-05: logout', () => {
  test('204 → signed out', async () => {
    await expect(logout()).resolves.toBeUndefined();

    await expect(checkSession()).resolves.toEqual({
      status: 'not-authorized',
    });
  });

  test('401 → the session has already ended, which is the goal', async () => {
    mockBackend.state.session = null;

    await expect(logout()).resolves.toBeUndefined();
  });

  test('an undeclared status → unexpected-http-status', async () => {
    server.use(http.post('/api/v1/auth/logout', undeclaredStatus(500)));

    await expect(logout()).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: 'logout',
      reason: { kind: 'unexpected-http-status', status: 500 },
    });
  });
});
