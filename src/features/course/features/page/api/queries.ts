import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type { UserId } from '@/features/auth/model/identity';
import { courseKeys, coursesKeys } from '@/features/course/api/queries';
import { invalidateCourseContextsAfterMetadataSave } from '@/features/course/features/access/api/queries';
import type { CourseRole } from '@/features/course/features/access/model/types';
import { loadPublishedCoursePage } from '@/features/course/features/page-document/api/load-published';
import type { SaveCoursePageInput } from '@/features/course/features/page/model/types';
import type { CourseId, CourseSlug } from '@/features/course/model/identity';
import { deadlinesKeys } from '@/features/deadlines-calendar/api/queries';
import { saveCoursePage } from './mock';

export const coursePageKeys = {
  detail: (courseId: CourseId, viewerId: UserId, role: CourseRole) =>
    [...courseKeys.byId(courseId), 'page', viewerId, role] as const,
};

export type CoursePageQueryInput = {
  courseId: CourseId;
  viewerId: UserId;
  role: CourseRole;
};

export function coursePageQueryOptions({
  courseId,
  viewerId,
  role,
}: CoursePageQueryInput) {
  return queryOptions({
    queryKey: coursePageKeys.detail(courseId, viewerId, role),
    queryFn: ({ signal }) => loadPublishedCoursePage(courseId, signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function coursePageQueries(input: CoursePageQueryInput) {
  return { published: coursePageQueryOptions(input) };
}

export function useCoursePageQuery(input: CoursePageQueryInput) {
  return useQuery(coursePageQueries(input).published);
}

type SaveCoursePageVariables = SaveCoursePageInput & {
  previousSlug: CourseSlug;
  viewerId: UserId;
  role: CourseRole;
};

export function useSaveCoursePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SaveCoursePageVariables) =>
      saveCoursePage(variables),
    onSuccess: async (savedPage, variables) => {
      queryClient.setQueryData(
        coursePageKeys.detail(
          variables.courseId,
          variables.viewerId,
          variables.role
        ),
        { status: 'found', page: savedPage }
      );
      await Promise.all([
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
