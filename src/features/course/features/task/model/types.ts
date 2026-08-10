export type CourseTaskAttachmentKind =
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'code'
  | 'image'
  | 'media'
  | 'other';

export type CourseTaskAttachment = {
  id: string;
  kind: CourseTaskAttachmentKind;
  name: string;
  size: string;
};

type CourseTaskAttemptBase = {
  id: string;
  attemptNumber: number;
  studentUsername: string;
  submittedAt: string;
};

export type CourseTaskAttempt =
  | (CourseTaskAttemptBase & {
      status: 'pending-review';
    })
  | (CourseTaskAttemptBase & {
      status: 'graded';
      gradedAt: string;
      gradedBy: string;
      score: number;
      maxScore: number;
    });

export type CourseTaskPage = {
  courseSlug: string;
  taskId: string;
  taskNumber: number;
  title: string;
  description: string;
  deadlineAt: string;
  maxScore: number;
  attachments: CourseTaskAttachment[];
  attempts: CourseTaskAttempt[];
};
