import * as v from 'valibot';

// TODO: check this
export const SessionScheme = v.object({
  avatarURL: v.string(),
  email: v.pipe(v.string(), v.email()),
  firstName: v.string(),
  lastName: v.string(),
  patronymic: v.string(),
  username: v.string(),
  role: v.string(),
  sessionExpiresAt: v.string(), // TODO: change to date object
});

export type Session = v.InferOutput<typeof SessionScheme>;
