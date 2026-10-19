import { queryOptions } from '@tanstack/react-query';

import { courseKeys } from '@/features/course/api/queries';
import type { UserId } from '@/features/auth/model/identity';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { loadAttemptMaterial } from './load-material';
import { loadStudentAttempts } from './load-student-attempts';
import { loadAttemptSummary } from './load-summary';

export const attemptReviewKeys = {
  course: (courseId: CourseId) =>
    [...courseKeys.byId(courseId), 'attempt-review'] as const,
  attempt: (courseId: CourseId, attemptId: AttemptId) =>
    [...attemptReviewKeys.course(courseId), 'attempt', attemptId] as const,
  summary: (viewerId: UserId, courseId: CourseId, attemptId: AttemptId) =>
    [
      ...attemptReviewKeys.attempt(courseId, attemptId),
      'summary',
      viewerId,
    ] as const,
  material: (viewerId: UserId, courseId: CourseId, attemptId: AttemptId) =>
    [
      ...attemptReviewKeys.attempt(courseId, attemptId),
      'material',
      viewerId,
    ] as const,
  student: (courseId: CourseId, taskId: string, studentId: UserId) =>
    [
      ...attemptReviewKeys.course(courseId),
      'student',
      taskId,
      studentId,
    ] as const,
  studentAttempts: (
    viewerId: UserId,
    courseId: CourseId,
    taskId: string,
    studentId: UserId
  ) =>
    [
      ...attemptReviewKeys.student(courseId, taskId, studentId),
      'attempts',
      viewerId,
    ] as const,
};

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
