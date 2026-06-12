import { parseDiffFromFile, type FileDiffMetadata } from '@pierre/diffs';

import {
  findMockCourseAttempt,
  upsertMockCourseAttemptGrade,
} from '@/features/course/features/attempts/api/mock';
import type {
  AttemptReviewAggregate,
  AttemptReviewChangedFile,
  AttemptReviewFileStatus,
  AttemptReviewGrade,
  AttemptReviewHistoryItem,
  AttemptReviewLineComment,
  AttemptReviewLineCommentReply,
  AttemptReviewRichFeedback,
  AttemptReviewRouteParams,
  AttemptReviewStudent,
  AttemptReviewTask,
  CreateAttemptReviewCommentReplyInput,
  DeleteAttemptReviewCommentReplyInput,
  SaveAttemptReviewInput,
  UpdateAttemptReviewCommentReplyInput,
} from '@/features/course/features/attempt-review/model/types';

type StoredAttemptReview = {
  attemptNumber: number;
  submittedAt: string;
  deadlineAt: string;
  files: Record<string, string>;
  grade: AttemptReviewGrade | null;
  overallFeedback: AttemptReviewRichFeedback;
  lineComments: AttemptReviewLineComment[];
};

type ReviewSeries = {
  task: AttemptReviewTask;
  student: AttemptReviewStudent;
  attempts: StoredAttemptReview[];
};

const reviewSeriesByKey = new Map<string, ReviewSeries>();

const EMPTY_FEEDBACK: AttemptReviewRichFeedback = {
  html: '',
  updatedAt: null,
  updatedBy: null,
};

const MOCK_REPLY_AUTHOR = {
  username: 'mit-teacher',
  name: 'Текущий преподаватель',
};

export async function fetchAttemptReview(
  params: AttemptReviewRouteParams
): Promise<AttemptReviewAggregate> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const series = getReviewSeries(params);
  const current = findAttemptOrThrow(series, params.attemptId);
  const previous = findPreviousAttempt(series, params.attemptId);
  const changedFiles = buildChangedFiles(previous?.files ?? {}, current.files);

  return {
    courseSlug: params.courseSlug,
    baselineAttemptNumber: previous?.attemptNumber ?? null,
    current: {
      id: `${seriesKey(params)}:${current.attemptNumber}`,
      attemptNumber: current.attemptNumber,
      task: series.task,
      student: series.student,
      submittedAt: current.submittedAt,
      deadlineAt: current.deadlineAt,
      grade: current.grade,
    },
    attempts: series.attempts
      .map((attempt) => toHistoryItem(series, attempt))
      .reverse(),
    history: series.attempts
      .filter((attempt) => attempt.attemptNumber < current.attemptNumber)
      .map((attempt) => toHistoryItem(series, attempt))
      .reverse(),
    changedFiles,
    lineComments: current.lineComments.map(cloneLineComment),
    overallFeedback: { ...current.overallFeedback },
  };
}

export async function saveAttemptReview(
  input: SaveAttemptReviewInput
): Promise<AttemptReviewAggregate> {
  await new Promise((resolve) => setTimeout(resolve, 220));

  const series = getReviewSeries(input);
  const current = findAttemptOrThrow(series, input.attemptId);
  const now = new Date().toISOString();
  const gradedBy = 'Текущий преподаватель';

  if (input.score === null) {
    current.grade = null;
  } else if (
    !current.grade ||
    current.grade.score !== input.score ||
    current.grade.maxScore !== series.task.maxScore
  ) {
    current.grade = {
      score: input.score,
      maxScore: series.task.maxScore,
      gradedAt: now,
      gradedBy,
    };
  }
  current.overallFeedback = {
    html: input.overallFeedbackHtml,
    updatedAt: input.overallFeedbackHtml ? now : null,
    updatedBy: input.overallFeedbackHtml ? gradedBy : null,
  };
  current.lineComments = input.lineComments.map((comment) => ({
    id: comment.id,
    filePath: comment.filePath,
    side: comment.side,
    lineNumber: comment.lineNumber,
    endSide: comment.endSide,
    endLineNumber: comment.endLineNumber,
    html: comment.html,
    authorName: comment.authorName || gradedBy,
    authorUsername: comment.authorUsername || 'mit-teacher',
    createdAt: comment.createdAt || comment.updatedAt || now,
    updatedAt: comment.updatedAt || now,
    replies: comment.replies?.map((reply) => ({
      id: reply.id,
      html: reply.html,
      authorName: reply.authorName || gradedBy,
      authorUsername: reply.authorUsername || 'mit-teacher',
      createdAt: reply.createdAt || reply.updatedAt || now,
      updatedAt: reply.updatedAt || now,
    })),
  }));

  if (current.grade) {
    upsertMockCourseAttemptGrade({
      courseSlug: input.courseSlug,
      taskId: input.taskId,
      studentUsername: input.studentUsername,
      attemptNumber: input.attemptId,
      score: current.grade.score,
      gradedAt: current.grade.gradedAt,
      gradedBy: current.grade.gradedBy,
    });
  }

  return fetchAttemptReview(input);
}

