import { act, screen, waitFor, within } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';

const ALGORITHMS_PATH = '/courses/algorithms';
const TEACHER_LINKS = [
  'Попытки',
  'Репозитории',
  'Файлы',
  'Аналитика',
  'Редактирование',
];

beforeEach(() => {
  mockBackend.reset('world:access');
  mockBackend.state.session = {
    userId: accessWorld.users.sasha.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

describe('ACC-12: every Teacher-only route denies a Student in the Course shell', () => {
  test.each([
    '/attempts',
    '/repositories',
    '/files',
    '/stats',
    '/edit',
    '/tasks/1/edit',
    '/tasks/1/attempts/sasha/1/review',
  ])('%s preserves its URL and offers the Course Page', async (sectionPath) => {
    const path = `${ALGORITHMS_PATH}${sectionPath}`;
    const { router } = renderRoutes([], path, { appRoutes: true });

    await screen.findByRole('heading', { name: 'Нет доступа' });
    expect(
      screen.getByText('Этот раздел доступен только преподавателям курса.')
    ).toBeDefined();
    expect(router.history.location.href).toBe(path);
    expect(
      screen
        .getByRole('link', { name: 'На страницу курса' })
        .getAttribute('href')
    ).toBe(ALGORITHMS_PATH);
    const navigation = screen.getByRole('navigation', {
      name: 'Разделы страницы',
    });
    expect(
      within(navigation).getByRole('link', { name: 'Курс' })
    ).toBeDefined();
    expect(
      within(navigation).getByRole('link', { name: 'Журнал' })
    ).toBeDefined();
    const breadcrumbs = screen.getByRole('navigation', {
      name: 'Навигационная цепочка',
    });
    for (const name of TEACHER_LINKS) {
      expect(within(navigation).queryByRole('link', { name })).toBeNull();
      expect(within(breadcrumbs).queryByRole('link', { name })).toBeNull();
    }
    expect(within(screen.getByRole('main')).queryByRole('button')).toBeNull();
  });
});

test('ACC-15: a confirmed demotion replaces Teacher content and navigation without redirecting', async () => {
  mockBackend.state.session = {
    userId: accessWorld.users.vera.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
  const path = '/courses/databases/files';
  const { router } = renderRoutes([], path, { appRoutes: true });
  await screen.findByText('Course files page');
  const membership = mockBackend.state.memberships.find(
    ({ courseId, userId }) =>
      courseId === accessWorld.courses.databases.id &&
      userId === accessWorld.users.vera.id
  );
  if (!membership) throw new Error('The fixture has no Vera Membership');
  membership.role = 'student';

  try {
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await screen.findByRole('heading', { name: 'Нет доступа' });
    expect(screen.queryByText('Course files page')).toBeNull();
    expect(router.history.location.href).toBe(path);
    const navigation = screen.getByRole('navigation', {
      name: 'Разделы страницы',
    });
    expect(
      within(navigation)
        .getByRole('link', { name: 'Репозиторий' })
        .getAttribute('href')
    ).toBe('/courses/databases/repositories/vera');
    for (const name of TEACHER_LINKS) {
      expect(within(navigation).queryByRole('link', { name })).toBeNull();
    }
  } finally {
    focusManager.setFocused(undefined);
  }
});

test('ACC-15: a demoted Member keeps the Task Page but loses Teacher actions', async () => {
  mockBackend.state.session = {
    userId: accessWorld.users.vera.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
  const path = '/courses/databases/tasks/1';
  const { router } = renderRoutes([], path, { appRoutes: true });
  await screen.findByRole('link', { name: 'Редактировать задание' });
  const membership = mockBackend.state.memberships.find(
    ({ courseId, userId }) =>
      courseId === accessWorld.courses.databases.id &&
      userId === accessWorld.users.vera.id
  );
  if (!membership) throw new Error('The fixture has no Vera Membership');
  membership.role = 'student';

  try {
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Редактировать задание' })
      ).toBeNull()
    );
    await screen.findByRole('heading', { name: 'Задание №1 — catall.sh' });
    expect(
      screen.queryByRole('link', { name: 'Посмотреть попытки студентов' })
    ).toBeNull();
    expect(router.history.location.href).toBe(path);
  } finally {
    focusManager.setFocused(undefined);
  }
});

test('ACC-13: Vera gets the navigation of each Course, not a global User role', async () => {
  mockBackend.state.session = {
    userId: accessWorld.users.vera.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
  const { router } = renderRoutes([], '/courses/databases', {
    appRoutes: true,
  });
  await screen.findByRole('heading', { name: 'Базы данных' });
  expect(
    within(screen.getByRole('navigation', { name: 'Разделы страницы' }))
      .getAllByRole('link')
      .map((link) => link.textContent)
  ).toEqual([
    'Курс',
    'Попытки',
    'Репозитории',
    'Журнал',
    'Файлы',
    'Аналитика',
    'Редактирование',
  ]);

  await act(async () => {
    await router.navigate({ to: ALGORITHMS_PATH });
  });
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  const navigation = screen.getByRole('navigation', {
    name: 'Разделы страницы',
  });
  expect(
    within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent)
  ).toEqual(['Курс', 'Репозиторий', 'Журнал']);
  expect(
    within(navigation)
      .getByRole('link', { name: 'Репозиторий' })
      .getAttribute('href')
  ).toBe('/courses/algorithms/repositories/vera');
});

test.each(['sasha', 'anna'] as const)(
  'Journal and Task Page are accessible to Course Member %s',
  async (user) => {
    mockBackend.state.session = {
      userId: accessWorld.users[user].id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    const { router } = renderRoutes([], '/courses/algorithms/journal', {
      appRoutes: true,
    });
    await screen.findByText('Journal page');
    expect(router.history.location.href).toBe('/courses/algorithms/journal');
    await act(async () => {
      await router.navigate({ to: '/courses/algorithms/tasks/1' });
    });
    await screen.findByRole('heading', { name: 'Задание №1 — catall.sh' });
    expect(screen.queryByRole('heading', { name: 'Нет доступа' })).toBeNull();
  }
);

test('ACC-15: confirmed Membership loss removes Task content, actions and Course shell', async () => {
  mockBackend.state.session = {
    userId: accessWorld.users.anna.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
  const path = '/courses/algorithms/tasks/1';
  const { router } = renderRoutes([], path, { appRoutes: true });
  await screen.findByRole('link', { name: 'Редактировать задание' });
  mockBackend.state.memberships = mockBackend.state.memberships.filter(
    ({ userId }) => userId !== accessWorld.users.anna.id
  );
  try {
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await screen.findByRole('heading', { name: 'Страница не найдена' });
    expect(
      screen.queryByRole('heading', { name: 'Задание №1 — catall.sh' })
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Редактировать задание' })
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Посмотреть попытки студентов' })
    ).toBeNull();
    expect(
      screen.queryByRole('navigation', { name: 'Разделы страницы' })
    ).toBeNull();
    expect(
      screen.queryByRole('navigation', { name: 'Навигационная цепочка' })
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: 'К моим курсам' }).getAttribute('href')
    ).toBe('/');
    expect(router.history.location.href).toBe(path);
  } finally {
    focusManager.setFocused(undefined);
  }
});

test('a stale client-side link keeps search and hash on 403 and the Course action works', async () => {
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  await act(async () => {
    await router.navigate({
      href: '/courses/algorithms/attempts?tasks=1#shared-link',
    });
  });
  await screen.findByRole('heading', { name: 'Нет доступа' });
  expect(router.history.location.href).toBe(
    '/courses/algorithms/attempts?tasks=1#shared-link'
  );
  await userEvent.click(
    screen.getByRole('link', { name: 'На страницу курса' })
  );
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  expect(router.history.location.href).toBe(ALGORITHMS_PATH);
});

test.each(['/login', '/register'])(
  'an authenticated User opening %s is not automatically redirected',
  async (path) => {
    const { router } = renderRoutes([], path, { appRoutes: true });
    await screen.findByRole('button', {
      name: path === '/login' ? 'Войти' : 'Зарегистрироваться',
    });
    expect(router.history.location.href).toBe(path);
  }
);
