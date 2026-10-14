import * as v from 'valibot';
import { mockBackend } from '@/app/mock-backend/state';
import { GradeSchema, type Grade } from '@/features/course/model/grade';
import type { UserId } from '@/features/auth/model/identity';
import {
  AttemptNumberSchema,
  type AttemptNumber,
  type CourseId,
} from '@/features/course/model/identity';
import type {
  TaskAttachment,
  TaskAttempt,
  TaskPageData,
} from '@/features/course/features/task/model/types';

const TASK_TITLES: Record<string, string> = {
  '1': 'catall.sh',
  '2': 'catall.sh',
  '3': 'branch-cleanup.sh',
  '4': 'test-report.sh',
};

const ATTACHMENTS = [
  {
    kind: 'pdf',
    name: 'bash_reference.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 284 * 1024,
  },
  {
    kind: 'document',
    name: 'task_template.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 46 * 1024,
  },
  {
    kind: 'spreadsheet',
    name: 'expected_results.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 32 * 1024,
  },
  {
    kind: 'presentation',
    name: 'lesson_slides.pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: Math.round(3.4 * 1024 * 1024),
  },
  {
    kind: 'archive',
    name: 'people_in_the_air.zip',
    mimeType: 'application/zip',
    sizeBytes: Math.round(1.8 * 1024 * 1024),
  },
  {
    kind: 'code',
    name: 'catall_example.sh',
    mimeType: 'text/x-shellscript',
    sizeBytes: 4 * 1024,
  },
  {
    kind: 'image',
    name: 'directory_scheme.png',
    mimeType: 'image/png',
    sizeBytes: 612 * 1024,
  },
  {
    kind: 'media',
    name: 'command_demo.mp4',
    mimeType: 'video/mp4',
    sizeBytes: Math.round(18.6 * 1024 * 1024),
  },
  {
    kind: 'other',
    name: 'input_sample.bin',
    mimeType: 'application/octet-stream',
    sizeBytes: 96 * 1024,
  },
] satisfies Array<Omit<TaskAttachment, 'id'>>;

const mockGrade = (value: number): Grade => v.parse(GradeSchema, value);

const ATTEMPTS = [
  {
    attemptNumber: v.parse(AttemptNumberSchema, 10),
    studentUsername: 'student',
    submittedAt: '2026-03-03T10:05:00+03:00',
    review: { status: 'pending' },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 9),
    studentUsername: 'student',
    submittedAt: '2026-03-02T09:15:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(8),
      gradedAt: '2026-03-02T11:10:00+03:00',
      graderName: 'Громова Елизавета Андреевна',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 8),
    studentUsername: 'student',
    submittedAt: '2026-03-01T18:42:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(10),
      gradedAt: '2026-03-01T20:06:00+03:00',
      graderName: 'Ковалёв Павел Сергеевич',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 7),
    studentUsername: 'student',
    submittedAt: '2026-02-28T16:30:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(6),
      gradedAt: '2026-02-28T18:12:00+03:00',
      graderName: 'Батраева Инна Олеговна',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 6),
    studentUsername: 'student',
    submittedAt: '2026-02-28T09:24:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(0),
      gradedAt: '2026-02-28T11:48:00+03:00',
      graderName: 'Морозов Андрей Викторович',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 5),
    studentUsername: 'student',
    submittedAt: '2026-02-27T10:20:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(9),
      gradedAt: '2026-02-27T12:02:00+03:00',
      graderName: 'Семёнова Дарья Михайловна',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 4),
    studentUsername: 'student',
    submittedAt: '2026-02-27T03:03:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(4),
      gradedAt: '2026-02-27T05:10:00+03:00',
      graderName: 'Левченко Анна Игоревна',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 3),
    studentUsername: 'student',
    submittedAt: '2026-02-26T23:59:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(7),
      gradedAt: '2026-02-27T00:34:00+03:00',
      graderName: 'Титов Егор Алексеевич',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 2),
    studentUsername: 'student',
    submittedAt: '2026-02-26T20:18:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(10),
      gradedAt: '2026-02-26T21:05:00+03:00',
      graderName: 'Сафрончик Мария Павловна',
    },
  },
  {
    attemptNumber: v.parse(AttemptNumberSchema, 1),
    studentUsername: 'student',
    submittedAt: '2026-02-25T02:07:00+03:00',
    review: {
      status: 'graded',
      grade: mockGrade(0),
      gradedAt: '2026-02-25T03:47:00+03:00',
      graderName: 'Кудяков Артём Александрович',
    },
  },
] satisfies Array<Omit<TaskAttempt, 'id' | 'attention'>>;

const INITIAL_UNSEEN_ATTEMPT_NUMBERS = new Set([7, 9]);
const seenAttemptUpdates = new Set<string>();

export async function fetchTaskPage({
  courseId,
  taskId,
  studentId,
}: {
  courseId: CourseId;
  taskId: string;
  studentId: UserId | null;
}): Promise<TaskPageData | null> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const taskNumber = Number(taskId);
  const course = mockBackend.state.courses.find(({ id }) => id === courseId);

  if (!course || !Number.isInteger(taskNumber) || taskNumber < 1) {
    return null;
  }

  const student =
    studentId === null
      ? null
      : mockBackend.state.users.find(({ id }) => id === studentId);
  if (student === undefined) {
    return null;
  }

  return {
    task: {
      id: taskId,
      number: taskNumber,
      title: TASK_TITLES[taskId] ?? `practice-${taskId}.sh`,
      description:
        'Работа скрипта должна заключаться в объединении текстов всех песен. Для решения подразумевается использование масок.',
      deadlineAt: '2026-02-26T23:59:00+03:00',
      maxGrade: mockGrade(10),
      attachments: ATTACHMENTS.map((attachment) => ({
        ...attachment,
        id: `${courseId}:${taskId}:attachment:${attachment.name}`,
      })),
      attempts: ATTEMPTS.map((attempt) => ({
        ...attempt,
        studentUsername: student?.username ?? attempt.studentUsername,
        id: `${courseId}:${taskId}:attempt:${attempt.attemptNumber}`,
        review: { ...attempt.review },
        attention: {
          status:
            INITIAL_UNSEEN_ATTEMPT_NUMBERS.has(attempt.attemptNumber) &&
            !seenAttemptUpdates.has(
              getAttemptUpdatesKey({
                courseId,
                taskId,
                student: studentId ?? attempt.studentUsername,
                attemptNumber: attempt.attemptNumber,
              })
            )
              ? 'unseen'
              : 'seen',
        },
      })),
    },
  };
}

export async function markTaskAttemptUpdatesSeen({
  courseId,
  taskId,
  studentId,
  attemptNumber,
}: {
  courseId: CourseId;
  taskId: string;
  studentId: UserId;
  attemptNumber: AttemptNumber;
}): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 120));

  seenAttemptUpdates.add(
    getAttemptUpdatesKey({
      courseId,
      taskId,
      student: studentId,
      attemptNumber,
    })
  );
}

function getAttemptUpdatesKey({
  courseId,
  taskId,
  student,
  attemptNumber,
}: {
  courseId: CourseId;
  taskId: string;
  student: string;
  attemptNumber: AttemptNumber;
}): string {
  return `${courseId}:${taskId}:${student}:${attemptNumber}`;
}
