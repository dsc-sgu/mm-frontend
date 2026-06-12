export type CourseAttemptGradedFilter = 'any' | 'no' | 'yes';

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
  id: string;
  title: string;
  maxScore: number;
};

export type CourseAttemptStudent = {
  username: string;
  fullName: string;
  group: string;
  subgroup?: string;
};

export type CourseAttemptDiffStats = {
  addedLines: number;
  deletedLines: number;
};

export type CourseAttemptGrade = {
  score: number;
  maxScore: number;
  gradedAt: string;
  gradedBy: string;
};

export type CourseAttemptReviewLock = {
  teacherName: string;
  lockedAt: string;
};

export type CourseAttempt = {
  id: string;
  attemptNumber: number;
  task: CourseAttemptTask;
  student: CourseAttemptStudent;
  submittedAt: string;
  deadlineAt: string;
  diff: CourseAttemptDiffStats;
  grade: CourseAttemptGrade | null;
  reviewLock: CourseAttemptReviewLock | null;
};

export type CourseAttemptsListResult = {
  attempts: CourseAttempt[];
  tasks: CourseAttemptTask[];
  students: CourseAttemptStudent[];
};

export type SaveQuickGradesInput = {
  courseSlug: string;
  updates: Array<{
    attemptId: string;
    score: number;
  }>;
};
