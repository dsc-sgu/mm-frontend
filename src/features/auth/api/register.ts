import {
  jsonBody,
  runHttpOperation,
  unexpectedHttp,
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
      url: '/api/v1/auth/register',
      method: 'POST',
      ...jsonBody(input),
    },
    async (context) => {
      if (context.response.status !== 201) throw unexpectedHttp(context);
    }
  );
}
