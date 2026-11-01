import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
  type QueryClient,
} from '@tanstack/react-query';
import { sessionOptions } from '@/features/auth/api/queries';
import type { UserId } from '@/features/auth/model/identity';
import { courseKeys } from '@/features/course/api/queries';
import type { CourseId } from '@/features/course/model/identity';
import { loadPublishedPage } from './load-published';
export const coursePageKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'page'] as const,
  detail: (courseId: CourseId, viewerId: UserId) =>
    [...courseKeys.byId(courseId), 'page', viewerId] as const,
};

export function coursePageQueryOptions(courseId: CourseId, viewerId: UserId) {
  return queryOptions({
    queryKey: coursePageKeys.detail(courseId, viewerId),
    queryFn: ({ signal }) => loadPublishedPage(courseId, signal),
    staleTime: 0,
    retry: false,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCoursePageQuery(courseId: CourseId) {
  const { data: session } = useSuspenseQuery(sessionOptions);
  if (session.status !== 'authorized')
    throw new Error('Authorized session required');
  const viewerId = session.session.userId;
  return useQuery(coursePageQueries(courseId, viewerId).document);
}

export function coursePageQueries(courseId: CourseId, viewerId: UserId) {
  return { document: coursePageQueryOptions(courseId, viewerId) };
}
export function prefetchCoursePage(
  client: QueryClient,
  courseId: CourseId,
  viewerId: UserId
) {
  void client
    .query(coursePageQueries(courseId, viewerId).document)
    .catch(() => {});
}
