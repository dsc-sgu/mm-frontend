import { Link } from '@tanstack/react-router';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { holdResponse, networkFailure } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { renderRoutes } from '@/app/testing/render-routes';
import { useLogOut } from '@/features/auth/hooks/use-log-out';

const LOGOUT_URL = '/api/v1/auth/logout';
const NETWORK_FAILURE_TEXT =
  'Не удалось выйти: нет связи с сервером. ' +
  'Проверьте подключение и попробуйте ещё раз.';

// Stands in for the header: it stays mounted while the pages change.
function LogOutControls() {
  const logOut = useLogOut();

  return (
    <>
      <button type="button" onClick={logOut}>
        Выход
      </button>
      <Link to="/">Главная</Link>
    </>
  );
}

function renderCoursePage() {
  return renderRoutes(
    [
      { path: '/course', component: () => <h1>Курс</h1> },
      { path: '/', component: () => <h1>Главная</h1> },
    ],
    '/course',
    { layout: LogOutControls }
  );
}

describe('TR-07: logout failures', () => {
  test('a failure on the same page shows text chosen by kind', async () => {
    server.use(http.post(LOGOUT_URL, networkFailure));
    renderCoursePage();

    await userEvent.click(await screen.findByRole('button', { name: 'Выход' }));

    expect(await screen.findByText(NETWORK_FAILURE_TEXT)).toBeDefined();
    expect(document.body.textContent).not.toContain('[logout]');
  });

  test('leaving the page during the request shows no error', async () => {
    const held = holdResponse();
    server.use(
      http.post(LOGOUT_URL, held.resolver),
      http.post(LOGOUT_URL, networkFailure)
    );
    const { queryClient } = renderCoursePage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Выход' }));
    await held.requested;
    await user.click(screen.getByRole('link', { name: 'Главная' }));
    await screen.findByRole('heading', { name: 'Главная' });
    held.release();

    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(document.body.textContent).not.toContain('Не удалось выйти');
  });
});
