import type { QueryClient } from '@tanstack/react-query';
import { courseAttemptsQueryOptions } from './queries';
import type { LoadCourseAttemptsInput } from './load-course-attempts';
export const attemptsPageQueries = (input: LoadCourseAttemptsInput) => ({
  attempts: courseAttemptsQueryOptions(input),
});
export function prefetchAttemptsPage(
  client: QueryClient,
  input: LoadCourseAttemptsInput
) {
  void client.query(attemptsPageQueries(input).attempts).catch(() => {});
}
