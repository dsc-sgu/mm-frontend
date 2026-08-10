import { queryOptions, useQuery } from '@tanstack/react-query';

import { fetchTaskPage } from './mock';

const TASK_PAGE_QUERY_KEY = ['course-task-page'] as const;

export const taskPageKeys = {
  all: TASK_PAGE_QUERY_KEY,
  detail: (courseSlug: string, taskId: string) =>
    [...TASK_PAGE_QUERY_KEY, courseSlug, taskId] as const,
};

export function taskPageQueryOptions({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}) {
  return queryOptions({
    queryKey: taskPageKeys.detail(courseSlug, taskId),
    queryFn: () => fetchTaskPage({ courseSlug, taskId }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useTaskPageQuery({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}) {
  return useQuery(taskPageQueryOptions({ courseSlug, taskId }));
}
