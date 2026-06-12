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

export type CoursePageEditValidationErrors = {
  title?: string;
  courseId?: string;
  description?: string;
};

export type CoursePageEditValidationInput = {
  title: string;
  courseId: string;
  description: string;
};

const courseSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateCoursePageEdit(
  input: CoursePageEditValidationInput
): CoursePageEditValidationErrors {
  const errors: CoursePageEditValidationErrors = {};

  if (input.title.trim().length === 0) {
    errors.title = 'Введите название курса.';
  }

  if (input.courseId.trim().length === 0) {
    errors.courseId = 'Введите slug курса.';
  } else if (!courseSlugPattern.test(input.courseId)) {
    errors.courseId =
      'Slug может содержать только строчные латинские буквы, цифры и дефисы.';
  }

  if (input.description.trim().length === 0) {
    errors.description = 'Введите описание курса.';
  }

  return errors;
}

export function hasCoursePageEditErrors(
  errors: CoursePageEditValidationErrors
) {
  return Object.values(errors).some(Boolean);
}
