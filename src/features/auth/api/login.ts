import { apiPath } from '@/app/remote-data/api-path';
import {
  jsonBody,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginOutcome =
  | { status: 'signed-in' }
  | { status: 'invalid-credentials' };

export function login(input: LoginInput): Promise<LoginOutcome> {
  return runHttpOperation(
    {
      name: 'login',
      url: apiPath('auth', 'login'),
      method: 'POST',
      credentials: 'include',
      ...jsonBody(input),
    },
    async (context) => {
      if (context.response.status === 400) {
        return { status: 'invalid-credentials' };
      }
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);

      // The body is not read: the session check reports who signed in.
      return { status: 'signed-in' };
    }
  );
}
