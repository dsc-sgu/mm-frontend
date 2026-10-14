import type { FileDiffMetadata } from '@pierre/diffs';
import type {
  AttemptId,
  AttemptNumber,
  CourseId,
} from '@/features/course/model/identity';
import type { UserId } from '@/features/auth/model/identity';
import type { Grade } from '@/features/course/model/grade';

export type AttemptReviewMode = 'editable' | 'readonly';
export type AttemptReviewDiffViewMode = 'unified' | 'split';
export type AttemptReviewFileStatus = 'added' | 'deleted' | 'changed';
export type AttemptReviewCommentSide = 'deletions' | 'additions';

export type AttemptReviewIdentity = {
  courseId: CourseId;
  studentId: UserId;
  attemptId: AttemptId;
};

export type AttemptReviewTask = {
  id: string;
  title: string;
  maxGrade: Grade;
};

export type AttemptReviewStudent = {
  username: string;
  fullName: string;
  group: string;
  subgroup?: string;
};

export type AttemptReviewGrade = {
  value: Grade;
  gradedAt: string;
  gradedBy: string;
};

export type AttemptReviewAttemptDetail = {
  id: AttemptId;
  attemptNumber: AttemptNumber;
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
  attemptNumber: AttemptNumber;
  submittedAt: string;
  grade: Grade | null;
  addedLines: number;
  deletedLines: number;
  commentCount: number;
};

export type AttemptReviewAggregate = {
  baselineAttemptNumber: AttemptNumber | null;
  current: AttemptReviewAttemptDetail;
  attempts: AttemptReviewHistoryItem[];
  history: AttemptReviewHistoryItem[];
  changedFiles: AttemptReviewChangedFile[];
  lineComments: AttemptReviewLineComment[];
  overallFeedback: AttemptReviewRichFeedback;
};

export type SaveAttemptReviewInput = {
  grade: Grade;
  overallFeedbackHtml: string;
  lineComments: AttemptReviewLineComment[];
} & AttemptReviewIdentity;

export type CreateAttemptReviewCommentReplyInput = {
  commentId: string;
  html: string;
} & AttemptReviewIdentity;

export type UpdateAttemptReviewCommentReplyInput = {
  commentId: string;
  replyId: string;
  html: string;
} & AttemptReviewIdentity;

export type DeleteAttemptReviewCommentReplyInput = {
  commentId: string;
  replyId: string;
} & AttemptReviewIdentity;
