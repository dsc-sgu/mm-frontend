import { redirect } from '@tanstack/react-router';
import type { CourseRole } from '@/features/course/features/access/model/types';
import type { CourseSlug } from '@/features/course/model/identity';

// Section policy remains a redirect until ACC1.3; identity and membership
// have already been confirmed by the Course root.
export function requireCourseRole({
  courseSlug,
  courseRole,
  roles,
  redirectTo = '/courses/$courseSlug',
}: {
  courseSlug: CourseSlug;
  courseRole: CourseRole;
  roles: CourseRole[];
  redirectTo?: '/courses/$courseSlug' | '/courses/$courseSlug/repositories';
}) {
  if (!roles.includes(courseRole)) {
    throw redirect({
      to: redirectTo,
      params: { courseSlug },
    });
  }
}
