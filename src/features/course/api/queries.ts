import { queryOptions, useQuery } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import { loadCourses } from '@/features/course/api/load-courses';
import type { CourseId } from '@/features/course/model/identity';

// The list's input is the User, so it stays outside the Course prefix.
export const coursesKeys = {
  all: ['courses'] as const,
  user: (userId: UserId) => [...coursesKeys.all, userId] as const,
};

/**
 * The Course prefix. Every course-scoped family extends `byId`, so losing a
 * Course, or the session that reached it, drops all of its cache in one call.
 * The stable CourseId survives a slug change; the slug never enters a key.
 */
export const courseKeys = {
  all: ['course'] as const,
  byId: (courseId: CourseId) => [...courseKeys.all, courseId] as const,
};

export function coursesQueryOptions(userId: UserId) {
  return queryOptions({
    queryKey: coursesKeys.user(userId),
    queryFn: ({ signal }) => loadCourses(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useCoursesQuery(userId: UserId) {
  return useQuery(coursesQueryOptions(userId));
}
