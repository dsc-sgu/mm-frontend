import { notFound } from '@tanstack/react-router';
import * as v from 'valibot';
import { UsernameSchema } from '@/features/auth/model/identity';
import {
  AttemptNumberSchema,
  CourseSlugSchema,
} from '@/features/course/model/identity';

export const courseSlugParamSchema = CourseSlugSchema;
export const usernameParamSchema = UsernameSchema;

export const positiveIntegerParamSchema = v.pipe(
  v.string(),
  v.regex(/^[1-9]\d*$/),
  v.transform(Number),
  v.integer(),
  v.maxValue(Number.MAX_SAFE_INTEGER)
);

const attemptNumberParamSchema = v.pipe(
  positiveIntegerParamSchema,
  AttemptNumberSchema
);

export function parseCourseSlug(courseSlug: string) {
  const result = v.safeParse(courseSlugParamSchema, courseSlug);
  return result.success ? result.output : null;
}

export function requireCourseSlug(courseSlug: string) {
  const parsed = parseCourseSlug(courseSlug);
  if (parsed === null) throw notFound({ data: 'course-lookup' });
  return parsed;
}

export function requireUsername(studentUsername: string) {
  const result = v.safeParse(usernameParamSchema, studentUsername);
  if (!result.success) {
    throw notFound();
  }

  return result.output;
}

export function requirePositiveInteger(value: string) {
  const result = v.safeParse(positiveIntegerParamSchema, value);
  if (!result.success) {
    throw notFound();
  }

  return result.output;
}

export function requireAttemptNumber(attemptNumber: string) {
  const result = v.safeParse(attemptNumberParamSchema, attemptNumber);
  if (!result.success) {
    throw notFound();
  }

  return result.output;
}
