import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/keys';
import { reviewKeys } from '@/features/course/features/review/api/keys';
import { taskKeys } from '@/features/course/features/task/api/queries';
import { loadCourseAttempts } from './load-course-attempts';
import { normalizeCourseAttemptsFilters } from '@/features/course/features/attempts/model/filters';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { courseKeys } from '@/features/course/api/queries';
import type { CourseId } from '@/features/course/model/identity';
import { saveQuickGrade } from '@/features/course/features/review/api/save-quick-grade';
import type {
  CourseAttemptsFilters,
  SaveQuickGradesInput,
} from '@/features/course/features/attempts/model/types';

export const courseAttemptsKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'attempts'] as const,
  list: (courseId: CourseId, filters: CourseAttemptsFilters) =>
    [
      ...courseAttemptsKeys.course(courseId),
      { filters: normalizeCourseAttemptsFilters(filters) },
    ] as const,
};

function courseAttemptsQueryOptions({
  courseId,
  filters,
}: {
  courseId: CourseId;
  filters: CourseAttemptsFilters;
}) {
  return queryOptions({
    queryKey: courseAttemptsKeys.list(courseId, filters),
    queryFn: ({ signal }) => loadCourseAttempts({ courseId, filters }, signal),
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
    ...attemptsPageQueries({ courseId, filters }).attempts,
    enabled: !refetchPaused,
    refetchOnMount: !refetchPaused,
    refetchOnReconnect: !refetchPaused,
    refetchOnWindowFocus: !refetchPaused,
  });
}

export function useSaveQuickGradesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: async ({ courseId, updates }: SaveQuickGradesInput) => {
      for (const { attemptId, grade } of updates) {
        const saved = await saveQuickGrade(courseId, attemptId, grade);
        // Refresh each confirmed write even if a later item fails.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: courseAttemptsKeys.course(courseId),
          }),
          queryClient.invalidateQueries({
            queryKey: reviewKeys.attempt(courseId, saved.attemptId),
          }),
          queryClient.invalidateQueries({
            queryKey: attemptReviewKeys.summaries(courseId, saved.attemptId),
          }),
          queryClient.invalidateQueries({
            queryKey: attemptReviewKeys.student(
              courseId,
              saved.taskId,
              saved.studentId
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: taskKeys.student(courseId, saved.taskId, saved.studentId),
          }),
        ]);
      }
    },
  });
}

export const attemptsPageQueries = (input: {
  courseId: CourseId;
  filters: CourseAttemptsFilters;
}) => ({ attempts: courseAttemptsQueryOptions(input) });
