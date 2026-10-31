import type { UserRef } from '@/features/auth/model/user-ref';
import type { Grade } from '@/features/course/model/grade';
import type {
  AttemptNumber,
  CourseId,
  TaskId,
} from '@/features/course/model/identity';

export type CourseAttemptGradedFilter = 'any' | 'submitted' | 'graded';

export type CourseAttemptsFilters = {
  tasks: string[];
  students: string[];
  graded: CourseAttemptGradedFilter;
};

export type CourseAttemptsRouteSearch = {
  tasks?: string;
  students?: string;
  graded?: CourseAttemptGradedFilter;
};

export type CourseAttemptTask = {
  id: TaskId;
  title: string;
  maxGrade: Grade;
};

export type CourseAttemptStudent = UserRef;

type CourseAttemptGrade = {
  value: Grade;
  gradedAt: string;
  gradedBy: UserRef;
};

export type CourseAttemptReviewLock = {
  teacher: UserRef;
  lockedAt: string;
};

export type CourseAttempt = {
  id: string;
  attemptNumber: AttemptNumber;
  task: CourseAttemptTask;
  student: CourseAttemptStudent;
  submittedAt: string;
  deadlineAt: string;
  grade: CourseAttemptGrade | null;
  reviewLock: CourseAttemptReviewLock | null;
};

export type CourseAttemptsListResult = {
  totalAttemptsCount: number;
  attempts: CourseAttempt[];
  tasks: CourseAttemptTask[];
  students: CourseAttemptStudent[];
};

export type SaveQuickGradesInput = {
  courseId: CourseId;
  updates: Array<{
    attemptId: string;
    grade: Grade;
  }>;
};
