import type { CourseAccessResult } from './course-access.types';
import type { CourseSummary } from './course.types';

export type AllowedCourseAccess = Extract<
  CourseAccessResult,
  { status: 'allowed' }
>;

export type CourseRouteContext = {
  courseSlug: string;
  courseAccess: AllowedCourseAccess;
  course?: CourseSummary;
};
