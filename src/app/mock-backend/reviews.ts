import type { ReviewTextDocument } from '@/features/course/features/review/model/text-document';
import * as v from 'valibot';
import type { MockAttempt, MockReview } from '@/app/mock-backend/state';
import type { UserId } from '@/features/auth/model/identity';
import { GradeSchema } from '@/features/course/model/grade';
import { ReviewRevisionSchema } from '@/features/course/features/review/model/revision';

const REVIEW_DELAY = 8 * 60 * 60 * 1000;
const REPLY_DELAY = 10 * 60 * 60 * 1000;

/**
 * The development demo: Attempts #1–#3 of every Student are reviewed by the
 * Course Teacher, the stress Attempt #4 has no Review yet.
 */
export function devReview(
  attempt: MockAttempt,
  teacherId: UserId
): MockReview | null {
  if (attempt.attemptNumber > 3) {
    return null;
  }

  const publishedAt = shift(attempt.submittedAt, REVIEW_DELAY);
  const repliedAt = shift(attempt.submittedAt, REPLY_DELAY);
  const comments = DEV_COMMENTS[attempt.attemptNumber] ?? [];

  return {
    attemptId: attempt.id,
    revision: {
      number: v.parse(ReviewRevisionSchema, 1),
      grade: v.parse(GradeSchema, DEV_GRADES[attempt.attemptNumber]),
      overallFeedbackText: DEV_FEEDBACK[attempt.attemptNumber] ?? null,
      comments: comments.map((comment) => ({
        ...comment,
        authorId: teacherId,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      })),
      publishedAt,
      publishedBy: teacherId,
    },
    replies: (DEV_REPLIES[attempt.attemptNumber] ?? []).map((reply) => ({
      ...reply,
      id: `reply-${attempt.id}-${reply.commentId}`,
      authorId: attempt.studentId,
      createdAt: repliedAt,
      updatedAt: repliedAt,
    })),
  };
}

function shift(isoTime: string, milliseconds: number): string {
  return new Date(Date.parse(isoTime) + milliseconds).toISOString();
}

const DEV_GRADES: Record<number, number> = { 1: 5.5, 2: 6.8, 3: 8.1 };

const DEV_FEEDBACK: Record<number, ReviewTextDocument> = {
  1: {
    version: 1,
    children: [
      {
        type: 'p',
        children: [
          { text: 'Хорошее начало.', bold: true },
          {
            text: ' Проверьте стиль именования и добавьте обработку пустых входных данных.',
          },
        ],
      },
    ],
  },
  2: {
    version: 1,
    children: [
      {
        type: 'p',
        children: [
          { text: 'Решение стало устойчивее. Обратите внимание на ' },
          { text: 'formatTotal', code: true },
          { text: ' и локализацию вывода.' },
        ],
      },
    ],
  },
  3: {
    version: 1,
    children: [
      {
        type: 'p',
        children: [
          { text: 'Отрицательные значения обработаны, вывод локализован.' },
        ],
      },
    ],
  },
};

type DevComment = Omit<
  MockReview['revision']['comments'][number],
  'authorId' | 'createdAt' | 'updatedAt'
>;

const DEV_COMMENTS: Record<number, DevComment[]> = {
  2: [
    {
      id: 'comment-a2-main-4',
      filePath: 'src/main.ts',
      range: {
        start: { side: 'additions', lineNumber: 4 },
        end: { side: 'additions', lineNumber: 4 },
      },
      text: {
        version: 1,
        children: [
          {
            type: 'p',
            children: [
              {
                text: 'Проверка пустого массива нужна, но после неё стоит добавить тест на этот случай.',
              },
            ],
          },
        ],
      },
    },
  ],
  3: [
    {
      id: 'comment-a3-main-4',
      filePath: 'src/main.ts',
      range: {
        start: { side: 'additions', lineNumber: 4 },
        end: { side: 'additions', lineNumber: 4 },
      },
      text: {
        version: 1,
        children: [
          {
            type: 'p',
            children: [
              {
                text: 'Классно, что отрицательные значения обработаны. Зафиксируйте это в тестах.',
              },
            ],
          },
        ],
      },
    },
    {
      id: 'comment-a3-summary-3',
      filePath: 'src/components/Summary.tsx',
      range: {
        start: { side: 'additions', lineNumber: 3 },
        end: { side: 'additions', lineNumber: 3 },
      },
      text: {
        version: 1,
        children: [
          {
            type: 'p',
            children: [
              {
                text: 'Компонент маленький и понятный. Можно добавить ссылку на ',
              },
              {
                type: 'a',
                url: '/docs/components',
                children: [{ text: 'гайд по компонентам' }],
              },
              { text: '.' },
            ],
          },
        ],
      },
    },
  ],
};

type DevReply = Omit<
  MockReview['replies'][number],
  'id' | 'authorId' | 'createdAt' | 'updatedAt'
>;

const DEV_REPLIES: Record<number, DevReply[]> = {
  2: [
    {
      commentId: 'comment-a2-main-4',
      text: {
        version: 1,
        children: [
          {
            type: 'p',
            children: [{ text: 'Согласен, добавлю тест отдельным коммитом.' }],
          },
        ],
      },
    },
  ],
};
