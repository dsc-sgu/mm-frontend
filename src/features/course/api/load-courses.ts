import * as v from 'valibot';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UsernameSchema } from '@/features/auth/model/identity';
import {
  CourseIdSchema,
  CourseSlugSchema,
} from '@/features/course/model/identity';
import {
  CourseColorSchema,
  CourseIconNameSchema,
  type CourseSummary,
} from '@/features/course/model/types';

const CourseDtoSchema = v.object({
  id: CourseIdSchema,
  slug: CourseSlugSchema,
  title: v.string(),
  shortTitle: v.string(),
  iconName: CourseIconNameSchema,
  color: CourseColorSchema,
  teachers: v.array(
    v.object({
      firstName: v.string(),
      lastName: v.string(),
      patronymic: v.optional(v.nullable(v.string())),
      username: UsernameSchema,
    })
  ),
});

const CoursesDtoSchema = v.array(CourseDtoSchema);

/** The only declared outcome is the current user's validated course list. */
export function loadCourses(signal?: AbortSignal): Promise<CourseSummary[]> {
  return runHttpOperation(
    {
      name: 'load-courses',
      url: '/api/v1/courses',
      credentials: 'include',
      signal,
    },
    async (context) => {
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      return readJson(context, CoursesDtoSchema);
    }
  );
}
