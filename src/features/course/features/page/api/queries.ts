import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { courseKeys, coursesKeys } from '@/features/course/api/queries';
import { invalidateCourseContextsAfterMetadataSave } from '@/features/course/features/access/api/queries';
import type { SaveCoursePageInput } from '@/features/course/features/page/model/types';
import type { CourseId } from '@/features/course/model/identity';
import { deadlinesKeys } from '@/features/deadlines-calendar/api/queries';
import { fetchCoursePage, saveCoursePage } from './mock';

export const coursePageKeys = {
  detail: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'page'] as const,
};

export function coursePageQueryOptions(courseId: CourseId) {
  return queryOptions({
    queryKey: coursePageKeys.detail(courseId),
    queryFn: () => fetchCoursePage(courseId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCoursePageQuery(courseId: CourseId) {
  return useQuery(coursePageQueryOptions(courseId));
}

type SaveCoursePageVariables = SaveCoursePageInput & {
  /** The confirmed slug the editor was opened at, a shell context locator. */
  previousSlug: string;
};

/**
 * The save answers with the whole Page, so its exact entry is replaced in
 * place. Other Pages stay untouched; the projections that show the saved
 * metadata are invalidated: the course list, deadlines and the shell context
 * at both the old and the new slug.
 */
export function useSaveCoursePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: SaveCoursePageVariables) =>
      saveCoursePage(variables),
    onSuccess: async (savedPage, variables) => {
      queryClient.setQueryData(
        coursePageKeys.detail(variables.courseId),
        savedPage
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
