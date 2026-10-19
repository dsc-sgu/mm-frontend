import * as v from 'valibot';

// Contracts carry the parts of a User's name; only the frontend joins them.
export const FullNameSchema = v.object({
  lastName: v.string(),
  firstName: v.string(),
  // A patronymic is always optional. The backend sends an empty string or
  // omits the field; both mean that the User has none.
  patronymic: v.optional(
    v.pipe(
      v.string(),
      v.transform((patronymic) => patronymic || undefined)
    )
  ),
});

export type FullName = v.InferOutput<typeof FullNameSchema>;

/** The one order a person is shown in: «Фамилия Имя Отчество». */
export function formatFullName({
  lastName,
  firstName,
  patronymic,
}: FullName): string {
  return [lastName, firstName, patronymic].filter(Boolean).join(' ');
}
