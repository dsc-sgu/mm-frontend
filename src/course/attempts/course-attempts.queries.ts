import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchCourseAttemptsList,
  saveQuickGrades,
} from './course-attempts.api.mock';
import type {
  CourseAttemptsFilters,
  SaveQuickGradesInput,
} from './course-attempts.types';

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
}: {
  courseSlug: string;
  filters: CourseAttemptsFilters;
}) {
  return useQuery(courseAttemptsQueryOptions({ courseSlug, filters }));
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
