import * as v from 'valibot';

export const CourseIdSchema = v.pipe(v.string(), v.uuid(), v.brand('CourseId'));

export const CourseSlugSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  v.brand('CourseSlug')
);

export const AttemptIdSchema = v.pipe(
  v.string(),
  v.uuid(),
  v.brand('AttemptId')
);

export const AttemptNumberSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.brand('AttemptNumber')
);

export type CourseId = v.InferOutput<typeof CourseIdSchema>;
export type CourseSlug = v.InferOutput<typeof CourseSlugSchema>;
export type AttemptId = v.InferOutput<typeof AttemptIdSchema>;
export type AttemptNumber = v.InferOutput<typeof AttemptNumberSchema>;
