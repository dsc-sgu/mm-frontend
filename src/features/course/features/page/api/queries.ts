import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesKeys } from '@/features/course/api/queries';
import { invalidateCourseContextsAfterMetadataSave } from '@/features/course/features/access/api/queries';
import type { SaveCoursePageInput } from '@/features/course/features/page/model/types';
import type { CourseSlug } from '@/features/course/model/identity';
import { deadlinesKeys } from '@/features/deadlines-calendar/api/queries';
import { coursePageKeys } from '@/features/course/features/page-document/api/queries';
import { saveCoursePage } from './mock';
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
          queryKey: coursePageKeys.course(variables.courseId),
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
