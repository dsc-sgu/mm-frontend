import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchCoursePage } from './course-page.api.mock';

export const COURSE_PAGE_QUERY_KEY = 'course-page';

export function coursePageQueryOptions(courseSlug: string) {
  return queryOptions({
    queryKey: [COURSE_PAGE_QUERY_KEY, courseSlug],
    queryFn: () => fetchCoursePage(courseSlug),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCoursePageQuery(courseSlug: string) {
  return useQuery(coursePageQueryOptions(courseSlug));
}
