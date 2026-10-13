import { queryOptions } from '@tanstack/react-query';
import type { UserId, Username } from '@/features/auth/model/identity';
import type { AttemptNumber, CourseId } from '@/features/course/model/identity';
import { loadAttempt } from './load-attempt';

export const attemptLocatorKeys = {
  all: ['attempt-locator'] as const,
  byNumber: (
    userId: UserId,
    courseId: CourseId,
    taskId: string,
    username: Username,
    number: AttemptNumber
  ) =>
    [
      ...attemptLocatorKeys.all,
      userId,
      courseId,
      taskId,
      username,
      number,
    ] as const,
};

export function attemptLocatorOptions(
  userId: UserId,
  courseId: CourseId,
  taskId: string,
  username: Username,
  number: AttemptNumber
) {
  return queryOptions({
    queryKey: attemptLocatorKeys.byNumber(
      userId,
      courseId,
      taskId,
      username,
      number
    ),
    queryFn: ({ signal }) =>
      loadAttempt(courseId, taskId, username, number, signal),
    staleTime: 0,
    retry: false,
  });
}
