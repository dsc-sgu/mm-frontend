import { screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import {
  mockBackend,
  accessWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';
import { dashboardQueries } from '@/features/deadlines-calendar/api/prefetch';

test('предзагрузка панели запускает все её чтения без отрисовки календаря', async () => {
  mockBackend.reset('world:review');
  const userId = accessWorld.users.anna.id;
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
  const { router, queryClient } = renderRoutes([], '/courses/algorithms', {
    appRoutes: true,
  });
  await screen.findByRole('link', { name: 'Попытки' });
  await router.preloadRoute({ to: '/' });
  await waitFor(() => {
    for (const query of Object.values(dashboardQueries(userId))) {
      expect(queryClient.getQueryState(query.queryKey)?.status).toBe('success');
    }
  });
  expect(
    screen.queryByRole('heading', { name: 'Календарь дедлайнов' })
  ).toBeNull();
});
