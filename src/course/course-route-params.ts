import { redirect } from '@tanstack/react-router';
import * as v from 'valibot';

const slugLikeSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
);

export const courseSlugParamSchema = slugLikeSchema;
export const studentUsernameParamSchema = slugLikeSchema;

export const positiveIntegerParamSchema = v.pipe(
  v.string(),
  v.regex(/^[1-9]\d*$/),
  v.transform(Number)
);

export function parseCourseSlugParam(courseSlug: string) {
  const result = v.safeParse(courseSlugParamSchema, courseSlug);
  if (!result.success) {
    throw redirect({ to: '/' });
  }

  return result.output;
}

export function parseStudentUsernameParam({
  studentUsername,
  courseSlug,
}: {
  studentUsername: string;
  courseSlug: string;
}) {
  const result = v.safeParse(studentUsernameParamSchema, studentUsername);
  if (!result.success) {
    throw redirect({
      to: '/courses/$courseSlug',
      params: { courseSlug },
    });
  }

  return result.output;
}

export function parsePositiveIntegerParam({
  value,
  courseSlug,
}: {
  value: string;
  courseSlug: string;
}) {
  const result = v.safeParse(positiveIntegerParamSchema, value);
  if (!result.success) {
    throw redirect({
      to: '/courses/$courseSlug',
      params: { courseSlug },
    });
  }

  return result.output;
}
