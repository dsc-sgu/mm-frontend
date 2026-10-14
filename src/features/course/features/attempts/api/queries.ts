import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { courseKeys } from '@/features/course/api/queries';
import type { CourseId } from '@/features/course/model/identity';
import { fetchCourseAttemptsList, saveQuickGrades } from './mock';
import type {
  CourseAttemptsFilters,
  SaveQuickGradesInput,
} from '@/features/course/features/attempts/model/types';

export const courseAttemptsKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'attempts'] as const,
  list: (courseId: CourseId, filters: CourseAttemptsFilters) =>
    [...courseAttemptsKeys.course(courseId), { filters }] as const,
};

export function courseAttemptsQueryOptions({
  courseId,
  filters,
}: {
  courseId: CourseId;
  filters: CourseAttemptsFilters;
}) {
  return queryOptions({
    queryKey: courseAttemptsKeys.list(courseId, filters),
    queryFn: () => fetchCourseAttemptsList({ courseId, filters }),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCourseAttemptsQuery({
  courseId,
  filters,
  refetchPaused = false,
}: {
  courseId: CourseId;
  filters: CourseAttemptsFilters;
  refetchPaused?: boolean;
}) {
  return useQuery({
    ...courseAttemptsQueryOptions({ courseId, filters }),
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
        queryKey: courseAttemptsKeys.course(variables.courseId),
      });
    },
  });
}
