import { queryOptions } from '@tanstack/react-query';
import type { UserId, Username } from '@/features/auth/model/identity';
import type { CourseId } from '@/features/course/model/identity';
import { loadRepository } from './load-repository';

export const repositoryLocatorKeys = {
  all: ['repository-locator'] as const,
  byUsername: (userId: UserId, courseId: CourseId, username: Username) =>
    [...repositoryLocatorKeys.all, userId, courseId, username] as const,
};

export function repositoryLocatorOptions(
  userId: UserId,
  courseId: CourseId,
  username: Username
) {
  return queryOptions({
    queryKey: repositoryLocatorKeys.byUsername(userId, courseId, username),
    queryFn: ({ signal }) => loadRepository(courseId, username, signal),
    staleTime: 0,
    retry: false,
  });
}
