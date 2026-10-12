import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { mockBackend, seededUsers } from '@/app/mock-backend/state';
import { login } from '@/features/auth/api/login';

describe('TR-05: login', () => {
  test('200 → signed-in, and the session belongs to the user', async () => {
    const { mitStudent } = seededUsers;

    await expect(
      login({ email: mitStudent.email, password: mitStudent.password })
    ).resolves.toEqual({ status: 'signed-in' });
    expect(mockBackend.state.session?.userId).toBe(mitStudent.id);
  });

  test('400 → invalid-credentials, as data rather than a failure', async () => {
    mockBackend.state.session = null;

    await expect(
      login({ email: seededUsers.mitStudent.email, password: 'wrong' })
    ).resolves.toEqual({ status: 'invalid-credentials' });
    expect(mockBackend.state.session).toBeNull();
  });

  test('an undeclared status → unexpected-http-status', async () => {
    server.use(http.post('/api/v1/auth/login', undeclaredStatus(500)));

    await expect(
      login({ email: 'user@example.com', password: 'secret' })
    ).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: 'login',
      reason: { kind: 'unexpected-http-status', status: 500 },
    });
  });
});
