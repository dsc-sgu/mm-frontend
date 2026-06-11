import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { fetchCourseAttemptsList, saveQuickGrades } from './mock';
import type {
  CourseAttemptsFilters,
  SaveQuickGradesInput,
} from '@/course/attempts/model/types';

export const COURSE_ATTEMPTS_QUERY_KEY = 'course-attempts';

export function courseAttemptsQueryOptions({
  courseSlug,
  filters,
}: {
  courseSlug: string;
  filters: CourseAttemptsFilters;
}) {
  return queryOptions({
    queryKey: [COURSE_ATTEMPTS_QUERY_KEY, courseSlug, filters],
    queryFn: () => fetchCourseAttemptsList({ courseSlug, filters }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCourseAttemptsQuery({
  courseSlug,
  filters,
  refetchPaused = false,
}: {
  courseSlug: string;
  filters: CourseAttemptsFilters;
  refetchPaused?: boolean;
}) {
  return useQuery({
    ...courseAttemptsQueryOptions({ courseSlug, filters }),
    enabled: !refetchPaused,
    refetchOnMount: !refetchPaused,
    refetchOnReconnect: !refetchPaused,
    refetchOnWindowFocus: !refetchPaused,
  });
}

export function useSaveQuickGradesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveQuickGradesInput) => saveQuickGrades(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [COURSE_ATTEMPTS_QUERY_KEY, variables.courseSlug],
      });
    },
  });
}
