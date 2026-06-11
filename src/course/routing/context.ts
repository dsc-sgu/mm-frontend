import type { CourseAccessResult } from '@/course/access/model/types';
import type { CourseSummary } from '@/course/model/types';

export type AllowedCourseAccess = Extract<
  CourseAccessResult,
  { status: 'allowed' }
>;

export type CourseRouteContext = {
  courseSlug: string;
  courseAccess: AllowedCourseAccess;
  course?: CourseSummary;
};
