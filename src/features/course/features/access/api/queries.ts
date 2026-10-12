import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import type { CourseSlug } from '@/features/course/model/identity';
import { loadCourseBySlug, type LoadCourseResult } from './load-course';

// Slug is the lookup input, so this family is outside the CourseId prefix.
export const courseContextKeys = {
  all: ['course-context'] as const,
  bySlug: (userId: UserId, courseSlug: CourseSlug) =>
    [...courseContextKeys.all, userId, courseSlug] as const,
};

export function courseContextOptions(userId: UserId, courseSlug: CourseSlug) {
  return queryOptions({
    queryKey: courseContextKeys.bySlug(userId, courseSlug),
    queryFn: ({ signal }) => loadCourseBySlug(courseSlug, signal),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}

/**
 * A protected operation's access denial makes even inactive context suspect.
 * Discard a lookup started before that denial, invalidate only this identity
 * and locator, then await a fresh result. Denials resolve; technical failures
 * and cancellation reject, exactly as in the original lookup.
 */
export async function recheckCourseContextAfterAccessDenial(
  queryClient: QueryClient,
  userId: UserId,
  courseSlug: CourseSlug
): Promise<LoadCourseResult> {
  const queryKey = courseContextKeys.bySlug(userId, courseSlug);
  await queryClient.cancelQueries({ queryKey, exact: true });
  await queryClient.invalidateQueries({
    queryKey,
    exact: true,
    refetchType: 'none',
  });
  return queryClient.query(courseContextOptions(userId, courseSlug));
}
