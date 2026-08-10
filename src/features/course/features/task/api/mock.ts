import type { CourseTaskPage } from '@/features/course/features/task/model/types';

const TASK_TITLES: Record<string, string> = {
  '1': 'catall.sh',
  '2': 'catall.sh',
  '3': 'branch-cleanup.sh',
  '4': 'test-report.sh',
};

export async function fetchCourseTaskPage({
  courseSlug,
  taskId,
}: {
  courseSlug: string;
  taskId: string;
}): Promise<CourseTaskPage | null> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const taskNumber = Number(taskId);

  if (!Number.isInteger(taskNumber) || taskNumber < 1) {
    return null;
  }

  return {
    courseSlug,
    taskId,
    taskNumber,
    title: TASK_TITLES[taskId] ?? `practice-${taskId}.sh`,
    description:
      'Работа скрипта должна заключаться в объединении текстов всех песен. Для решения подразумевается использование масок.',
    deadlineAt: '2026-02-26T23:59:00+03:00',
    maxScore: 10,
    attachments: [
      {
        id: `${courseSlug}:${taskId}:bash-reference`,
        kind: 'pdf',
        name: 'bash_reference.pdf',
        size: '284 КБ',
      },
      {
        id: `${courseSlug}:${taskId}:task-template`,
        kind: 'document',
        name: 'task_template.docx',
        size: '46 КБ',
      },
      {
        id: `${courseSlug}:${taskId}:expected-results`,
        kind: 'spreadsheet',
        name: 'expected_results.xlsx',
        size: '32 КБ',
      },
      {
        id: `${courseSlug}:${taskId}:lesson-slides`,
        kind: 'presentation',
        name: 'lesson_slides.pptx',
        size: '3,4 МБ',
      },
      {
        id: `${courseSlug}:${taskId}:people-in-the-air`,
        kind: 'archive',
        name: 'people_in_the_air.zip',
        size: '1,8 МБ',
      },
      {
        id: `${courseSlug}:${taskId}:catall-example`,
        kind: 'code',
        name: 'catall_example.sh',
        size: '4 КБ',
      },
      {
        id: `${courseSlug}:${taskId}:directory-scheme`,
        kind: 'image',
        name: 'directory_scheme.png',
        size: '612 КБ',
      },
      {
        id: `${courseSlug}:${taskId}:command-demo`,
        kind: 'media',
        name: 'command_demo.mp4',
        size: '18,6 МБ',
      },
      {
        id: `${courseSlug}:${taskId}:input-sample`,
        kind: 'other',
        name: 'input_sample.bin',
        size: '96 КБ',
      },
    ],
    attempts: [
      {
        id: `${courseSlug}:${taskId}:attempt:10`,
        attemptNumber: 10,
        studentUsername: 'student',
        submittedAt: '2026-03-03T10:05:00+03:00',
        status: 'pending-review',
      },
      {
        id: `${courseSlug}:${taskId}:attempt:9`,
        attemptNumber: 9,
        studentUsername: 'student',
        submittedAt: '2026-03-02T09:15:00+03:00',
        status: 'graded',
        gradedAt: '2026-03-02T11:10:00+03:00',
        gradedBy: 'Громова Елизавета Андреевна',
        score: 8,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:8`,
        attemptNumber: 8,
        studentUsername: 'student',
        submittedAt: '2026-03-01T18:42:00+03:00',
        status: 'graded',
        gradedAt: '2026-03-01T20:06:00+03:00',
        gradedBy: 'Ковалёв Павел Сергеевич',
        score: 10,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:7`,
        attemptNumber: 7,
        studentUsername: 'student',
        submittedAt: '2026-02-28T16:30:00+03:00',
        status: 'graded',
        gradedAt: '2026-02-28T18:12:00+03:00',
        gradedBy: 'Батраева Инна Олеговна',
        score: 6,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:6`,
        attemptNumber: 6,
        studentUsername: 'student',
        submittedAt: '2026-02-28T09:24:00+03:00',
        status: 'graded',
        gradedAt: '2026-02-28T11:48:00+03:00',
        gradedBy: 'Морозов Андрей Викторович',
        score: 0,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:5`,
        attemptNumber: 5,
        studentUsername: 'student',
        submittedAt: '2026-02-27T10:20:00+03:00',
        status: 'graded',
        gradedAt: '2026-02-27T12:02:00+03:00',
        gradedBy: 'Семёнова Дарья Михайловна',
        score: 9,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:4`,
        attemptNumber: 4,
        studentUsername: 'student',
        submittedAt: '2026-02-27T03:03:00+03:00',
        status: 'graded',
        gradedAt: '2026-02-27T05:10:00+03:00',
        gradedBy: 'Левченко Анна Игоревна',
        score: 4,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:3`,
        attemptNumber: 3,
        studentUsername: 'student',
        submittedAt: '2026-02-26T23:59:00+03:00',
        status: 'graded',
        gradedAt: '2026-02-27T00:34:00+03:00',
        gradedBy: 'Титов Егор Алексеевич',
        score: 7,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:2`,
        attemptNumber: 2,
        studentUsername: 'student',
        submittedAt: '2026-02-26T20:18:00+03:00',
        status: 'graded',
        gradedAt: '2026-02-26T21:05:00+03:00',
        gradedBy: 'Сафрончик Мария Павловна',
        score: 10,
        maxScore: 10,
      },
      {
        id: `${courseSlug}:${taskId}:attempt:1`,
        attemptNumber: 1,
        studentUsername: 'student',
        submittedAt: '2026-02-25T02:07:00+03:00',
        status: 'graded',
        gradedAt: '2026-02-25T03:47:00+03:00',
        gradedBy: 'Кудяков Артём Александрович',
        score: 0,
        maxScore: 10,
      },
    ],
  };
}
