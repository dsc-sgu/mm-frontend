import type { QueryClient } from '@tanstack/react-query';
import { coursePageQueries, type CoursePageQueryInput } from './queries';

export function prefetchCoursePage(
  queryClient: QueryClient,
  input: CoursePageQueryInput
) {
  const queries = coursePageQueries(input);
  queryClient.query(queries.published).catch(() => undefined);
}
