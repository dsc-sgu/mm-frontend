import * as v from 'valibot';

export const UserIdSchema = v.pipe(v.string(), v.uuid(), v.brand('UserId'));

export const UsernameSchema = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.brand('Username')
);

export type UserId = v.InferOutput<typeof UserIdSchema>;
export type Username = v.InferOutput<typeof UsernameSchema>;
