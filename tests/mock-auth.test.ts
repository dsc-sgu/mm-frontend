import { expect, test } from 'bun:test';

import { fetchSession } from '@/features/auth/api/mock';

test('mock auth starts with the teacher session already authorized', async () => {
  const session = await fetchSession();

  expect(session).toEqual({
    status: 'AUTHORIZED',
    session: expect.objectContaining({
      email: 'mit-teacher@example.com',
      username: 'mit-teacher',
    }),
  });
});
