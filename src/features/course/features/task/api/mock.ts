import { http, HttpResponse } from 'msw';
import * as v from 'valibot';
import {
  accessDenial,
  resolveAttemptAccess,
  resolveStudentIdAccess,
} from '@/app/mock-backend/participant-access';
import {
  mockBackend,
  mockUserName,
  type MockReview,
} from '@/app/mock-backend/state';
import {
  GradeSchema,
  gradeToNumber,
  type Grade,
} from '@/features/course/model/grade';
import type { CourseId } from '@/features/course/model/identity';
import type {
  TaskAttachment,
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

// The Task itself stays an in-memory mock until its own HTTP operation.
export async function fetchTaskPage({
  courseId,
  taskId,
}: {
  courseId: CourseId;
  taskId: string;
}): Promise<TaskPageData | null> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const taskNumber = Number(taskId);
  const course = mockBackend.state.courses.find(({ id }) => id === courseId);

  if (!course || !Number.isInteger(taskNumber) || taskNumber < 1) {
    return null;
  }
  // The Attempt page reads these from the canonical Task; the history must
  // judge deadlines and Grades by the same values.
  const canonical = mockBackend.state.tasks.find(
    (task) => task.courseId === courseId && task.id === taskId
  );

  return {
    task: {
      id: taskId,
      number: taskNumber,
      title: canonical?.title ?? TASK_TITLES[taskId] ?? `practice-${taskId}.sh`,
      description:
        'Работа скрипта должна заключаться в объединении текстов всех песен. Для решения подразумевается использование масок.',
      deadlineAt: canonical?.deadlineAt ?? '2026-02-26T23:59:00+03:00',
      maxGrade: canonical?.maxGrade ?? mockGrade(10),
      attachments: ATTACHMENTS.map((attachment) => ({
        ...attachment,
        id: `${courseId}:${taskId}:attachment:${attachment.name}`,
      })),
    },
  };
}

// Working wire contracts pending backend confirmation #113. Both answer from
// the canonical Attempts and Reviews; denials carry no body.
export const taskHandlers = [
  http.get(
    '/api/v1/courses/:courseId/tasks/:taskId/students/:studentId/attempt-history',
    ({ params }) => {
      const access = resolveStudentIdAccess(
        String(params.courseId),
        String(params.studentId)
      );
      if (access.status !== 'found') {
        return accessDenial(access.status);
      }
      const { attempts, reviews, unseenAttemptUpdates } = mockBackend.state;
      return HttpResponse.json({
        attempts: attempts
          .filter(
            (attempt) =>
              attempt.courseId === params.courseId &&
              attempt.taskId === params.taskId &&
              attempt.studentId === access.studentId
          )
          .sort((first, second) => second.attemptNumber - first.attemptNumber)
          .map(({ id, attemptNumber, submittedAt }) => {
            const review = reviews.find(({ attemptId }) => attemptId === id);
            return {
              id,
              attemptNumber,
              submittedAt,
              review: review ? toHistoryReview(review) : null,
              updates: unseenAttemptUpdates.includes(id) ? 'unseen' : 'seen',
            };
          }),
      });
    }
  ),
  http.post(
    '/api/v1/courses/:courseId/attempts/:attemptId/updates-seen',
    ({ params }) => {
      const access = resolveAttemptAccess(
        String(params.courseId),
        String(params.attemptId)
      );
      if (access.status !== 'found') {
        return accessDenial(access.status);
      }
      // Only the Student who submitted the Attempt has updates to see.
      if (access.attempt.studentId !== mockBackend.state.session?.userId) {
        return new HttpResponse(null, { status: 403 });
      }
      const { attempt } = access;
      mockBackend.state.unseenAttemptUpdates =
        mockBackend.state.unseenAttemptUpdates.filter(
          (attemptId) => attemptId !== attempt.id
        );
      return new HttpResponse(null, { status: 204 });
    }
  ),
];

function toHistoryReview({ revision }: MockReview) {
  const publisher = mockBackend.state.users.find(
    ({ id }) => id === revision.publishedBy
  );
  if (!publisher) {
    throw new Error(`The mock backend has no User ${revision.publishedBy}`);
  }
  return {
    revision: revision.number,
    grade: gradeToNumber(revision.grade),
    publishedAt: revision.publishedAt,
    publishedBy: {
      id: publisher.id,
      username: publisher.username,
      ...mockUserName(publisher),
    },
  };
}
