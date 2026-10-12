import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { seededUsers } from '@/app/mock-backend/state';
import { reply } from '@/app/testing/reply';
import { login } from '@/features/auth/api/login';
import { register, type RegisterInput } from '@/features/auth/api/register';

const REGISTER_URL = '/api/v1/auth/register';

const newUser: RegisterInput = {
  email: 'new-student@example.com',
  firstName: 'Иван',
  lastName: 'Иванов',
  password: 'Password1',
  patronymic: '',
  username: 'new-student',
};

describe('TR-05: register statuses', () => {
  test('201 → registered', async () => {
    server.use(
      http.post(
        REGISTER_URL,
        reply(201, { id: '00000000-0000-4000-8000-0000000000aa' })
      )
    );

    await expect(register(newUser)).resolves.toBeUndefined();
  });

  test.each([200, 204, 409, 422, 500])(
    'undeclared %i → unexpected-http-status',
    async (status) => {
      server.use(http.post(REGISTER_URL, undeclaredStatus(status)));

      await expect(register(newUser)).rejects.toMatchObject({
        name: 'OperationFailure',
        operation: 'register',
        reason: { kind: 'unexpected-http-status', status },
      });
    }
  );
});

describe('register against the mock backend', () => {
  test('the new user can sign in', async () => {
    await register(newUser);

    await expect(
      login({ email: newUser.email, password: newUser.password })
    ).resolves.toEqual({ status: 'signed-in' });
  });

  test('a taken username fails as the backend does, with 500', async () => {
    await expect(
      register({ ...newUser, username: seededUsers.mitStudent.username })
    ).rejects.toMatchObject({
      reason: { kind: 'unexpected-http-status', status: 500 },
    });
  });
});
