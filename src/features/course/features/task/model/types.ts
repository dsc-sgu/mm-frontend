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
      score: number;
      gradedAt: string;
      graderName: string;
    };

export type TaskAttemptAttention = {
  status: 'seen' | 'unseen';
};

export type TaskAttempt = {
  id: string;
  number: number;
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
  maxScore: number;
  attachments: TaskAttachment[];
  attempts: TaskAttempt[];
};

export type TaskPageData = {
  courseSlug: string;
  task: Task;
};
