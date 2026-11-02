import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http } from 'msw';
import { expect, test } from 'vitest';
import { getPageDocument } from '@/app/mock-backend/page-documents';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { createQueryClient } from '@/app/remote-data/query-client';
import { useCoursePageQuery } from './queries';

test('changing the supplied viewer reads their projection without a session query', async () => {
  mockBackend.reset('world:access');
  const { sasha, vera } = accessWorld.users;
  const course = mockBackend.state.courses.find(
    ({ id }) => id === accessWorld.courses.algorithms.id
  )!;
  const document = getPageDocument(course);
  document.studentTaskSummaries[sasha.id] = [
    { status: 'open', taskId: '1', title: 'Задание' },
  ];
  document.studentTaskSummaries[vera.id] = [
    {
      status: 'locked',
      taskId: '1',
      title: 'Задание',
      prerequisite: 'Предыдущее задание',
    },
  ];
  mockBackend.state.session = {
    userId: sasha.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
  let sessionReads = 0;
  server.use(
    http.get('/api/v1/auth/session', () => {
      sessionReads += 1;
    })
  );

  const queryClient = createQueryClient();
  const { result, rerender, unmount } = renderHook(
    ({ viewerId }) => useCoursePageQuery({ courseId: course.id, viewerId }),
    {
      initialProps: { viewerId: sasha.id },
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    }
  );

  try {
    await waitFor(() =>
      expect(result.current.data).toMatchObject({
        status: 'found',
        taskSummaries: [{ status: 'open' }],
      })
    );

    mockBackend.state.session = {
      userId: vera.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    rerender({ viewerId: vera.id });

    await waitFor(() =>
      expect(result.current.data).toMatchObject({
        status: 'found',
        taskSummaries: [{ status: 'locked' }],
      })
    );
    expect(sessionReads).toBe(0);
  } finally {
    unmount();
    queryClient.clear();
  }
});
