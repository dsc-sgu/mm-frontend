import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import {
  holdResponse,
  networkFailure,
  undeclaredStatus,
} from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { mockBackend, seededUsers } from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';
import { LoginForm } from '@/features/auth/ui/login-form';

const LOGIN_URL = '/api/v1/auth/login';

function renderLoginPage() {
  mockBackend.state.session = null;

  return renderRoutes(
    [
      { path: '/login', component: LoginForm },
      { path: '/register', component: () => <h1>Регистрация</h1> },
      { path: '/', component: () => <h1>Главная</h1> },
    ],
    '/login'
  );
}

async function signIn(password = seededUsers.mitStudent.password) {
  const user = userEvent.setup();
  await user.type(
    await screen.findByLabelText('Email'),
    seededUsers.mitStudent.email
  );
  await user.type(screen.getByLabelText('Пароль'), password);
  await user.click(screen.getByRole('button', { name: 'Войти' }));
  return user;
}

describe('login form', () => {
  test('signs in and opens the app', async () => {
    renderLoginPage();

    await signIn();

    expect(
      await screen.findByRole('heading', { name: 'Главная' })
    ).toBeDefined();
    expect(mockBackend.state.session?.userId).toBe(seededUsers.mitStudent.id);
  });

  test('reports invalid credentials', async () => {
    renderLoginPage();

    await signIn('wrong-password');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Неверный email или пароль'
    );
  });
});

describe('TR-07: login failures', () => {
  test('a network failure shows text chosen by kind, not the message', async () => {
    server.use(http.post(LOGIN_URL, networkFailure));
    renderLoginPage();

    await signIn();

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Не удалось войти: нет связи с сервером. ' +
        'Проверьте подключение и попробуйте ещё раз.'
    );
    expect(document.body.textContent).not.toContain('[login]');
  });

  test('an unexpected response shows its own text', async () => {
    server.use(http.post(LOGIN_URL, undeclaredStatus(500)));
    renderLoginPage();

    await signIn();

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Не удалось войти: сервер ответил не так, как ожидалось. ' +
        'Попробуйте ещё раз позже.'
    );
    expect(document.body.textContent).not.toContain('[login]');
  });

  test('leaving the page during the request shows no error', async () => {
    const held = holdResponse();
    server.use(
      http.post(LOGIN_URL, held.resolver),
      http.post(LOGIN_URL, networkFailure)
    );
    const { queryClient, router } = renderLoginPage();

    const user = await signIn();
    await held.requested;
    await user.click(screen.getByRole('link', { name: 'Зарегистрироваться' }));
    await screen.findByRole('heading', { name: 'Регистрация' });
    held.release();

    await waitFor(() => expect(queryClient.isMutating()).toBe(0));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toContain('Не удалось войти');
    expect(router.state.location.pathname).toBe('/register');
  });
});
