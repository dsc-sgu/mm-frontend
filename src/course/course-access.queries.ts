import { queryOptions } from '@tanstack/react-query';
import { fetchCourseAccess } from './course-access.api.mock';

export const COURSE_ACCESS_QUERY_KEY = 'course-access';

// NOTE: In real code, this should not accept username as an input;
// instead, it should get the current user from the session.
// For now, though, this is fine.
export function courseAccessOptions({
  courseSlug,
  username,
}: {
  courseSlug: string;
  username: string;
}) {
  return queryOptions({
    queryKey: [COURSE_ACCESS_QUERY_KEY, courseSlug, username],
    queryFn: () => fetchCourseAccess({ courseSlug, username }),
    staleTime: 5 * 60 * 1000,
  });
}