export async function createAttemptReviewCommentReply(
  input: CreateAttemptReviewCommentReplyInput
): Promise<AttemptReviewLineCommentReply> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const comment = findLineCommentOrThrow(input);
  const now = new Date().toISOString();
  const reply: AttemptReviewLineCommentReply = {
    id: `reply-${input.commentId}-${Date.now()}`,
    html: input.html,
    authorName: MOCK_REPLY_AUTHOR.name,
    authorUsername: MOCK_REPLY_AUTHOR.username,
    createdAt: now,
    updatedAt: now,
  };

  comment.replies = [...(comment.replies ?? []), reply];

  return { ...reply };
}

export async function updateAttemptReviewCommentReply(
  input: UpdateAttemptReviewCommentReplyInput
): Promise<AttemptReviewLineCommentReply> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const comment = findLineCommentOrThrow(input);
  const reply = comment.replies?.find((item) => item.id === input.replyId);

  if (!reply) {
    throw new Error(
      `Reply ${input.replyId} is not available in mock review data`
    );
  }

  reply.html = input.html;
  reply.updatedAt = new Date().toISOString();

  return { ...reply };
}

export async function deleteAttemptReviewCommentReply(
  input: DeleteAttemptReviewCommentReplyInput
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 180));

  const comment = findLineCommentOrThrow(input);
  const replies = comment.replies ?? [];

  if (!replies.some((reply) => reply.id === input.replyId)) {
    throw new Error(
      `Reply ${input.replyId} is not available in mock review data`
    );
  }

  comment.replies = replies.filter((reply) => reply.id !== input.replyId);
}

function getReviewSeries(params: AttemptReviewRouteParams): ReviewSeries {
  const key = seriesKey(params);
  const existing = reviewSeriesByKey.get(key);

  if (existing) {
    return existing;
  }

  const listAttempt = findMockCourseAttempt({
    courseSlug: params.courseSlug,
    taskId: params.taskId,
    studentUsername: params.studentUsername,
    attemptNumber: params.attemptId,
  });
  const task: AttemptReviewTask = listAttempt?.task ?? {
    id: params.taskId,
    title: `Задание #${params.taskId}`,
    maxScore: 10,
  };
  const student: AttemptReviewStudent = listAttempt?.student ?? {
    username: params.studentUsername,
    fullName: params.studentUsername,
    group: 'БПИ-231',
    subgroup: '1',
  };
  const baseSubmittedAt = listAttempt
    ? Date.parse(listAttempt.submittedAt) -
      (params.attemptId - 1) * 36 * 60 * 60 * 1000
    : Date.UTC(2026, 4, 20, 12, 0, 0);
  const deadlineAt =
    listAttempt?.deadlineAt ??
    new Date(baseSubmittedAt + 48 * 60 * 60 * 1000).toISOString();
  const maxAttemptNumber = Math.max(4, params.attemptId);
  const attempts = Array.from({ length: maxAttemptNumber }, (_, index) => {
    const attemptNumber = index + 1;
    const submittedAt = new Date(
      baseSubmittedAt + index * 36 * 60 * 60 * 1000
    ).toISOString();
    const savedGrade =
      attemptNumber === params.attemptId && listAttempt?.grade
        ? listAttempt.grade
        : attemptNumber < params.attemptId
          ? {
              score: Number((task.maxScore * (0.55 + index * 0.13)).toFixed(1)),
              maxScore: task.maxScore,
              gradedAt: new Date(
                Date.parse(submittedAt) + 8 * 60 * 60 * 1000
              ).toISOString(),
              gradedBy: 'Елизавета Громова',
            }
          : null;

    return {
      attemptNumber,
      submittedAt,
      deadlineAt,
      files: buildSnapshot(attemptNumber),
      grade: savedGrade,
      overallFeedback: buildFeedback(attemptNumber, savedGrade),
      lineComments: buildComments(attemptNumber),
    } satisfies StoredAttemptReview;
  });
  const series = { task, student, attempts };

  reviewSeriesByKey.set(key, series);
  return series;
}

function seriesKey({
  courseSlug,
  taskId,
  studentUsername,
}: AttemptReviewRouteParams): string {
  return `${courseSlug}:${taskId}:${studentUsername}`;
}

