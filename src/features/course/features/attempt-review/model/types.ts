import type { FileDiffMetadata } from '@pierre/diffs';
import type {
  AttemptId,
  AttemptNumber,
  CourseId,
} from '@/features/course/model/identity';
import type { UserId } from '@/features/auth/model/identity';
import type { Grade } from '@/features/course/model/grade';
import type { ReviewRevision } from '@/features/course/features/review/model/revision';
import type {
  ReviewAuthor,
  ReviewComment,
  ReviewCommentSide,
  ReviewReply,
} from '@/features/course/features/review/model/types';

export type AttemptReviewMode = 'editable' | 'readonly';
export type AttemptReviewDiffViewMode = 'unified' | 'split';
export type AttemptReviewFileStatus = 'added' | 'deleted' | 'changed';
export type AttemptReviewCommentSide = ReviewCommentSide;

export type AttemptReviewIdentity = {
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptId: AttemptId;
};

/** What the page header says about the Attempt. */
export type AttemptSummary = {
  id: AttemptId;
  attemptNumber: AttemptNumber;
  submittedAt: string;
  deadlineAt: string;
  task: {
    title: string;
    maxGrade: Grade;
  };
  student: {
    id: UserId;
    name: string;
  };
};

/** One of the Student's Attempts at the Task, as the selector lists it. */
export type StudentAttempt = {
  id: AttemptId;
  attemptNumber: AttemptNumber;
  submittedAt: string;
  review: { revision: ReviewRevision; grade: Grade } | null;
  addedLines: number;
  deletedLines: number;
  commentCount: number;
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

/** The Attempt's changed files against its baseline. */
export type AttemptMaterial = {
  baselineAttemptNumber: AttemptNumber | null;
  changedFiles: AttemptReviewChangedFile[];
};

export type AttemptReviewLineCommentStatus =
  | 'draft'
  | 'pending-create'
  | 'pending-update'
  | 'pending-delete'
  | 'saved';

export type AttemptReviewCommentAuthor = ReviewAuthor;

export type AttemptReviewLineCommentReply = ReviewReply;

/** A root comment in the Review editor, including its unsaved lifecycle. */
export type AttemptReviewLineComment = Omit<ReviewComment, 'replies'> & {
  status?: AttemptReviewLineCommentStatus;
  isEditing?: boolean;
  replies?: AttemptReviewLineCommentReply[];
};
