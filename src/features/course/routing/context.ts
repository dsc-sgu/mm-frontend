import type { CourseAccessResult } from '@/features/course/features/access/model/types';
import type { CourseSummary } from '@/features/course/model/types';

export type AllowedCourseAccess = Extract<
  CourseAccessResult,
  { status: 'allowed' }
>;

export type CourseRouteContext = {
  courseSlug: string;
  courseAccess: AllowedCourseAccess;
  course?: CourseSummary;
};
