import type { LoadCourseAttemptsResult } from '@/features/course/features/attempts/api/load-course-attempts';
import { useMemo } from 'react';

import type {
  CourseAttempt,
  CourseAttemptStudent,
  CourseAttemptTask,
} from '@/features/course/features/attempts/model/types';

const EMPTY_ATTEMPTS: CourseAttempt[] = [];
const EMPTY_TASKS: CourseAttemptTask[] = [];
const EMPTY_STUDENTS: CourseAttemptStudent[] = [];

export function useCourseAttemptsData(
  result: LoadCourseAttemptsResult | undefined
) {
  const data = result?.status === 'found' ? result : undefined;
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
