import {
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';
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

export type CoursePageQueryInput = {
  courseId: CourseId;
  viewerId: UserId;
};

export function coursePageQueryOptions({
  courseId,
  viewerId,
}: CoursePageQueryInput) {
  return queryOptions({
    queryKey: coursePageKeys.detail(courseId, viewerId),
    queryFn: ({ signal }) => loadPublishedPage(courseId, signal),
    staleTime: 0,
    retry: false,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCoursePageQuery(input: CoursePageQueryInput) {
  return useQuery(coursePageQueries(input).document);
}

export function coursePageQueries(input: CoursePageQueryInput) {
  return { document: coursePageQueryOptions(input) };
}

export function prefetchCoursePage(
  client: QueryClient,
  input: CoursePageQueryInput
) {
  void client.query(coursePageQueries(input).document).catch(() => {});
}
