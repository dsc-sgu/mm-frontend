import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchCourses } from './course.api.mock';

export const COURSES_QUERY_KEY = ['courses'];

export const COURSES_QUERY_OPTIONS = queryOptions({
  queryKey: COURSES_QUERY_KEY,
  queryFn: fetchCourses,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
});

export function useCoursesQuery() {
  return useQuery(COURSES_QUERY_OPTIONS);
}
