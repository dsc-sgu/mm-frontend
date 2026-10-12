import type { LoadCourseResult } from '@/features/course/features/access/api/load-course';
import type { CourseSlug } from '@/features/course/model/identity';

type FoundCourse = Extract<LoadCourseResult, { status: 'found' }>;

export type CourseRouteContext = {
  courseSlug: CourseSlug;
  course: FoundCourse['course'];
  courseRole: FoundCourse['role'];
};
