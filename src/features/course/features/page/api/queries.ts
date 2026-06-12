import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { COURSES_QUERY_KEY } from '@/features/course/api/queries';
import { COURSE_ACCESS_QUERY_KEY } from '@/features/course/features/access/api/queries';
import type { SaveCoursePageInput } from '@/features/course/features/page/model/types';
import { fetchCoursePage, saveCoursePage } from './mock';

export const COURSE_PAGE_QUERY_KEY = 'course-page';

export function coursePageQueryOptions(courseSlug: string) {
  return queryOptions({
    queryKey: [COURSE_PAGE_QUERY_KEY, courseSlug],
    queryFn: () => fetchCoursePage(courseSlug),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCoursePageQuery(courseSlug: string) {
  return useQuery(coursePageQueryOptions(courseSlug));
}

export function useSaveCoursePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveCoursePageInput) => saveCoursePage(input),
    onSuccess: async (savedCourse, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [COURSE_PAGE_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: COURSES_QUERY_KEY }),
        variables.courseSlug === savedCourse.courseId
          ? Promise.resolve()
          : queryClient.invalidateQueries({
              queryKey: [COURSE_ACCESS_QUERY_KEY],
            }),
      ]);
    },
  });
}
