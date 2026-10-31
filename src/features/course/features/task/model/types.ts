import type { UserRef } from '@/features/auth/model/user-ref';
import type { Grade } from '@/features/course/model/grade';
import type {
  AttemptId,
  AttemptNumber,
} from '@/features/course/model/identity';
import type { ReviewRevision } from '@/features/course/features/review/model/revision';

export type TaskAttachmentKind =
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'code'
  | 'image'
  | 'media'
  | 'other';

export type TaskAttachment = {
  id: string;
  kind: TaskAttachmentKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

/** The latest published Review Revision of an Attempt, as the history shows it. */
export type TaskAttemptReview = {
  revision: ReviewRevision;
  grade: Grade;
  publishedAt: string;
  publishedBy: UserRef;
};

export type TaskAttempt = {
  id: AttemptId;
  attemptNumber: AttemptNumber;
  submittedAt: string;
  review: TaskAttemptReview | null;
  /** Whether the Student has looked at the latest Review. Replaced in REV8. */
  updates: 'seen' | 'unseen';
};

export type Task = {
  id: string;
  number: number;
  title: string;
  description: string;
  deadlineAt: string;
  maxGrade: Grade;
  attachments: TaskAttachment[];
};

export type TaskPageData = {
  task: Task;
};
