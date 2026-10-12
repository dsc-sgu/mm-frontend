import * as v from 'valibot';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
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
import type {
  CourseSummary,
  LucideIconName,
} from '@/features/course/model/types';

const CourseDtoSchema = v.object({
  id: CourseIdSchema,
  slug: CourseSlugSchema,
  title: v.string(),
  shortTitle: v.string(),
  iconName: v.custom<LucideIconName>(
    (input) =>
      typeof input === 'string' && Object.hasOwn(dynamicIconImports, input)
  ),
  color: v.picklist([
    'blue',
    'teal',
    'violet',
    'pink',
    'red',
    'orange',
    'green',
  ]),
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
