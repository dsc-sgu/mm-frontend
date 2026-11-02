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
