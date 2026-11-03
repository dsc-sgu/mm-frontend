import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { server } from '@/app/mock-backend/node';
import { courseKeys } from '@/features/course/api/queries';
import { screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { mockBackend } from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';
import { attemptsPageQueries } from '@/features/course/features/attempts/api/queries';
import { reviewWorld } from '@/app/mock-backend/state';

test('the route preloads every list read before mounting the page', async () => {
  mockBackend.reset('world:review');

  const { router, queryClient } = renderRoutes([], '/courses/algorithms', {
    appRoutes: true,
  });
  await screen.findByRole('link', { name: 'Попытки' });

  await router.preloadRoute({
    to: '/courses/$courseSlug/attempts',
    params: { courseSlug: 'algorithms' },
  });

  const queries = attemptsPageQueries({
    courseId: reviewWorld.courses.algorithms.id,
    filters: { tasks: [], students: [], graded: 'any' },
  });

  for (const { queryKey } of Object.values(queries)) {
    await waitFor(() =>
      expect(queryClient.getQueryState(queryKey)?.status).toBe('success')
    );
  }

  expect(router.state.location.pathname).toBe('/courses/algorithms');
});

test('shows the failed page mode and retries the first failed read', async () => {
  mockBackend.reset('world:review');
  server.use(
    http.get(
      '/api/v1/courses/:courseId/attempts',
      () => new HttpResponse(null, { status: 500 })
    )
  );
  renderRoutes([], '/courses/algorithms/attempts', { appRoutes: true });

  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    expect.stringContaining('Не удалось загрузить попытки курса.')
  );
  expect(screen.queryByText('Попытки не найдены')).toBeNull();

  server.resetHandlers();
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Повторить загрузку' }));

  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});

test('closes the Course when the observed attempts read denies membership', async () => {
  mockBackend.reset('world:review');
  server.use(
    http.get('/api/v1/courses/:courseId/attempts', () => {
      mockBackend.state.memberships = mockBackend.state.memberships.filter(
        (m) =>
          m.userId !== mockBackend.state.session?.userId ||
          m.courseId !== reviewWorld.courses.algorithms.id
      );
      return new HttpResponse(null, { status: 404 });
    })
  );
  const { queryClient } = renderRoutes([], '/courses/algorithms/attempts', {
    appRoutes: true,
  });

  await screen.findByText('Страница не найдена');
  await waitFor(() =>
    expect(
      queryClient.getQueryCache().findAll({
        queryKey: courseKeys.byId(reviewWorld.courses.algorithms.id),
      })
    ).toHaveLength(0)
  );
  expect(screen.queryByText('Не удалось загрузить попытки курса.')).toBeNull();
});
