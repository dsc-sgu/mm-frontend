import type { QueryClient } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import { coursesQueryOptions } from '@/features/course/api/queries';
import { deadlinesQueryOptions } from '@/features/deadlines-calendar/api/queries';

export function dashboardQueries(userId: UserId, date = new Date()) {
  return {
    courses: coursesQueryOptions(userId),
    deadlines: deadlinesQueryOptions(date),
  };
}

export function prefetchDashboard(queryClient: QueryClient, userId: UserId) {
  const queries = dashboardQueries(userId);
  const ignore = () => undefined;

  queryClient.query(queries.courses).catch(ignore);
  queryClient.query(queries.deadlines).catch(ignore);
}
