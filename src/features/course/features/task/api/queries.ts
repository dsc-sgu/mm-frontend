import { queryOptions, useQuery } from '@tanstack/react-query';

import { fetchCourseTaskPage } from '@/features/course/features/task/api/mock';

export const COURSE_TASK_PAGE_QUERY_KEY = 'course-task-page';

export function courseTaskPageQueryOptions({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}) {
  return queryOptions({
    queryKey: [COURSE_TASK_PAGE_QUERY_KEY, courseSlug, taskId],
    queryFn: () => fetchCourseTaskPage({ courseSlug, taskId }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCourseTaskPageQuery({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}) {
  return useQuery(courseTaskPageQueryOptions({ courseSlug, taskId }));
}
