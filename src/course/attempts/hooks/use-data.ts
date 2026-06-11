import { useMemo } from 'react';

import type {
  CourseAttempt,
  CourseAttemptsListResult,
  CourseAttemptStudent,
  CourseAttemptTask,
} from '@/course/attempts/model/types';

const EMPTY_ATTEMPTS: CourseAttempt[] = [];
const EMPTY_TASKS: CourseAttemptTask[] = [];
const EMPTY_STUDENTS: CourseAttemptStudent[] = [];

export function useCourseAttemptsData(
  data: CourseAttemptsListResult | undefined
) {
  const attempts = data?.attempts ?? EMPTY_ATTEMPTS;
  const tasks = data?.tasks ?? EMPTY_TASKS;
  const students = data?.students ?? EMPTY_STUDENTS;
  const attemptById = useMemo(
    () => new Map(attempts.map((attempt) => [attempt.id, attempt])),
    [attempts]
  );

  return {
    attempts,
    tasks,
    students,
    attemptById,
  };
}
