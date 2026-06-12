import type { FileDiffMetadata } from '@pierre/diffs';

export type AttemptReviewMode = 'editable' | 'readonly';
export type AttemptReviewDiffViewMode = 'unified' | 'split';
export type AttemptReviewFileStatus = 'added' | 'deleted' | 'changed';
export type AttemptReviewCommentSide = 'deletions' | 'additions';

export type AttemptReviewRouteParams = {
  courseSlug: string;
  taskId: string;
  studentUsername: string;
  attemptId: number;
};

export type AttemptReviewTask = {
  id: string;
  title: string;
  maxScore: number;
};

export type AttemptReviewStudent = {
  username: string;
  fullName: string;
  group: string;
  subgroup?: string;
};

export type AttemptReviewGrade = {
  score: number;
  maxScore: number;
  gradedAt: string;
  gradedBy: string;
};

export type AttemptReviewAttemptDetail = {
  id: string;
  attemptNumber: number;
  task: AttemptReviewTask;
  student: AttemptReviewStudent;
  submittedAt: string;
  deadlineAt: string;
  grade: AttemptReviewGrade | null;
};

export type AttemptReviewFileContents = {
  oldText: string;
  newText: string;
};

export type AttemptReviewChangedFile = {
  path: string;
  status: AttemptReviewFileStatus;
  addedLines: number;
  deletedLines: number;
  contents: AttemptReviewFileContents;
  diff: FileDiffMetadata;
};

export type AttemptReviewLineCommentStatus =
  | 'draft'
  | 'pending-create'
  | 'pending-update'
  | 'pending-delete'
  | 'saved';

export type AttemptReviewCommentAuthor = {
  username: string;
  name: string;
};

export type AttemptReviewLineCommentReply = {
  id: string;
  html: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
};

export type AttemptReviewLineComment = {
  id: string;
  filePath: string;
  side: AttemptReviewCommentSide;
  lineNumber: number;
  endSide?: AttemptReviewCommentSide;
  endLineNumber?: number;
  html: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
  status?: AttemptReviewLineCommentStatus;
  isEditing?: boolean;
  replies?: AttemptReviewLineCommentReply[];
};

export type AttemptReviewRichFeedback = {
  html: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type AttemptReviewHistoryItem = {
  attemptNumber: number;
  submittedAt: string;
  score: number | null;
  maxScore: number;
  addedLines: number;
  deletedLines: number;
  commentCount: number;
};

export type AttemptReviewAggregate = {
  courseSlug: string;
  baselineAttemptNumber: number | null;
  current: AttemptReviewAttemptDetail;
  attempts: AttemptReviewHistoryItem[];
  history: AttemptReviewHistoryItem[];
  changedFiles: AttemptReviewChangedFile[];
  lineComments: AttemptReviewLineComment[];
  overallFeedback: AttemptReviewRichFeedback;
};

export type SaveAttemptReviewInput = {
  score: number | null;
  overallFeedbackHtml: string;
  lineComments: AttemptReviewLineComment[];
} & AttemptReviewRouteParams;

export type CreateAttemptReviewCommentReplyInput = {
  commentId: string;
  html: string;
} & AttemptReviewRouteParams;

export type UpdateAttemptReviewCommentReplyInput = {
  commentId: string;
  replyId: string;
  html: string;
} & AttemptReviewRouteParams;

export type DeleteAttemptReviewCommentReplyInput = {
  commentId: string;
  replyId: string;
} & AttemptReviewRouteParams;
