import { queryOptions } from '@tanstack/react-query';

import type { UserId } from '@/features/auth/model/identity';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { reviewOptions } from '@/features/course/features/review/api/queries';
import { attemptReviewKeys } from './keys';
import { loadAttemptMaterial } from './load-material';
import { loadStudentAttempts } from './load-student-attempts';
import { loadAttemptSummary } from './load-summary';

export function attemptSummaryOptions(
  viewerId: UserId,
  courseId: CourseId,
  attemptId: AttemptId
) {
  return queryOptions({
    queryKey: attemptReviewKeys.summary(viewerId, courseId, attemptId),
    queryFn: ({ signal }) => loadAttemptSummary(courseId, attemptId, signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** Immutable: an Attempt's material never changes once submitted. */
export function attemptMaterialOptions(
  viewerId: UserId,
  courseId: CourseId,
  attemptId: AttemptId
) {
  return queryOptions({
    queryKey: attemptReviewKeys.material(viewerId, courseId, attemptId),
    queryFn: ({ signal }) => loadAttemptMaterial(courseId, attemptId, signal),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
}

export function studentAttemptsOptions(
  viewerId: UserId,
  courseId: CourseId,
  taskId: string,
  studentId: UserId
) {
  return queryOptions({
    queryKey: attemptReviewKeys.studentAttempts(
      viewerId,
      courseId,
      taskId,
      studentId
    ),
    queryFn: ({ signal }) =>
      loadStudentAttempts(courseId, taskId, studentId, signal),
    staleTime: 30 * 1000,
  });
}

export type AttemptPageInput = {
  viewerId: UserId;
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptId: AttemptId;
};

/** Every read of the Attempt page; the page and its prefetch share it. */
export function attemptPageQueries({
  viewerId,
  courseId,
  taskId,
  studentId,
  attemptId,
}: AttemptPageInput) {
  return {
    summary: attemptSummaryOptions(viewerId, courseId, attemptId),
    review: reviewOptions({
      viewerId,
      courseId,
      taskId,
      studentId,
      attemptId,
    }),
    material: attemptMaterialOptions(viewerId, courseId, attemptId),
    attempts: studentAttemptsOptions(viewerId, courseId, taskId, studentId),
  };
}