function findAttemptOrThrow(
  series: ReviewSeries,
  attemptNumber: number
): StoredAttemptReview {
  const attempt = series.attempts.find(
    (item) => item.attemptNumber === attemptNumber
  );

  if (!attempt) {
    throw new Error(
      `Attempt #${attemptNumber} is not available in mock review data`
    );
  }

  return attempt;
}

function findPreviousAttempt(
  series: ReviewSeries,
  attemptNumber: number
): StoredAttemptReview | null {
  return (
    [...series.attempts]
      .reverse()
      .find((item) => item.attemptNumber < attemptNumber) ?? null
  );
}

function findLineCommentOrThrow(
  params: AttemptReviewRouteParams & { commentId: string }
): AttemptReviewLineComment {
  const series = getReviewSeries(params);
  const current = findAttemptOrThrow(series, params.attemptId);
  const comment = current.lineComments.find(
    (item) => item.id === params.commentId
  );

  if (!comment) {
    throw new Error(
      `Comment ${params.commentId} is not available in mock review data`
    );
  }

  return comment;
}

function buildChangedFiles(
  previousFiles: Record<string, string>,
  currentFiles: Record<string, string>
): AttemptReviewChangedFile[] {
  const paths = Array.from(
    new Set([...Object.keys(previousFiles), ...Object.keys(currentFiles)])
  ).sort();

  return paths
    .map((path) => {
      const oldText = previousFiles[path] ?? '';
      const newText = currentFiles[path] ?? '';

      if (oldText === newText) {
        return null;
      }

      const status: AttemptReviewFileStatus =
        !(path in previousFiles) && path in currentFiles
          ? 'added'
          : path in previousFiles && !(path in currentFiles)
            ? 'deleted'
            : 'changed';
      const diff = parseDiffFromFile(
        {
          name: path,
          contents: oldText,
          cacheKey: `${path}:old:${hashText(oldText)}`,
        },
        {
          name: path,
          contents: newText,
          cacheKey: `${path}:new:${hashText(newText)}`,
        },
        { context: 4 }
      );
      const typedDiff: FileDiffMetadata = {
        ...diff,
        type:
          status === 'added'
            ? 'new'
            : status === 'deleted'
              ? 'deleted'
              : 'change',
      };

      return {
        path,
        status,
        contents: { oldText, newText },
        addedLines: countAddedLines(typedDiff),
        deletedLines: countDeletedLines(typedDiff),
        diff: typedDiff,
      };
    })
    .filter((file): file is AttemptReviewChangedFile => file !== null);
}

function toHistoryItem(
  series: ReviewSeries,
  attempt: StoredAttemptReview
): AttemptReviewHistoryItem {
  const previous = findPreviousAttempt(series, attempt.attemptNumber);
  const changedFiles = buildChangedFiles(previous?.files ?? {}, attempt.files);

  return {
    attemptNumber: attempt.attemptNumber,
    submittedAt: attempt.submittedAt,
    score: attempt.grade?.score ?? null,
    maxScore: series.task.maxScore,
    addedLines: changedFiles.reduce((sum, file) => sum + file.addedLines, 0),
    deletedLines: changedFiles.reduce(
      (sum, file) => sum + file.deletedLines,
      0
    ),
    commentCount: attempt.lineComments.length,
  };
}

function countAddedLines(diff: FileDiffMetadata): number {
  return diff.hunks.reduce((sum, hunk) => sum + hunk.additionLines, 0);
}

function countDeletedLines(diff: FileDiffMetadata): number {
  return diff.hunks.reduce((sum, hunk) => sum + hunk.deletionLines, 0);
}

function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return String(hash);
}

function cloneLineComment(
  comment: AttemptReviewLineComment
): AttemptReviewLineComment {
  return {
    ...comment,
    replies: comment.replies?.map((reply) => ({ ...reply })),
  };
}

