import * as v from 'valibot';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserIdSchema, UsernameSchema } from '@/features/auth/model/identity';
import type { Session } from '@/features/auth/model/types';

const SessionDtoSchema = v.object({
  // mm-backend@ddd9849 does not return the user id from this endpoint yet;
  // the name follows `userID` of its login response.
  userID: UserIdSchema,
  avatarURL: v.string(),
  email: v.pipe(v.string(), v.email()),
  firstName: v.string(),
  lastName: v.string(),
  patronymic: v.string(),
  username: UsernameSchema,
  role: v.string(),
  sessionExpiresAt: v.string(), // TODO: change to date object
});

export type SessionOutcome =
  | { status: 'authorized'; session: Session }
  | { status: 'not-authorized' };

export function checkSession(signal?: AbortSignal): Promise<SessionOutcome> {
  return runHttpOperation(
    {
      name: 'check-session',
      url: '/api/v1/auth/session',
      credentials: 'include',
      signal,
    },
    async (context) => {
      if (context.response.status === 401) {
        return { status: 'not-authorized' };
      }
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);

      const { userID, ...dto } = await readJson(context, SessionDtoSchema);
      return { status: 'authorized', session: { userId: userID, ...dto } };
    }
  );
}
