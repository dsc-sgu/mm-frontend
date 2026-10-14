import { queryOptions } from '@tanstack/react-query';
import type { UserId, Username } from '@/features/auth/model/identity';
import type { AttemptNumber, CourseId } from '@/features/course/model/identity';
import { courseKeys } from '@/features/course/api/queries';
import { loadAttempt } from './load-attempt';

// The username is the locator's lookup input, like a slug for Course context.
export const attemptLocatorKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'attempt-locator'] as const,
  byNumber: (
    userId: UserId,
    courseId: CourseId,
    taskId: string,
    username: Username,
    number: AttemptNumber
  ) =>
    [
      ...attemptLocatorKeys.course(courseId),
      userId,
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
