import { parseDiffFromFile } from '@pierre/diffs';
import { http, HttpResponse } from 'msw';
import {
  accessDenial,
  resolveAttemptAccess,
  resolveStudentAccess,
  resolveStudentIdAccess,
} from '@/app/mock-backend/participant-access';
import {
  mockBackend,
  mockUserName,
  type MockAttempt,
} from '@/app/mock-backend/state';
import { gradeToNumber } from '@/features/course/model/grade';
import type { AttemptNumber } from '@/features/course/model/identity';

// Working participant-resource wire contract pending backend confirmation #113.
const attemptLocatorHandlers = [
  http.get(
    '/api/v1/courses/:courseId/tasks/:taskId/attempts/:studentUsername/:attemptNumber',
    ({ params }) => {
      const result = resolveStudentAccess(
        String(params.courseId),
        String(params.studentUsername)
      );
      switch (result.status) {
        case 'unauthenticated':
          return new HttpResponse(null, { status: 401 });
        case 'not-found':
          return HttpResponse.json({ status: 'not-found' }, { status: 404 });
        case 'forbidden':
          return HttpResponse.json({ status: 'forbidden' }, { status: 403 });
      }
      // Working AttemptNumber -> AttemptId mapping pending the backend's #85:
      // the number is scoped to Course + Task + Student, never a global identity.
      const attempt = mockBackend.state.attempts.find(
        (attempt) =>
          attempt.courseId === params.courseId &&
          attempt.taskId === params.taskId &&
          attempt.studentId === result.studentId &&
          String(attempt.attemptNumber) === params.attemptNumber
      );
      if (!attempt)
        return HttpResponse.json({ status: 'not-found' }, { status: 404 });
      const { id, studentId, taskId, attemptNumber } = attempt;
      return HttpResponse.json({
        status: 'found',
        attempt: { id, studentId, taskId, attemptNumber },
      });
    }
  ),
];

// Working wire contracts pending backend confirmation #113. Every read answers
// from the canonical Attempts and Reviews; denials carry no body.
export const attemptReviewHandlers = [
  ...attemptLocatorHandlers,
  http.get('/api/v1/courses/:courseId/attempts/:attemptId', ({ params }) => {
    const access = resolveAttemptAccess(
      String(params.courseId),
      String(params.attemptId)
    );
    if (access.status !== 'found') return accessDenial(access.status);
    const { attempt } = access;
    const { tasks, users } = mockBackend.state;
    const task = tasks.find(
      ({ courseId, id }) =>
        courseId === attempt.courseId && id === attempt.taskId
    );
    const student = users.find(({ id }) => id === attempt.studentId);
    if (!task || !student) throw new Error('The mock Attempt is incomplete');
    return HttpResponse.json({
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      submittedAt: attempt.submittedAt,
      deadlineAt: task.deadlineAt,
      task: { title: task.title, maxGrade: gradeToNumber(task.maxGrade) },
      student: { id: student.id, ...mockUserName(student) },
    });
  }),
  http.get(
    '/api/v1/courses/:courseId/tasks/:taskId/students/:studentId/attempts',
    ({ params }) => {
      const access = resolveStudentIdAccess(
        String(params.courseId),
        String(params.studentId)
      );
      if (access.status !== 'found') return accessDenial(access.status);
      const attempts = studentAttempts(
        String(params.courseId),
        String(params.taskId),
        access.studentId
      );
      return HttpResponse.json({
        attempts: [...attempts].reverse().map((attempt) => {
          const review = mockBackend.state.reviews.find(
            ({ attemptId }) => attemptId === attempt.id
          );
          return {
            id: attempt.id,
            attemptNumber: attempt.attemptNumber,
            submittedAt: attempt.submittedAt,
            review: review
              ? {
                  revision: review.revision.number,
                  grade: gradeToNumber(review.revision.grade),
                }
              : null,
            ...countChangedLines(changedFiles(attempt)),
            commentCount: review?.revision.comments.length ?? 0,
          };
        }),
      });
    }
  ),
  http.get(
    '/api/v1/courses/:courseId/attempts/:attemptId/material',
    ({ params }) => {
      const access = resolveAttemptAccess(
        String(params.courseId),
        String(params.attemptId)
      );
      if (access.status !== 'found') return accessDenial(access.status);
      return HttpResponse.json({
        baselineAttemptNumber:
          findBaseline(access.attempt)?.attemptNumber ?? null,
        files: changedFiles(access.attempt),
      });
    }
  ),
];

