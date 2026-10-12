import * as v from 'valibot';

export const UserIdSchema = v.pipe(v.string(), v.uuid(), v.brand('UserId'));

export const UsernameSchema = v.pipe(
  v.string('Имя пользователя обязательно'),
  v.minLength(3, 'Минимум 3 символа'),
  v.regex(/^[A-Za-z0-9_-]+$/, 'Только латиница, цифры, подчёркивание и дефис'),
  v.toLowerCase(),
  v.brand('Username')
);

export type UserId = v.InferOutput<typeof UserIdSchema>;
export type Username = v.InferOutput<typeof UsernameSchema>;
