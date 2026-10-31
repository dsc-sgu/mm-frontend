import * as v from 'valibot';
import { FullNameSchema } from './full-name';
import { UserIdSchema, UsernameSchema } from './identity';

export const UserRefSchema = v.object({
  id: UserIdSchema,
  username: UsernameSchema,
  ...FullNameSchema.entries,
});

export type UserRef = v.InferOutput<typeof UserRefSchema>;
