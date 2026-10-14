import type { Grade } from '@/features/course/model/grade';
import type { AttemptNumber } from '@/features/course/model/identity';

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

export type TaskAttemptReview =
  | { status: 'pending' }
  | {
      status: 'graded';
      grade: Grade;
      gradedAt: string;
      graderName: string;
    };

export type TaskAttemptAttention = {
  status: 'seen' | 'unseen';
};

export type TaskAttempt = {
  id: string;
  attemptNumber: AttemptNumber;
  studentUsername: string;
  submittedAt: string;
  review: TaskAttemptReview;
  attention: TaskAttemptAttention;
};

export type Task = {
  id: string;
  number: number;
  title: string;
  description: string;
  deadlineAt: string;
  maxGrade: Grade;
  attachments: TaskAttachment[];
  attempts: TaskAttempt[];
};

export type TaskPageData = {
  task: Task;
};
