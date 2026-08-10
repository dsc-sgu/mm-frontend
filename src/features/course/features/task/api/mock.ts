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
    name: 'bash_reference.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 284 * 1024,
  },
  {
    name: 'task_template.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 46 * 1024,
  },
  {
    name: 'expected_results.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 32 * 1024,
  },
  {
    name: 'lesson_slides.pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: Math.round(3.4 * 1024 * 1024),
  },
  {
    name: 'people_in_the_air.zip',
    mimeType: 'application/zip',
    sizeBytes: Math.round(1.8 * 1024 * 1024),
  },
  {
    name: 'catall_example.sh',
    mimeType: 'text/x-shellscript',
    sizeBytes: 4 * 1024,
  },
  {
    name: 'directory_scheme.png',
    mimeType: 'image/png',
    sizeBytes: 612 * 1024,
  },
  {
    name: 'command_demo.mp4',
    mimeType: 'video/mp4',
    sizeBytes: Math.round(18.6 * 1024 * 1024),
  },
  {
    name: 'input_sample.bin',
    mimeType: 'application/octet-stream',
    sizeBytes: 96 * 1024,
  },
] satisfies Array<Omit<TaskAttachment, 'id'>>;

const ATTEMPTS = [
  {
    number: 10,
    studentUsername: 'student',
    submittedAt: '2026-03-03T10:05:00+03:00',
    review: { status: 'pending' },
  },
  {
    number: 9,
    studentUsername: 'student',
    submittedAt: '2026-03-02T09:15:00+03:00',
    review: {
      status: 'graded',
      score: 8,
      gradedAt: '2026-03-02T11:10:00+03:00',
      graderName: 'Громова Елизавета Андреевна',
    },
  },
  {
    number: 8,
    studentUsername: 'student',
    submittedAt: '2026-03-01T18:42:00+03:00',
    review: {
      status: 'graded',
      score: 10,
      gradedAt: '2026-03-01T20:06:00+03:00',
      graderName: 'Ковалёв Павел Сергеевич',
    },
  },
  {
    number: 7,
    studentUsername: 'student',
    submittedAt: '2026-02-28T16:30:00+03:00',
    review: {
      status: 'graded',
      score: 6,
      gradedAt: '2026-02-28T18:12:00+03:00',
      graderName: 'Батраева Инна Олеговна',
    },
  },
  {
    number: 6,
    studentUsername: 'student',
    submittedAt: '2026-02-28T09:24:00+03:00',
    review: {
      status: 'graded',
      score: 0,
      gradedAt: '2026-02-28T11:48:00+03:00',
      graderName: 'Морозов Андрей Викторович',
    },
  },
  {
    number: 5,
    studentUsername: 'student',
    submittedAt: '2026-02-27T10:20:00+03:00',
    review: {
      status: 'graded',
      score: 9,
      gradedAt: '2026-02-27T12:02:00+03:00',
      graderName: 'Семёнова Дарья Михайловна',
    },
  },
  {
    number: 4,
    studentUsername: 'student',
    submittedAt: '2026-02-27T03:03:00+03:00',
    review: {
      status: 'graded',
      score: 4,
      gradedAt: '2026-02-27T05:10:00+03:00',
      graderName: 'Левченко Анна Игоревна',
    },
  },
  {
    number: 3,
    studentUsername: 'student',
    submittedAt: '2026-02-26T23:59:00+03:00',
    review: {
      status: 'graded',
      score: 7,
      gradedAt: '2026-02-27T00:34:00+03:00',
      graderName: 'Титов Егор Алексеевич',
    },
  },
  {
    number: 2,
    studentUsername: 'student',
    submittedAt: '2026-02-26T20:18:00+03:00',
    review: {
      status: 'graded',
      score: 10,
      gradedAt: '2026-02-26T21:05:00+03:00',
      graderName: 'Сафрончик Мария Павловна',
    },
  },
  {
    number: 1,
    studentUsername: 'student',
    submittedAt: '2026-02-25T02:07:00+03:00',
    review: {
      status: 'graded',
      score: 0,
      gradedAt: '2026-02-25T03:47:00+03:00',
      graderName: 'Кудяков Артём Александрович',
    },
  },
] satisfies Array<Omit<TaskAttempt, 'id'>>;

export async function fetchTaskPage({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}): Promise<TaskPageData | null> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const taskNumber = Number(taskId);

  if (!Number.isInteger(taskNumber) || taskNumber < 1) {
    return null;
  }

  return {
    courseSlug,
    task: {
      id: taskId,
      number: taskNumber,
      title: TASK_TITLES[taskId] ?? `practice-${taskId}.sh`,
      description:
        'Работа скрипта должна заключаться в объединении текстов всех песен. Для решения подразумевается использование масок.',
      deadlineAt: '2026-02-26T23:59:00+03:00',
      maxScore: 10,
      attachments: ATTACHMENTS.map((attachment) => ({
        ...attachment,
        id: `${courseSlug}:${taskId}:attachment:${attachment.name}`,
      })),
      attempts: ATTEMPTS.map((attempt) => ({
        ...attempt,
        id: `${courseSlug}:${taskId}:attempt:${attempt.number}`,
        review: { ...attempt.review },
      })),
    },
  };
}
