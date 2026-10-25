import { QueryClient, type QueryKey } from '@tanstack/react-query';
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
import type { UserId } from '@/features/auth/model/identity';
import { GradeSchema } from '@/features/course/model/grade';
import { studentAttemptsOptions } from '@/features/course/features/attempt-review/api/queries';
import { saveReview } from '@/features/course/features/review/api/mock';
import { loadAttemptHistory } from './load-attempt-history';
import { markAttemptUpdatesSeen } from './mark-updates-seen';
import { attemptHistoryOptions } from './queries';

const { anna, boris, sasha, petya } = accessWorld.users;
const [sashaFirst, sashaSecond, petyaFirst] = reviewWorld.attempts;
const COURSE_ID = accessWorld.courses.algorithms.id;
const HISTORY_URL = `/api/v1/courses/${COURSE_ID}/tasks/1/students/${sasha.id}/attempt-history`;
const SEEN_URL = `/api/v1/courses/${COURSE_ID}/attempts/${sashaFirst.id}/updates-seen`;

const HISTORY_ATTEMPT = {
  id: sashaFirst.id,
  attemptNumber: 1,
  submittedAt: '2026-05-20T09:00:00.000Z',
  review: {
    revision: 2,
    grade: 7.5,
    publishedAt: '2026-05-20T13:05:00.000Z',
    publishedBy: { id: boris.id, lastName: '', firstName: 'Борис' },
  },
  updates: 'unseen',
};

function signIn(userId: UserId) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

async function history(studentId: UserId) {
  const result = await loadAttemptHistory(COURSE_ID, '1', studentId);
  if (result.status !== 'found') {
    throw new Error('Expected the history');
  }
  return result.attempts;
}

beforeEach(() => {
  mockBackend.reset('world:review');
  signIn(sasha.id);
});

describe('REV-04: the attempt history carries the Review revision', () => {
  test('each Attempt has its number, submission time, Grade and revision', async () => {
    await expect(history(sasha.id)).resolves.toEqual([
      {
        id: sashaSecond.id,
        attemptNumber: 2,
        submittedAt: '2026-05-22T09:00:00.000Z',
        review: null,
        updates: 'seen',
      },
      {
        ...HISTORY_ATTEMPT,
        review: {
          ...HISTORY_ATTEMPT.review,
          revision: 2,
          grade: v.parse(GradeSchema, 7.5),
        },
      },
    ]);
  });

  test('a published revision shows in the history with its number', async () => {
    signIn(anna.id);
    await saveReview({
      courseId: COURSE_ID,
      attemptId: sashaSecond.id,
      grade: v.parse(GradeSchema, 9),
      overallFeedbackHtml: '',
      comments: [],
    });
    signIn(sasha.id);

    const [second] = await history(sasha.id);
    expect(second.review).toMatchObject({
      revision: 1,
      grade: v.parse(GradeSchema, 9),
      publishedBy: { id: anna.id },
    });
    // A new revision is an update the Student has not seen yet.
    expect(second.updates).toBe('unseen');
  });
});

describe('mm-79: the Student sees only their own history', () => {
  test("another Student's history is denied as if it did not exist", async () => {
    signIn(petya.id);

    await expect(loadAttemptHistory(COURSE_ID, '1', sasha.id)).resolves.toEqual(
      { status: 'not-found' }
    );
  });

  test('a repeated read creates neither Attempts nor marks', async () => {
    const before = structuredClone(mockBackend.state);

    const first = await history(sasha.id);
    const second = await history(sasha.id);

    expect(second).toEqual(first);
    expect(mockBackend.state).toEqual(before);
  });

  test('marking updates seen changes the backend and survives a reread', async () => {
    await expect(
      markAttemptUpdatesSeen(COURSE_ID, sashaFirst.id)
    ).resolves.toEqual({ status: 'seen' });

    const [, first] = await history(sasha.id);
    expect(first.updates).toBe('seen');
  });

  test("another Student cannot mark the Attempt's updates", async () => {
    signIn(petya.id);

    await expect(
      markAttemptUpdatesSeen(COURSE_ID, sashaFirst.id)
    ).resolves.toEqual({ status: 'not-found' });
    signIn(sasha.id);
    const [, first] = await history(sasha.id);
    expect(first.updates).toBe('unseen');
  });
});

