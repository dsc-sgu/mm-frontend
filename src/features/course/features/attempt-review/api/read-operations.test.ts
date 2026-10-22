import { http } from 'msw';
import * as v from 'valibot';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  invalidBody,
  undeclaredStatus,
  unreadableBody,
} from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { accessDenial } from '@/app/mock-backend/participant-access';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { reply } from '@/app/testing/reply';
import { GradeSchema } from '@/features/course/model/grade';
import type { AttemptId } from '@/features/course/model/identity';
import { loadAttemptMaterial } from './load-material';
import { loadStudentAttempts } from './load-student-attempts';
import { loadAttemptSummary } from './load-summary';

const { anna, sasha, petya } = accessWorld.users;
const [sashaFirst, sashaSecond, petyaFirst] = reviewWorld.attempts;
const COURSE_ID = accessWorld.courses.algorithms.id;
const ATTEMPT_URL = `/api/v1/courses/${COURSE_ID}/attempts/${sashaSecond.id}`;

const STUDENT_ATTEMPT = {
  id: sashaFirst.id,
  attemptNumber: 1,
  submittedAt: '2026-05-20T09:00:00.000Z',
  review: { revision: 2, grade: 7.5 },
  addedLines: 3,
  deletedLines: 0,
  commentCount: 2,
};
const CHANGED_FILE = {
  path: 'a.ts',
  status: 'changed',
  oldText: 'a\n',
  newText: 'b\n',
};

type Operation = {
  name: string;
  url: string;
  run: () => Promise<unknown>;
  valid: Record<string, unknown>;
  invalid: [field: string, patch: Record<string, unknown>][];
};

const operations: Operation[] = [
  {
    name: 'load-attempt-summary',
    url: ATTEMPT_URL,
    run: () => loadAttemptSummary(COURSE_ID, sashaSecond.id),
    valid: {
      id: sashaSecond.id,
      attemptNumber: 2,
      submittedAt: '2026-05-22T09:00:00.000Z',
      deadlineAt: '2026-05-25T20:59:59.000Z',
      task: { title: 'Сортировки', maxGrade: 10 },
      student: { id: sasha.id, lastName: '', firstName: 'Саша' },
    },
    invalid: [
      ['attemptNumber', { attemptNumber: 0 }],
      ['maxGrade', { task: { title: 'Сортировки', maxGrade: 10.0001 } }],
      [
        'student',
        { student: { id: 'sasha', lastName: '', firstName: 'Саша' } },
      ],
      ['submittedAt', { submittedAt: 'вчера' }],
    ],
  },
  {
    name: 'load-student-attempts',
    url: `/api/v1/courses/${COURSE_ID}/tasks/1/students/${sasha.id}/attempts`,
    run: () => loadStudentAttempts(COURSE_ID, '1', sasha.id),
    valid: { attempts: [STUDENT_ATTEMPT] },
    invalid: [
      [
        'a Grade without its revision',
        { attempts: [{ ...STUDENT_ATTEMPT, review: { grade: 7.5 } }] },
      ],
      ['attempts', { attempts: null }],
    ],
  },
  {
    name: 'load-attempt-material',
    url: `${ATTEMPT_URL}/material`,
    run: () => loadAttemptMaterial(COURSE_ID, sashaSecond.id),
    valid: { baselineAttemptNumber: 1, files: [CHANGED_FILE] },
    invalid: [
      ['baselineAttemptNumber', { baselineAttemptNumber: 0 }],
      ['status', { files: [{ ...CHANGED_FILE, status: 'renamed' }] }],
      ['path', { files: [{ ...CHANGED_FILE, path: '' }] }],
    ],
  },
];

async function material(attemptId: AttemptId) {
  const result = await loadAttemptMaterial(COURSE_ID, attemptId);
  if (result.status !== 'found') throw new Error('Expected the material');
  return result.material;
}

beforeEach(() => {
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: anna.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

describe.each(operations)('TR-05: $name statuses', (operation) => {
  test('200 resolves the validated body', async () => {
    server.use(http.get(operation.url, reply(200, operation.valid)));

    await expect(operation.run()).resolves.toBeDefined();
  });

  // 403 is not a denial by identity: a foreign resource answers 404 (ADR 0006).
  test.each([401, 403, 500])('undeclared %i rejects', async (status) => {
    server.use(http.get(operation.url, undeclaredStatus(status)));

    await expect(operation.run()).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: operation.name,
      reason: { kind: 'unexpected-http-status', status },
    });
  });

  test('a body-less 404 resolves as the declared denial', async () => {
    server.use(http.get(operation.url, () => accessDenial('not-found')));

    await expect(operation.run()).resolves.toEqual({ status: 'not-found' });
  });

  test('an unreadable body rejects', async () => {
    server.use(http.get(operation.url, unreadableBody));

    await expect(operation.run()).rejects.toMatchObject({
      operation: operation.name,
      kind: 'unreadable-body',
    });
  });

  test.each(operation.invalid)(
    '200 with invalid %s rejects',
    async (_, patch) => {
      server.use(
        http.get(operation.url, invalidBody({ ...operation.valid, ...patch }))
      );

      await expect(operation.run()).rejects.toMatchObject({
        operation: operation.name,
        kind: 'invalid-response',
      });
    }
  );
});

describe('Attempt projections from the canonical state', () => {
  test('the header names the Task, Student, number and times of the Attempt', async () => {
    await expect(
      loadAttemptSummary(COURSE_ID, sashaSecond.id)
    ).resolves.toEqual({
      status: 'found',
      summary: {
        id: sashaSecond.id,
        attemptNumber: 2,
        submittedAt: '2026-05-22T09:00:00.000Z',
        deadlineAt: '2026-05-25T20:59:59.000Z',
        task: { title: 'Сортировки', maxGrade: v.parse(GradeSchema, 10) },
        student: { id: sasha.id, lastName: '', firstName: 'Саша' },
      },
    });
  });

  test('the material compares an Attempt with the previous one of the Student', async () => {
    const second = await material(sashaSecond.id);
    const first = await material(sashaFirst.id);

    expect(second.baselineAttemptNumber).toBe(1);
    expect(second.changedFiles.map(({ path }) => path)).toEqual([
      'README.md',
      'src/main.ts',
      'src/utils/format.ts',
    ]);
    expect(first.baselineAttemptNumber).toBeNull();
    expect(first.changedFiles.map(({ status }) => status)).toEqual([
      'added',
      'added',
    ]);
    expect(first.changedFiles[1].diff.type).toBe('new');
  });

  test.each([
    ['summary', `attempts/${petyaFirst.id}`],
    ['material', `attempts/${petyaFirst.id}/material`],
    ['Review', `attempts/${petyaFirst.id}/review`],
    ['selector', `tasks/1/students/${petya.id}/attempts`],
  ])(
    "a denied %s carries nothing of another Student's Attempt",
    async (_, path) => {
      mockBackend.state.session = {
        userId: sasha.id,
        expiresAt: SESSION_EXPIRES_AT,
      };
      // Inspect the backend wire response, independently of DTO mapping.
      // eslint-disable-next-line no-restricted-globals
      const response = await fetch(
        `http://localhost:3000/api/v1/courses/${COURSE_ID}/${path}`
      );
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('');
    }
  );
});
