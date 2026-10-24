import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import {
  CourseIdSchema,
  type CourseId,
  type CourseSlug,
} from '@/features/course/model/identity';
import {
  CourseColorSchema,
  CourseIconNameSchema,
} from '@/features/course/model/types';

const FoundCourseSchema = v.object({
  status: v.literal('found'),
  course: v.object({
    id: CourseIdSchema,
    title: v.string(),
    shortTitle: v.string(),
    iconName: CourseIconNameSchema,
    color: CourseColorSchema,
  }),
  role: v.picklist(['student', 'teacher']),
});

/** A missing Course and a Course without Membership are one outcome. */
export type LoadCourseResult =
  | v.InferOutput<typeof FoundCourseSchema>
  | { status: 'not-found' };

/** Looks up shell identity and membership without loading Course Page content. */
export function loadCourse(
  locator: CourseId | CourseSlug,
  signal?: AbortSignal
): Promise<LoadCourseResult> {
  return runHttpOperation<LoadCourseResult>(
    {
      name: 'load-course',
      url: apiPath('courses', locator),
      credentials: 'include',
      signal,
    },
    async (context) => {
      switch (context.response.status) {
        case 200:
          return readJson(context, FoundCourseSchema);
        case 404:
          return { status: 'not-found' };
        default:
          throw unexpectedHttpStatus(context);
      }
    }
  );
}
