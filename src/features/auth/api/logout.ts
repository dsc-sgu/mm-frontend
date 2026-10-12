import { runHttpOperation, unexpectedHttpStatus } from '@/app/remote-data/http';

export function logout(): Promise<void> {
  return runHttpOperation(
    {
      name: 'logout',
      url: '/api/v1/auth/logout',
      method: 'POST',
      credentials: 'include',
    },
    async (context) => {
      // 401: the session has already ended, which is what logout asks for.
      if (context.response.status === 204 || context.response.status === 401) {
        return;
      }
      throw unexpectedHttpStatus(context);
    }
  );
}
