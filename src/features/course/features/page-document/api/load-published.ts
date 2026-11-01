import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';
import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import {
  CourseIdSchema,
  CourseSlugSchema,
  type CourseId,
} from '@/features/course/model/identity';
import {
  CourseColorSchema,
  CourseIconNameSchema,
} from '@/features/course/model/types';
import { UserRefSchema } from '@/features/auth/model/user-ref';
import { RichTextNodeSchema } from '@/features/course/model/rich-text';
import { GradeSchema } from '@/features/course/model/grade';
const summary = {
  taskId: v.string(),
  title: v.string(),
  description: v.optional(v.array(RichTextNodeSchema)),
  dueDate: v.optional(v.string()),
  maxGrade: v.optional(GradeSchema),
};
const unavailable = v.object({
  status: v.literal('unavailable'),
  taskId: v.string(),
});
const student = v.variant('status', [
  unavailable,
  v.object({ ...summary, status: v.literal('open') }),
  v.object({
    ...summary,
    status: v.literal('locked'),
    prerequisite: v.string(),
  }),
]);
const teacher = v.variant('status', [
  unavailable,
  v.object({ ...summary, status: v.literal('teacher') }),
]);
const metadata = {
  status: v.literal('found'),
  courseId: CourseIdSchema,
  slug: CourseSlugSchema,
  title: v.string(),
  shortTitle: v.string(),
  description: v.string(),
  color: CourseColorSchema,
  iconName: CourseIconNameSchema,
  teachers: v.array(UserRefSchema),
  resources: v.object({
    images: v.array(v.object({ id: v.string(), src: v.string() })),
    files: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        href: v.string(),
        size: v.optional(v.string()),
        mimeType: v.optional(v.string()),
      })
    ),
  }),
  content: v.array(
    v.object({
      id: v.pipe(v.string(), v.nonEmpty()),
      version: v.pipe(v.number(), v.integer(), v.minValue(1)),
      type: v.unknown(),
      data: v.unknown(),
    })
  ),
};
const PublishedPageSchema = v.variant('role', [
  v.object({
    ...metadata,
    role: v.literal('student'),
    taskSummaries: v.array(student),
  }),
  v.object({
    ...metadata,
    role: v.literal('teacher'),
    taskSummaries: v.array(teacher),
  }),
]);
export type PublishedPage = v.InferOutput<typeof PublishedPageSchema>;
export function loadPublishedPage(
  courseId: CourseId,
  signal?: AbortSignal
): Promise<PublishedPage | ResourceDenial> {
  return runHttpOperation(
    {
      name: 'load-published-page',
      url: apiPath('courses', courseId, 'page'),
      credentials: 'include',
      signal,
    },
    async (context) => {
      const denial = readResourceDenial(context);
      if (denial) return denial;
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      return readJson(context, PublishedPageSchema);
    }
  );
}
