import { queryOptions, useQuery } from '@tanstack/react-query';
import type { UserId } from '@/features/auth/model/identity';
import { loadCourses } from '@/features/course/api/load-courses';

export const coursesKeys = {
  all: ['courses'] as const,
  user: (userId: UserId) => [...coursesKeys.all, userId] as const,
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
