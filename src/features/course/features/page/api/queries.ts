import type { UserId } from '@/features/auth/model/identity';
import { sessionOptions } from '@/features/auth/api/queries';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { loadPublishedPage } from '@/features/course/features/page-document/api/load-published';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { courseKeys, coursesKeys } from '@/features/course/api/queries';
import { invalidateCourseContextsAfterMetadataSave } from '@/features/course/features/access/api/queries';
import type { SaveCoursePageInput } from '@/features/course/features/page/model/types';
import type { CourseId, CourseSlug } from '@/features/course/model/identity';
import { deadlinesKeys } from '@/features/deadlines-calendar/api/queries';
import { saveCoursePage } from './mock';

export const coursePageKeys = {
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
  return useQuery(coursePageQueryOptions(courseId, viewerId));
}

type SaveCoursePageVariables = SaveCoursePageInput & {
  /** The confirmed slug the editor was opened at, a shell context locator. */
  previousSlug: CourseSlug;
};

/**
 * Legacy save invalidates the published projection for every participant. Other Pages stay untouched; the projections that show the saved
 * metadata are invalidated: the course list, deadlines and the shell context
 * at both the old and the new slug.
 */
export function useSaveCoursePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SaveCoursePageVariables) =>
      saveCoursePage(variables),
    onSuccess: async (savedPage, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...courseKeys.byId(variables.courseId), 'page'],
        }),
        queryClient.invalidateQueries({ queryKey: coursesKeys.all }),
        queryClient.invalidateQueries({ queryKey: deadlinesKeys.all }),
        invalidateCourseContextsAfterMetadataSave(
          queryClient,
          variables.previousSlug,
          savedPage.courseId
        ),
      ]);
    },
  });
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
