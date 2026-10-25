import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import type { UserId } from '@/features/auth/model/identity';
import { courseKeys } from '@/features/course/api/queries';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import {
  loadAttemptHistory,
  type LoadAttemptHistoryResult,
} from './load-attempt-history';
import { markAttemptUpdatesSeen } from './mark-updates-seen';
import { fetchTaskPage } from './mock';

/**
 * ['course', courseId, 'task', taskId]
 * ├── 'page'
 * └── 'student', studentId
 *     └── 'attempt-history', viewerId
 *
 * `viewerId` comes last, so a prefix without it invalidates every viewer.
 */
export const taskKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'task'] as const,
  task: (courseId: CourseId, taskId: string) =>
    [...taskKeys.course(courseId), taskId] as const,
  page: (courseId: CourseId, taskId: string) =>
    [...taskKeys.task(courseId, taskId), 'page'] as const,
  student: (courseId: CourseId, taskId: string, studentId: UserId) =>
    [...taskKeys.task(courseId, taskId), 'student', studentId] as const,
  attemptHistory: (
    viewerId: UserId,
    courseId: CourseId,
    taskId: string,
    studentId: UserId
  ) =>
    [
      ...taskKeys.student(courseId, taskId, studentId),
      'attempt-history',
      viewerId,
    ] as const,
};

export function taskOptions(courseId: CourseId, taskId: string) {
  return queryOptions({
    queryKey: taskKeys.page(courseId, taskId),
    queryFn: () => fetchTaskPage({ courseId, taskId }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function attemptHistoryOptions(
  viewerId: UserId,
  courseId: CourseId,
  taskId: string,
  studentId: UserId
) {
  return queryOptions({
    queryKey: taskKeys.attemptHistory(viewerId, courseId, taskId, studentId),
    queryFn: ({ signal }) =>
      loadAttemptHistory(courseId, taskId, studentId, signal),
    staleTime: 30 * 1000,
  });
}

export type TaskPageInput = {
  viewerId: UserId;
  courseId: CourseId;
  taskId: string;
  /** The Student whose history the page shows; null for the Teacher view. */
  studentId: UserId | null;
};

/** Every read of the Task page; the page and its prefetch share it. */
export function taskPageQueries({
  viewerId,
  courseId,
  taskId,
  studentId,
}: TaskPageInput) {
  return {
    task: taskOptions(courseId, taskId),
    attemptHistory:
      studentId === null
        ? null
        : attemptHistoryOptions(viewerId, courseId, taskId, studentId),
  };
}

type AttemptUpdatesInput = {
  viewerId: UserId;
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptId: AttemptId;
};

/**
 * Marks the Attempt's updates seen at once: the dot must go out as the Student
 * opens the Attempt, and the transition is unambiguous and reversible.
 */
export function useMarkAttemptUpdatesSeenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, attemptId }: AttemptUpdatesInput) =>
      markAttemptUpdatesSeen(courseId, attemptId),
    onMutate: async ({ viewerId, courseId, taskId, studentId, attemptId }) => {
      const queryKey = taskKeys.attemptHistory(
        viewerId,
        courseId,
        taskId,
        studentId
      );
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<LoadAttemptHistoryResult>(queryKey);

      queryClient.setQueryData<LoadAttemptHistoryResult>(queryKey, (data) => {
        if (data?.status !== 'found') {
          return data;
        }
        return {
          ...data,
          attempts: data.attempts.map((attempt) =>
            attempt.id === attemptId ? { ...attempt, updates: 'seen' } : attempt
          ),
        };
      });

      return { previousData, queryKey };
    },
    onError: (_error, _input, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, { courseId, taskId, studentId }) =>
      queryClient.invalidateQueries({
        queryKey: taskKeys.student(courseId, taskId, studentId),
      }),
  });
}
