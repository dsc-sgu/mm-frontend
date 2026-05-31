export type CourseAttemptGradedFilter = 'any' | 'no' | 'yes';

export interface CourseAttemptsFilters {
  tasks: string[];
  students: string[];
  graded: CourseAttemptGradedFilter;
}

export interface CourseAttemptsRouteSearch {
  tasks?: string;
  students?: string;
  graded?: CourseAttemptGradedFilter;
}

export interface CourseAttemptTask {
  id: string;
  title: string;
  maxScore: number;
}

export interface CourseAttemptStudent {
  username: string;
  fullName: string;
  group: string;
  subgroup?: string;
}

export interface CourseAttemptDiffStats {
  addedLines: number;
  deletedLines: number;
}

export interface CourseAttemptGrade {
  score: number;
  maxScore: number;
  gradedAt: string;
  gradedBy: string;
}

export interface CourseAttemptReviewLock {
  teacherName: string;
  lockedAt: string;
}

export interface CourseAttempt {
  id: string;
  attemptNumber: number;
  task: CourseAttemptTask;
  student: CourseAttemptStudent;
  submittedAt: string;
  deadlineAt: string;
  diff: CourseAttemptDiffStats;
  grade: CourseAttemptGrade | null;
  reviewLock: CourseAttemptReviewLock | null;
}

export interface CourseAttemptsListResult {
  attempts: CourseAttempt[];
  tasks: CourseAttemptTask[];
  students: CourseAttemptStudent[];
}

export interface SaveQuickGradesInput {
  courseSlug: string;
  updates: Array<{
    attemptId: string;
    score: number;
  }>;
}
