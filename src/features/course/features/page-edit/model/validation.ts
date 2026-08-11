import * as v from 'valibot';

import type {
  CourseColor,
  LucideIconName,
} from '@/features/course/model/types';

export const COURSE_EDIT_ICON_OPTIONS = [
  'book-open',
  'braces',
  'brain-cog',
  'code-xml',
  'cpu',
  'database',
  'graduation-cap',
  'monitor-smartphone',
  'network',
  'rocket',
] as const satisfies readonly LucideIconName[];

export const COURSE_EDIT_COLOR_OPTIONS = [
  'blue',
  'teal',
  'violet',
  'pink',
  'red',
  'orange',
  'green',
] as const satisfies readonly CourseColor[];

export const coursePageEditSchema = v.object({
  title: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Введите название курса.')
  ),
  shortTitle: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Введите короткое название курса.')
  ),
  courseId: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Введите slug курса.'),
    v.regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug может содержать только строчные латинские буквы, цифры и дефисы.'
    )
  ),
  description: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Введите описание курса.')
  ),
});

export type CoursePageEditValidationErrors = {
  title?: string;
  shortTitle?: string;
  courseId?: string;
  description?: string;
};

export type CoursePageEditValidationInput = v.InferInput<
  typeof coursePageEditSchema
>;

export function validateCoursePageEdit(
  input: CoursePageEditValidationInput
): CoursePageEditValidationErrors {
  const result = v.safeParse(coursePageEditSchema, input);

  if (result.success) {
    return {};
  }

  const nestedErrors = v.flatten<typeof coursePageEditSchema>(
    result.issues
  ).nested;

  return {
    title: nestedErrors?.title?.[0],
    shortTitle: nestedErrors?.shortTitle?.[0],
    courseId: nestedErrors?.courseId?.[0],
    description: nestedErrors?.description?.[0],
  };
}

export function hasCoursePageEditErrors(
  errors: CoursePageEditValidationErrors
) {
  return Object.values(errors).some(Boolean);
}
