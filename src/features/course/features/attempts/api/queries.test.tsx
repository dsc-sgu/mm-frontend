import { http, HttpResponse } from 'msw';
import { server } from '@/app/mock-backend/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import * as v from 'valibot';
import { mockBackend, reviewWorld } from '@/app/mock-backend/state';
import { GradeSchema } from '@/features/course/model/grade';
import { courseKeys } from '@/features/course/api/queries';
import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/keys';
import { reviewKeys } from '@/features/course/features/review/api/keys';
import { taskKeys } from '@/features/course/features/task/api/queries';
import { courseAttemptsKeys, useSaveQuickGradesMutation } from './queries';

test('quick grading invalidates affected projections while preserving unrelated course reads', async () => {
  mockBackend.reset('world:review');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const courseId = reviewWorld.courses.algorithms.id;
  const attempt = reviewWorld.attempts[0];
  const viewer = reviewWorld.users.anna.id;
  const affected = [
    courseAttemptsKeys.list(courseId, {
      tasks: [],
      students: [],
      graded: 'any',
    }),
    reviewKeys.detail(viewer, courseId, attempt.id),
    attemptReviewKeys.summary(viewer, courseId, attempt.id),
    attemptReviewKeys.studentAttempts(
      viewer,
      courseId,
      attempt.taskId,
      attempt.studentId
    ),
    taskKeys.attemptHistory(
      viewer,
      courseId,
      attempt.taskId,
      attempt.studentId
    ),
  ];
  const unaffected = [
    courseKeys.byId(courseId),
    taskKeys.page(courseId, attempt.taskId),
    attemptReviewKeys.material(viewer, courseId, attempt.id),
    reviewKeys.detail(viewer, courseId, reviewWorld.attempts[1].id),
  ];
  for (const key of [...affected, ...unaffected]) {
    client.setQueryData(key, { cached: true });
  }
  const { result, unmount } = renderHook(() => useSaveQuickGradesMutation(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

  await act(async () => {
    await result.current.mutateAsync({
      courseId,
      updates: [{ attemptId: attempt.id, grade: v.parse(GradeSchema, 8) }],
    });
  });

  for (const key of affected) {
    expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(
      true
    );
  }
  for (const key of unaffected) {
    expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(
      false
    );
  }

  unmount();
  client.clear();
});

test('keeps confirmed cache effects when a later quick grade fails without retrying it', async () => {
  mockBackend.reset('world:review');
  const client = new QueryClient();
  const courseId = reviewWorld.courses.algorithms.id;
  const [first, second] = reviewWorld.attempts;
  const viewer = reviewWorld.users.anna.id;
  const firstKey = reviewKeys.detail(viewer, courseId, first.id);
  client.setQueryData(firstKey, { cached: true });
  let failedRequests = 0;
  server.use(
    http.post(
      `/api/v1/courses/${courseId}/attempts/${second.id}/review/quick-grade`,
      () => {
        failedRequests++;
        return new HttpResponse(null, { status: 503 });
      }
    )
  );
  const { result, unmount } = renderHook(() => useSaveQuickGradesMutation(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });

  await act(async () => {
    await expect(
      result.current.mutateAsync({
        courseId,
        updates: [first, second].map((attempt) => ({
          attemptId: attempt.id,
          grade: v.parse(GradeSchema, 8),
        })),
      })
    ).rejects.toMatchObject({ kind: 'unexpected-http-status' });
  });

  expect(client.getQueryState(firstKey)?.isInvalidated).toBe(true);
  expect(failedRequests).toBe(1);
  expect(mockBackend.state.reviews.some((r) => r.attemptId === second.id)).toBe(
    false
  );

  unmount();
  client.clear();
});
