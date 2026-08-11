import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { TaskPageData } from '@/features/course/features/task/model/types';
import { fetchTaskPage, markTaskAttemptUpdatesSeen } from './mock';

const TASK_PAGE_QUERY_KEY = ['course-task-page'] as const;

export const taskPageKeys = {
  all: TASK_PAGE_QUERY_KEY,
  detail: (courseSlug: string, taskId: string, studentUsername?: string) =>
    [
      ...TASK_PAGE_QUERY_KEY,
      courseSlug,
      taskId,
      studentUsername ?? null,
    ] as const,
};

export function taskPageQueryOptions({
  courseSlug,
  taskId,
  studentUsername,
}: {
  courseSlug: string;
  taskId: string;
  studentUsername?: string;
}) {
  return queryOptions({
    queryKey: taskPageKeys.detail(courseSlug, taskId, studentUsername),
    queryFn: () => fetchTaskPage({ courseSlug, taskId, studentUsername }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useTaskPageQuery({
  courseSlug,
  taskId,
  studentUsername,
}: {
  courseSlug: string;
  taskId: string;
  studentUsername?: string;
}) {
  return useQuery(
    taskPageQueryOptions({ courseSlug, taskId, studentUsername })
  );
}

export function useMarkTaskAttemptUpdatesSeenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markTaskAttemptUpdatesSeen,
    onMutate: async (variables) => {
      const queryKey = taskPageKeys.detail(
        variables.courseSlug,
        variables.taskId,
        variables.studentUsername
      );

      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<TaskPageData | null>(
        queryKey
      );

      queryClient.setQueryData<TaskPageData | null>(queryKey, (currentData) => {
        if (!currentData) {
          return currentData;
        }

        return {
          ...currentData,
          task: {
            ...currentData.task,
            attempts: currentData.task.attempts.map((attempt) =>
              attempt.number === variables.attemptNumber &&
              attempt.studentUsername === variables.studentUsername
                ? { ...attempt, attention: { status: 'seen' } }
                : attempt
            ),
          },
        };
      });

      return { previousData, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, variables) =>
      queryClient.invalidateQueries({
        queryKey: taskPageKeys.detail(
          variables.courseSlug,
          variables.taskId,
          variables.studentUsername
        ),
      }),
  });
}
