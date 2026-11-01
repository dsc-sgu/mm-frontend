import * as v from 'valibot';
import { mockBackend } from '@/app/mock-backend/state';
import {
  getPublishedPage,
  setPublishedPage,
} from '@/app/mock-backend/page-documents';
import { CourseSlugSchema } from '@/features/course/model/identity';
import type {
  CoursePage,
  SaveCoursePageInput,
} from '@/features/course/features/page/model/types';

type CoursePageSummary = Omit<
  CoursePage,
  'description' | 'resources' | 'content' | 'taskSummaries'
>;

export async function saveCoursePage(
  input: SaveCoursePageInput
): Promise<CoursePage> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const currentCourse = mockBackend.state.courses.find(
    (c) => c.id === input.courseId
  );
  const currentPage = currentCourse ? getPublishedPage(currentCourse) : null;
  if (!currentPage || !currentCourse) {
    throw new Error(`Course page not found: ${input.courseId}`);
  }
  const nextCourseSummary: CoursePageSummary = {
    courseId: input.slug,
    title: input.title,
    shortTitle: input.shortTitle,
    color: input.color,
    iconName: input.iconName,
    teachers: currentPage.teachers,
  };
  const nextPage: CoursePage = {
    ...nextCourseSummary,
    teachers: currentPage.teachers,
    description: input.description,
    resources: input.resources ?? currentPage.resources,
    content: input.content,
    taskSummaries: currentPage.taskSummaries,
  };
  // Only card metadata and the route slug change. Stable Course identity and
  // every membership remain attached to the same canonical Course.
  Object.assign(currentCourse, {
    slug: v.parse(CourseSlugSchema, input.slug),
    title: input.title,
    shortTitle: input.shortTitle,
    color: input.color,
    iconName: input.iconName,
  });
  setPublishedPage(currentCourse, nextPage);
  return structuredClone(nextPage);
}