function studentAttempts(
  courseId: string,
  taskId: string,
  studentId: string
): MockAttempt[] {
  return mockBackend.state.attempts
    .filter(
      (attempt) =>
        attempt.courseId === courseId &&
        attempt.taskId === taskId &&
        attempt.studentId === studentId
    )
    .sort((first, second) => first.attemptNumber - second.attemptNumber);
}

/** The Student's previous Attempt at the Task, or an empty tree. */
function findBaseline(attempt: MockAttempt): MockAttempt | undefined {
  return studentAttempts(attempt.courseId, attempt.taskId, attempt.studentId)
    .filter(({ attemptNumber }) => attemptNumber < attempt.attemptNumber)
    .at(-1);
}

type ChangedFile = {
  path: string;
  status: 'added' | 'deleted' | 'changed';
  oldText: string;
  newText: string;
};

function changedFiles(attempt: MockAttempt): ChangedFile[] {
  const baseline = findBaseline(attempt);
  const previousFiles = baseline ? buildSnapshot(baseline.attemptNumber) : {};
  const currentFiles = buildSnapshot(attempt.attemptNumber);
  const paths = Array.from(
    new Set([...Object.keys(previousFiles), ...Object.keys(currentFiles)])
  ).sort();

  return paths.flatMap((path): ChangedFile[] => {
    const oldText = previousFiles[path] ?? '';
    const newText = currentFiles[path] ?? '';
    if (oldText === newText) return [];
    return [
      {
        path,
        status: fileStatus(path, previousFiles, currentFiles),
        oldText,
        newText,
      },
    ];
  });
}

function fileStatus(
  path: string,
  previousFiles: Record<string, string>,
  currentFiles: Record<string, string>
): ChangedFile['status'] {
  if (!(path in previousFiles)) return 'added';
  if (!(path in currentFiles)) return 'deleted';
  return 'changed';
}

function countChangedLines(files: ChangedFile[]) {
  let addedLines = 0;
  let deletedLines = 0;
  for (const { path, oldText, newText } of files) {
    const diff = parseDiffFromFile(
      { name: path, contents: oldText },
      { name: path, contents: newText }
    );
    for (const hunk of diff.hunks) {
      addedLines += hunk.additionLines;
      deletedLines += hunk.deletionLines;
    }
  }
  return { addedLines, deletedLines };
}

// Deterministic snapshots by Attempt number until the manifest of REV3.2.
function buildSnapshot(attemptNumber: AttemptNumber): Record<string, string> {
  const snapshots: Record<number, Record<string, string>> = {
    1: {
      'README.md': [
        '# Практика',
        '',
        'Первое решение задачи.',
        '',
        '## Что сделано',
        '',
        '- [x] Функция `calculateTotal`',
        '- [ ] Обработка пустого списка',
        '',
        'Подробности в [описании задания](https://example.com/task).',
        '',
      ].join('\n'),
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
      'README.md': [
        '# Практика',
        '',
        'Добавлена обработка **пустого** списка.',
        '',
        '## Что сделано',
        '',
        '- [x] Функция `calculateTotal`',
        '- [x] Обработка пустого списка',
        '- [x] Форматирование итога',
        '',
        'Подробности в [описании задания](https://example.com/task).',
        '',
      ].join('\n'),
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