function buildSnapshot(attemptNumber: number): Record<string, string> {
  const snapshots: Record<number, Record<string, string>> = {
    1: {
      'README.md': '# Практика\n\nПервое решение задачи.\n',
      'src/main.ts': [
        'export function calculateTotal(items: number[]) {',
        '  let total = 0;',
        '  for (const item of items) {',
        '    total += item;',
        '  }',
        '  return total;',
        '}',
        '',
      ].join('\n'),
    },
    2: {
      'README.md': '# Практика\n\nДобавлена обработка пустого списка.\n',
      'src/main.ts': [
        'import { formatTotal } from "./utils/format";',
        '',
        'export function calculateTotal(items: number[]) {',
        '  if (items.length === 0) {',
        '    return 0;',
        '  }',
        '',
        '  return items.reduce((total, item) => total + item, 0);',
        '}',
        '',
        'export function renderTotal(items: number[]) {',
        '  return formatTotal(calculateTotal(items));',
        '}',
        '',
      ].join('\n'),
      'src/utils/format.ts': [
        'export function formatTotal(value: number) {',
        '  return `${value} points`;',
        '}',
        '',
      ].join('\n'),
    },
    3: {
      'src/components/Summary.tsx': [
        'import { renderTotal } from "../main";',
        '',
        'export function Summary({ items }: { items: number[] }) {',
        '  return <strong>{renderTotal(items)}</strong>;',
        '}',
        '',
      ].join('\n'),
      'src/main.ts': [
        'import { formatTotal } from "./utils/format";',
        '',
        'export function calculateTotal(items: number[]) {',
        '  return items.reduce((total, item) => total + Math.max(0, item), 0);',
        '}',
        '',
        'export function renderTotal(items: number[]) {',
        '  return formatTotal(calculateTotal(items));',
        '}',
        '',
      ].join('\n'),
      'src/utils/format.ts': [
        'export function formatTotal(value: number) {',
        '  return new Intl.NumberFormat("ru-RU", {',
        '    maximumFractionDigits: 1,',
        '  }).format(value);',
        '}',
        '',
      ].join('\n'),
    },
  };

  if (attemptNumber === 4) {
    return buildStressSnapshot(snapshots[3]);
  }

  return snapshots[Math.min(attemptNumber, 3)] ?? snapshots[3];
}

function buildStressSnapshot(
  baseSnapshot: Record<string, string>
): Record<string, string> {
  return {
    ...baseSnapshot,
    ...Object.fromEntries(
      Array.from({ length: 160 }, (_, fileIndex) => {
        const fileNumber = fileIndex + 1;
        const directory = String(Math.floor(fileIndex / 20) + 1).padStart(
          2,
          '0'
        );
        const fileName = String(fileNumber).padStart(3, '0');

        return [
          `stress/module-${directory}/generated-${fileName}.ts`,
          buildStressFileContents(fileNumber),
        ];
      })
    ),
  };
}

function buildStressFileContents(fileNumber: number): string {
  return Array.from({ length: 120 }, (_, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const value = fileNumber * 1000 + lineNumber;

    return `export const stress_${fileNumber}_${lineNumber} = ${value};`;
  }).join('\n');
}

function buildFeedback(
  attemptNumber: number,
  grade: AttemptReviewGrade | null
): AttemptReviewRichFeedback {
  if (!grade) {
    return { ...EMPTY_FEEDBACK };
  }

  return {
    html:
      attemptNumber === 1
        ? '<p><strong>Хорошее начало.</strong> Проверьте стиль именования и добавьте обработку пустых входных данных.</p>'
        : '<p>Решение стало устойчивее. Обратите внимание на <code>formatTotal</code> и локализацию вывода.</p>',
    updatedAt: grade.gradedAt,
    updatedBy: grade.gradedBy,
  };
}

function buildComments(attemptNumber: number): AttemptReviewLineComment[] {
  if (attemptNumber === 4) {
    return [];
  }

  if (attemptNumber === 1) {
    return [];
  }

  if (attemptNumber === 2) {
    return [
      {
        id: 'comment-a2-main-4',
        filePath: 'src/main.ts',
        side: 'additions',
        lineNumber: 4,
        html: '<p>Проверка пустого массива нужна, но после неё стоит добавить тест на этот случай.</p>',
        authorName: 'Елизавета Громова',
        authorUsername: 'egromova',
        createdAt: '2026-05-22T10:20:00.000Z',
        updatedAt: '2026-05-22T10:20:00.000Z',
        replies: [
          {
            id: 'reply-a2-main-4-1',
            html: '<p>Согласен, добавлю тест отдельным коммитом.</p>',
            authorName: 'Иван Петров',
            authorUsername: 'student1',
            createdAt: '2026-05-22T11:05:00.000Z',
            updatedAt: '2026-05-22T11:05:00.000Z',
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'comment-a3-main-4',
      filePath: 'src/main.ts',
      side: 'additions',
      lineNumber: 4,
      html: '<p>Классно, что отрицательные значения обработаны. Зафиксируйте это в тестах.</p>',
      authorName: 'Елизавета Громова',
      authorUsername: 'egromova',
      createdAt: '2026-05-24T11:15:00.000Z',
      updatedAt: '2026-05-24T11:15:00.000Z',
    },
    {
      id: 'comment-a3-summary-3',
      filePath: 'src/components/Summary.tsx',
      side: 'additions',
      lineNumber: 3,
      html: '<p>Компонент маленький и понятный. Можно добавить ссылку на <a href="/docs/components">гайд по компонентам</a>.</p>',
      authorName: 'Елизавета Громова',
      authorUsername: 'egromova',
      createdAt: '2026-05-24T11:18:00.000Z',
      updatedAt: '2026-05-24T11:18:00.000Z',
    },
  ];
}
