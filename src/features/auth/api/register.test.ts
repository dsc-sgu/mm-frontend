import { describe, expect, test } from 'vitest';
import { seededUsers } from '@/app/mock-backend/state';
import { login } from '@/features/auth/api/login';
import { register, type RegisterInput } from '@/features/auth/api/register';

const newUser: RegisterInput = {
  email: 'new-student@example.com',
  firstName: 'Иван',
  lastName: 'Иванов',
  password: 'Password1',
  patronymic: '',
  username: 'new-student',
};

describe('TR-05: register', () => {
  test('201 → registered; the new user can sign in', async () => {
    await expect(register(newUser)).resolves.toBeUndefined();

    await expect(
      login({ email: newUser.email, password: newUser.password })
    ).resolves.toEqual({ status: 'signed-in' });
  });

  test('a taken username → the backend 500 stays unexpected-http-status', async () => {
    await expect(
      register({ ...newUser, username: seededUsers.mitStudent.username })
    ).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: 'register',
      reason: { kind: 'unexpected-http-status', status: 500 },
    });
  });
});