describe('REV-05: selector and history read one state', () => {
  test('the selector and the history show the same Grade with the same revision', async () => {
    signIn(anna.id);
    const queryClient = new QueryClient();

    const [historyResult, selectorResult] = await Promise.all([
      queryClient.query(
        attemptHistoryOptions(anna.id, COURSE_ID, '1', sasha.id)
      ),
      queryClient.query(
        studentAttemptsOptions(anna.id, COURSE_ID, '1', sasha.id)
      ),
    ]);
    if (historyResult.status !== 'found' || selectorResult.status !== 'found') {
      throw new Error('Expected both lists');
    }

    expect(historyResult.attempts.map(({ id }) => id)).toEqual(
      selectorResult.attempts.map(({ id }) => id)
    );
    const selected = selectorResult.attempts[1].review;
    expect(selected).not.toBeNull();
    expect(historyResult.attempts[1].review).toMatchObject({
      revision: selected?.revision,
      grade: selected?.grade,
    });
  });

  type AttemptList =
    | { status: 'found'; attempts: { id: string; attemptNumber: number }[] }
    | { status: 'not-found' };

  type ListRead = {
    list: string;
    key: (studentId: UserId) => QueryKey;
    read: (queryClient: QueryClient, studentId: UserId) => Promise<AttemptList>;
  };

  test.each<ListRead>([
    {
      list: 'history',
      key: (studentId) =>
        attemptHistoryOptions(anna.id, COURSE_ID, '1', studentId).queryKey,
      read: (queryClient, studentId) =>
        queryClient.query(
          attemptHistoryOptions(anna.id, COURSE_ID, '1', studentId)
        ),
    },
    {
      list: 'selector',
      key: (studentId) =>
        studentAttemptsOptions(anna.id, COURSE_ID, '1', studentId).queryKey,
      read: (queryClient, studentId) =>
        queryClient.query(
          studentAttemptsOptions(anna.id, COURSE_ID, '1', studentId)
        ),
    },
  ])(
    'Attempts #1 of two Students share no $list cache entry',
    async ({ key, read: readList }) => {
      signIn(anna.id);
      const queryClient = new QueryClient();
      const read = (studentId: UserId) => readList(queryClient, studentId);

      const [sashaList, petyaList] = await Promise.all([
        read(sasha.id),
        read(petya.id),
      ]);
      if (sashaList.status !== 'found' || petyaList.status !== 'found') {
        throw new Error('Expected both lists');
      }

      expect(key(sasha.id)).not.toEqual(key(petya.id));
      expect(sashaList.attempts.at(-1)).toMatchObject({
        id: sashaFirst.id,
        attemptNumber: 1,
      });
      expect(petyaList.attempts).toEqual([
        expect.objectContaining({ id: petyaFirst.id, attemptNumber: 1 }),
      ]);
    }
  );
});

type Operation = {
  name: string;
  method: 'get' | 'post';
  url: string;
  run: () => Promise<unknown>;
  success: { status: number; body?: unknown };
  invalid: [field: string, body: unknown][];
};

const operations: Operation[] = [
  {
    name: 'load-attempt-history',
    method: 'get',
    url: HISTORY_URL,
    run: () => loadAttemptHistory(COURSE_ID, '1', sasha.id),
    success: { status: 200, body: { attempts: [HISTORY_ATTEMPT] } },
    invalid: [
      [
        'a Grade without its revision',
        {
          attempts: [
            {
              ...HISTORY_ATTEMPT,
              review: { ...HISTORY_ATTEMPT.review, revision: undefined },
            },
          ],
        },
      ],
      [
        'a publisher without UserId',
        {
          attempts: [
            {
              ...HISTORY_ATTEMPT,
              review: {
                ...HISTORY_ATTEMPT.review,
                publishedBy: { lastName: '', firstName: 'Борис' },
              },
            },
          ],
        },
      ],
      [
        'unknown updates',
        { attempts: [{ ...HISTORY_ATTEMPT, updates: 'read' }] },
      ],
      ['attempts', { attempts: null }],
    ],
  },
  {
    name: 'mark-attempt-updates-seen',
    method: 'post',
    url: SEEN_URL,
    run: () => markAttemptUpdatesSeen(COURSE_ID, sashaFirst.id),
    success: { status: 204 },
    // The mark answers without a body; 200 with one is not its contract.
    invalid: [],
  },
];

describe.each(operations)('TR-05: $name statuses', (operation) => {
  const route = http[operation.method];

  test('a declared success resolves', async () => {
    server.use(
      route(
        operation.url,
        reply(operation.success.status, operation.success.body)
      )
    );

    await expect(operation.run()).resolves.toBeDefined();
  });

  // 403 is not a denial by identity: a foreign resource answers 404 (ADR 0006).
  test.each([401, 403, 500])('undeclared %i rejects', async (status) => {
    server.use(route(operation.url, undeclaredStatus(status)));

    await expect(operation.run()).rejects.toMatchObject({
      name: 'OperationFailure',
      operation: operation.name,
      reason: { kind: 'unexpected-http-status', status },
    });
  });

  test('a body-less 404 resolves as the declared denial', async () => {
    server.use(route(operation.url, () => accessDenial('not-found')));

    await expect(operation.run()).resolves.toEqual({ status: 'not-found' });
  });

  if (operation.invalid.length === 0) {
    return;
  }

  test('an unreadable body rejects', async () => {
    server.use(route(operation.url, unreadableBody));

    await expect(operation.run()).rejects.toMatchObject({
      operation: operation.name,
      kind: 'unreadable-body',
    });
  });

  test.each(operation.invalid)('200 with %s rejects', async (_, body) => {
    server.use(route(operation.url, invalidBody(body)));

    await expect(operation.run()).rejects.toMatchObject({
      operation: operation.name,
      kind: 'invalid-response',
    });
  });
});
