import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { UserId } from '@/features/auth/model/identity';
import { courseKeys } from '@/features/course/api/queries';
import type { TaskPageData } from '@/features/course/features/task/model/types';
import type { CourseId } from '@/features/course/model/identity';
import { fetchTaskPage, markTaskAttemptUpdatesSeen } from './mock';

type TaskPageParams = {
  courseId: CourseId;
  taskId: string;
  /** The Student whose attempts the page shows; null for the Teacher view. */
  studentId: UserId | null;
};

export const taskPageKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'task-page'] as const,
  detail: ({ courseId, taskId, studentId }: TaskPageParams) =>
    [...taskPageKeys.course(courseId), taskId, studentId] as const,
};

export function taskPageQueryOptions(params: TaskPageParams) {
  return queryOptions({
    queryKey: taskPageKeys.detail(params),
    queryFn: () => fetchTaskPage(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useTaskPageQuery(params: TaskPageParams) {
  return useQuery(taskPageQueryOptions(params));
}

export function useMarkTaskAttemptUpdatesSeenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markTaskAttemptUpdatesSeen,
    onMutate: async (variables) => {
      const queryKey = taskPageKeys.detail(variables);

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
              attempt.attemptNumber === variables.attemptNumber
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
        queryKey: taskPageKeys.detail(variables),
      }),
  });
}
