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
} from '@/features/course/features/attempts/model/types';

export const courseAttemptsKeys = {
  all: ['course-attempts'] as const,
  course: (courseSlug: string) =>
    [...courseAttemptsKeys.all, courseSlug] as const,
  list: (courseSlug: string, filters: CourseAttemptsFilters) =>
    [...courseAttemptsKeys.course(courseSlug), filters] as const,
};

export function courseAttemptsQueryOptions({
  courseSlug,
  filters,
}: {
  courseSlug: string;
  filters: CourseAttemptsFilters;
}) {
  return queryOptions({
    queryKey: courseAttemptsKeys.list(courseSlug, filters),
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
        queryKey: courseAttemptsKeys.course(variables.courseSlug),
      });
    },
  });
}
