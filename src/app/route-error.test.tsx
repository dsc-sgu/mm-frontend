import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { expect, test } from 'vitest';
import { networkFailure } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { renderRoutes } from '@/app/testing/render-routes';
import { sessionOptions } from '@/features/auth/api/queries';

test('TR-07: a failed session check shows text by kind and can be retried', async () => {
  server.use(http.get('/api/v1/auth/session', networkFailure));
  renderRoutes(
    [
      {
        path: '/',
        component: () => <h1>Главная</h1>,
        beforeLoad: (queryClient) =>
          queryClient.ensureQueryData(sessionOptions),
      },
    ],
    '/'
  );

  expect(
    await screen.findByText(
      'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.',
      undefined,
      { timeout: 3000 }
    )
  ).toBeDefined();
  expect(document.body.textContent).not.toContain('[check-session]');

  server.resetHandlers();
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));

  expect(await screen.findByRole('heading', { name: 'Главная' })).toBeDefined();
});
