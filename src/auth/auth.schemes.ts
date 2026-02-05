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

export const loginSchema = v.object({
  email: v.pipe(
    v.string('Email обязателен'),
    v.email('Введите корректный email')
  ),
  password: v.string('Пароль обязателен'),
});
export type LoginFormData = v.InferOutput<typeof loginSchema>;

export const registrationSchema = v.pipe(
  v.object({
    lastName: v.pipe(
      v.string('Фамилия обязательна'),
      v.minLength(2, 'Минимум 2 символа')
    ),
    firstName: v.pipe(
      v.string('Имя обязательно'),
      v.minLength(2, 'Минимум 2 символа')
    ),
    patronymic: v.optional(v.string()),
    username: v.pipe(
      v.string('Имя пользователя обязательно'),
      v.minLength(3, 'Минимум 3 символа'),
      v.regex(/^[a-zA-Z0-9_]+$/, 'Только латиница, цифры и подчеркивание')
    ),
    email: v.pipe(
      v.string('Email обязателен'),
      v.email('Введите корректный email')
    ),
    password: v.pipe(
      v.string('Пароль обязателен'),
      v.minLength(8, 'Минимум 8 символов'),
      v.regex(/[A-Z]/, 'Должна быть хотя бы одна заглавная буква'),
      v.regex(/[a-z]/, 'Должна быть хотя бы одна строчная буква'),
      v.regex(/[0-9]/, 'Должна быть хотя бы одна цифра')
    ),
    confirmPassword: v.string('Подтверждение пароля обязательно'),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (input) => input.password === input.confirmPassword,
      'Пароли не совпадают'
    ),
    ['confirmPassword']
  )
);
export type RegistrationFormData = v.InferOutput<typeof registrationSchema>;
