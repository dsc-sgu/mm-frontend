import { queryOptions } from '@tanstack/react-query';
import type { UserId, Username } from '@/features/auth/model/identity';
import type { CourseId } from '@/features/course/model/identity';
import { courseKeys } from '@/features/course/api/queries';
import { loadRepository } from './load-repository';

// The username is the locator's lookup input, like a slug for Course context.
export const repositoryLocatorKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'repository-locator'] as const,
  byUsername: (userId: UserId, courseId: CourseId, username: Username) =>
    [...repositoryLocatorKeys.course(courseId), userId, username] as const,
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
