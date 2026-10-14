import { apiPath } from '@/app/remote-data/api-path';
import {
  jsonBody,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';

export type RegisterInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  // The backend requires the field; an empty string means no patronymic.
  patronymic: string;
  username: string;
};

export function register(input: RegisterInput): Promise<void> {
  return runHttpOperation(
    {
      name: 'register',
      url: apiPath('auth', 'register'),
      method: 'POST',
      ...jsonBody(input),
    },
    async (context) => {
      // The body ({ id }) is not read: nothing uses it before sign-in.
      if (context.response.status !== 201) throw unexpectedHttpStatus(context);
    }
  );
}
