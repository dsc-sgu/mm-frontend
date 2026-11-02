import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UsernameSchema } from '@/features/auth/model/identity';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';
import type { PublishedCoursePage } from '@/features/course/features/page/model/types';
import { readDocument } from '@/features/course/features/page-document/model/document';
import { GradeSchema } from '@/features/course/model/grade';
import {
  CourseIdSchema,
  CourseSlugSchema,
  type CourseId,
} from '@/features/course/model/identity';
import { RichTextNodeSchema } from '@/features/course/model/rich-text';
import {
  CourseColorSchema,
  CourseIconNameSchema,
} from '@/features/course/model/types';

const TeacherSchema = v.object({
  username: UsernameSchema,
  firstName: v.string(),
  lastName: v.string(),
  patronymic: v.optional(v.nullable(v.string())),
});

const ResourceSchema = v.object({
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
});

const TaskSummaryDataSchema = v.object({
  taskId: v.string(),
  title: v.string(),
  description: v.optional(v.array(RichTextNodeSchema)),
  dueDate: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  maxGrade: v.optional(GradeSchema),
});

const StudentTaskSummarySchema = v.variant('status', [
  v.object({ status: v.literal('unavailable'), taskId: v.string() }),
  v.object({
    status: v.literal('open'),
    ...TaskSummaryDataSchema.entries,
  }),
  v.object({
    status: v.literal('locked'),
    prerequisite: v.string(),
    ...TaskSummaryDataSchema.entries,
  }),
]);

const TeacherTaskSummarySchema = v.variant('status', [
  v.object({ status: v.literal('unavailable'), taskId: v.string() }),
  v.object({
    status: v.literal('teacher'),
    ...TaskSummaryDataSchema.entries,
  }),
]);

const PublishedBlockSchema = v.object({
  id: v.string(),
  type: v.string(),
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
  data: v.unknown(),
});

const PublishedPageSchema = v.intersect([
  v.object({
    courseId: CourseIdSchema,
    slug: CourseSlugSchema,
    title: v.string(),
    shortTitle: v.string(),
    description: v.string(),
    color: CourseColorSchema,
    iconName: CourseIconNameSchema,
    teachers: v.array(TeacherSchema),
    resources: ResourceSchema,
    blocks: v.array(PublishedBlockSchema),
  }),
  v.variant('viewerRole', [
    v.object({
      viewerRole: v.literal('student'),
      taskSummaries: v.array(StudentTaskSummarySchema),
    }),
    v.object({
      viewerRole: v.literal('teacher'),
      taskSummaries: v.array(TeacherTaskSummarySchema),
    }),
  ]),
]);

export type LoadPublishedCoursePageResult =
  | { status: 'found'; page: PublishedCoursePage }
  | ResourceDenial;

export function loadPublishedCoursePage(
  courseId: CourseId,
  signal?: AbortSignal
): Promise<LoadPublishedCoursePageResult> {
  return runHttpOperation<LoadPublishedCoursePageResult>(
    {
      name: 'load-published-course-page',
      url: apiPath('courses', courseId, 'page', 'published'),
      credentials: 'include',
      signal,
    },
    async (context) => {
      const denial = readResourceDenial(context);
      if (denial) {
        return denial;
      }
      if (context.response.status !== 200) {
        throw unexpectedHttpStatus(context);
      }
      const dto = await readJson(context, PublishedPageSchema);
      return {
        status: 'found',
        page: {
          courseId: dto.courseId,
          slug: dto.slug,
          title: dto.title,
          shortTitle: dto.shortTitle,
          description: dto.description,
          color: dto.color,
          iconName: dto.iconName,
          teachers: dto.teachers,
          resources: dto.resources,
          taskSummaries: dto.taskSummaries,
          content: readDocument(dto.blocks).map((block, index) => ({
            ...block,
            version: dto.blocks[index].version,
          })),
        },
      };
    }
  );
}
