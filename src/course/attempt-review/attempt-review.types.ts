import type { FileDiffMetadata } from '@pierre/diffs';

export type AttemptReviewMode = 'editable' | 'readonly';
export type AttemptReviewFileStatus = 'added' | 'deleted' | 'changed';
export type AttemptReviewCommentSide = 'deletions' | 'additions';

export interface AttemptReviewRouteParams {
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptId: number;
}

export interface AttemptReviewTask {
  id: string;
  title: string;
  maxScore: number;
}

export interface AttemptReviewStudent {
  username: string;
  fullName: string;
  group: string;
  subgroup?: string;
}

export interface AttemptReviewGrade {
  score: number;
  maxScore: number;
  gradedAt: string;
  gradedBy: string;
}

export interface AttemptReviewAttemptDetail {
  id: string;
  attemptNumber: number;
  task: AttemptReviewTask;
  student: AttemptReviewStudent;
  submittedAt: string;
  deadlineAt: string;
  grade: AttemptReviewGrade | null;
}

export interface AttemptReviewFileContents {
  oldText: string;
  newText: string;
}

export interface AttemptReviewChangedFile {
  path: string;
  status: AttemptReviewFileStatus;
  addedLines: number;
  deletedLines: number;
  contents: AttemptReviewFileContents;
  diff: FileDiffMetadata;
}

export interface AttemptReviewLineComment {
  id: string;
  filePath: string;
  side: AttemptReviewCommentSide;
  lineNumber: number;
  endSide?: AttemptReviewCommentSide;
  endLineNumber?: number;
  html: string;
  authorName: string;
  updatedAt: string;
}

export interface AttemptReviewRichFeedback {
  html: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface AttemptReviewHistoryItem {
  attemptNumber: number;
  submittedAt: string;
  score: number | null;
  maxScore: number;
  addedLines: number;
  deletedLines: number;
  commentCount: number;
}

export interface AttemptReviewAggregate {
  courseSlug: string;
  baselineAttemptNumber: number | null;
  current: AttemptReviewAttemptDetail;
  previousAttempt: AttemptReviewHistoryItem | null;
  nextAttempt: AttemptReviewHistoryItem | null;
  attempts: AttemptReviewHistoryItem[];
  history: AttemptReviewHistoryItem[];
  changedFiles: AttemptReviewChangedFile[];
  lineComments: AttemptReviewLineComment[];
  overallFeedback: AttemptReviewRichFeedback;
}

export interface SaveAttemptReviewInput extends AttemptReviewRouteParams {
  score: number | null;
  overallFeedbackHtml: string;
  lineComments: AttemptReviewLineComment[];
}
