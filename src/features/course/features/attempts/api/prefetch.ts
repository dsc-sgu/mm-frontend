import type { QueryClient } from '@tanstack/react-query';
import { attemptsPageQueries } from './queries';
import type { CourseId } from '@/features/course/model/identity';
import type { CourseAttemptsFilters } from '@/features/course/features/attempts/model/types';

export function prefetchAttemptsPage(
  client: QueryClient,
  input: { courseId: CourseId; filters: CourseAttemptsFilters }
) {
  void client.query(attemptsPageQueries(input).attempts).catch(() => {});
}
