import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  coursePageQueryOptions,
  useSaveCoursePageMutation,
} from '@/features/course/features/page/api/queries';
import { holdResponse, networkFailure } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';

const LOOKUP_URL = '/api/v1/courses/:locator';
const ALGORITHMS_PATH = '/courses/algorithms';
const DATABASES_PATH = '/courses/databases';
const DATABASES_ID = accessWorld.courses.databases.id;
const NOT_FOUND_DESCRIPTION =
  'Возможно, ссылка устарела или страница больше недоступна.';

beforeEach(() => {
  mockBackend.reset('world:access');
  mockBackend.state.session = {
    userId: accessWorld.users.vera.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

function expectNeutralCourseShell() {
  expect(
    screen.queryByRole('navigation', { name: 'Разделы страницы' })
  ).toBeNull();
  expect(
    screen.queryByRole('navigation', { name: 'Навигационная цепочка' })
  ).toBeNull();
  expect(screen.queryByText('Базы данных')).toBeNull();
  expect(screen.queryByText('БД')).toBeNull();
  expect(screen.queryByText('Алгоритмы')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Редактирование' })).toBeNull();
}

describe('ACC-10: confirmed Course context controls the real shell', () => {
  test('a first held lookup renders neutral loading at the requested URL', async () => {
    const held = holdResponse();
    server.use(http.get(LOOKUP_URL, held.resolver));
    const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });

    try {
      await held.requested;
      await screen.findByRole('status', { name: 'Загрузка страницы' });
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(router.state.location.pathname).toBe(ALGORITHMS_PATH);
      expectNeutralCourseShell();
    } finally {
      held.release();
    }
    await screen.findByRole('heading', { name: 'Алгоритмы' });
  });

  test('one progress indicator survives an unconfirmed session beforeLoad', async () => {
    const held = holdResponse();
    server.use(http.get('/api/v1/auth/session', held.resolver));
    renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });

    try {
      await held.requested;
      await screen.findByRole('status', { name: 'Загрузка страницы' });
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expectNeutralCourseShell();
    } finally {
      held.release();
    }
    await screen.findByRole('heading', { name: 'Алгоритмы' });
  });

  test('a held transition never shows the previous Course under the new URL', async () => {
    const { router } = renderRoutes([], DATABASES_PATH, { appRoutes: true });
    await screen.findByRole('heading', { name: 'Базы данных' });
    expect(screen.getByRole('link', { name: 'Редактирование' })).toBeDefined();
    const held = holdResponse();
    server.use(http.get(LOOKUP_URL, held.resolver));

    try {
      await act(async () => {
        void router.navigate({ to: ALGORITHMS_PATH });
      });
      await held.requested;
      await screen.findByRole('status', { name: 'Загрузка страницы' });
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(router.state.location.pathname).toBe(ALGORITHMS_PATH);
      expectNeutralCourseShell();
    } finally {
      held.release();
    }
    await screen.findByRole('heading', { name: 'Алгоритмы' });
    const navigation = screen.getByRole('navigation', {
      name: 'Разделы страницы',
    });
    expect(
      within(navigation)
        .getByRole('link', { name: 'Репозиторий' })
        .getAttribute('href')
    ).toBe('/courses/algorithms/repositories/vera');
    expect(
      within(navigation).queryByRole('link', { name: 'Редактирование' })
    ).toBeNull();
  });

  test('re-entry uses confirmed context immediately while lookup runs in the background', async () => {
    const { queryClient, router } = renderRoutes([], ALGORITHMS_PATH, {
      appRoutes: true,
    });
    await screen.findByRole('heading', { name: 'Алгоритмы' });
    await act(async () => {
      await router.navigate({ to: '/' });
    });
    const held = holdResponse();
    server.use(http.get(LOOKUP_URL, held.resolver));

    try {
      await act(async () => {
        void router.navigate({ to: ALGORITHMS_PATH });
      });
      await held.requested;
      await screen.findByRole('heading', { name: 'Алгоритмы' });
      expect(router.state.location.pathname).toBe(ALGORITHMS_PATH);
      expect(
        screen.getByRole('navigation', { name: 'Разделы страницы' })
      ).toBeDefined();
    } finally {
      held.release();
    }
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });
});

describe('ACC-11: Course denials do not redirect or reveal membership', () => {
  test.each([
    '/courses/missing-course',
    '/courses/algorithms',
    '/courses/invalid_course',
  ])('%s renders the same Course 404 and preserves its URL', async (path) => {
    mockBackend.state.session = {
      userId: accessWorld.users.guest.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    const { router } = renderRoutes([], path, { appRoutes: true });

    await screen.findByRole('heading', { name: 'Страница не найдена' });
    expect(screen.getByText(NOT_FOUND_DESCRIPTION)).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'К моим курсам' }).getAttribute('href')
    ).toBe('/');
    expect(router.state.location.pathname).toBe(path);
    expectNeutralCourseShell();
  });

  test('non-member and unknown slug have identical visible denial text', async () => {
    mockBackend.state.session = {
      userId: accessWorld.users.guest.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });
    await screen.findByRole('heading', { name: 'Страница не найдена' });
    const notMemberText = screen.getByRole('main').textContent;
    cleanup();
    renderRoutes([], '/courses/missing-course', { appRoutes: true });
    await screen.findByRole('heading', { name: 'Страница не найдена' });
    expect(screen.getByRole('main').textContent).toBe(notMemberText);
  });
});

test('ACC-14: a technical lookup failure is retryable, not a denial', async () => {
  let requests = 0;
  server.use(
    http.get(LOOKUP_URL, (args) => {
      requests += 1;
      if (requests === 1) return networkFailure(args);
    })
  );
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });

  await screen.findByRole('heading', { name: 'Не удалось проверить доступ' });
  expect(router.state.location.pathname).toBe(ALGORITHMS_PATH);
  expect(
    screen.queryByRole('heading', { name: 'Страница не найдена' })
  ).toBeNull();
  expect(screen.queryByText('403')).toBeNull();
  expect(screen.getByRole('link', { name: 'К моим курсам' })).toBeDefined();
  expectNeutralCourseShell();

  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  expect(requests).toBe(2);
  expect(router.state.location.pathname).toBe(ALGORITHMS_PATH);
});

test('ACC-17: only an unauthenticated session redirects to login', async () => {
  mockBackend.state.session = null;
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });

  await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  // Login markup belongs to OpenID and is deliberately not asserted here.
});

describe('participant-bound resource denials keep the confirmed Course shell', () => {
  test.each([
    '/courses/algorithms/repositories/petya',
    '/courses/algorithms/repositories/invalid%20username',
    '/courses/algorithms/tasks/1/attempts/petya/2',
    '/courses/algorithms/tasks/1/attempts/vera/0',
    '/courses/algorithms/tasks/1/attempts/invalid%20username/2',
    '/courses/algorithms/tasks/invalid-number',
  ])('%s is a resource 404 without a redirect', async (path) => {
    const { router } = renderRoutes([], path, { appRoutes: true });
    await screen.findByRole('heading', { name: 'Страница не найдена' });
    expect(router.history.location.href).toBe(path);
    expect(
      screen
        .getByRole('link', { name: 'На страницу курса' })
        .getAttribute('href')
    ).toBe(ALGORITHMS_PATH);
    expect(
      screen.getByRole('navigation', { name: 'Разделы страницы' })
    ).toBeDefined();
    expect(screen.queryByRole('link', { name: 'К моим курсам' })).toBeNull();
  });

  test('a Teacher does not need a client-side Student roster to open a repository', async () => {
    mockBackend.state.session = {
      userId: accessWorld.users.anna.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    const path = '/courses/algorithms/repositories/petya';
    const { router } = renderRoutes([], path, { appRoutes: true });
    await screen.findByText('Student repository page');
    expect(router.state.location.pathname).toBe(path);
    expect(screen.getByRole('link', { name: 'Редактирование' })).toBeDefined();
  });
});

test('saved Course metadata replaces the confirmed Header title without changing the slug', async () => {
  const { queryClient, router } = renderRoutes([], DATABASES_PATH, {
    appRoutes: true,
  });
  await screen.findByRole('heading', { name: 'Базы данных' });
  const page = await queryClient.ensureQueryData(
    coursePageQueryOptions(DATABASES_ID)
  );
  if (!page) throw new Error('The Course fixture has no published Page');
  const mutation = renderHook(() => useSaveCoursePageMutation(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  await act(async () => {
    await mutation.result.current.mutateAsync({
      ...page,
      courseId: DATABASES_ID,
      previousSlug: 'databases',
      slug: 'databases',
      title: 'Базы данных — обновлённое название',
    });
    await router.invalidate();
  });

  const breadcrumbs = screen.getByRole('navigation', {
    name: 'Навигационная цепочка',
  });
  await within(breadcrumbs).findByText('Базы данных — обновлённое название');
  expect(router.history.location.href).toBe(DATABASES_PATH);
});

test('saving a UUID-shaped slug rejects without changing Course metadata or its published Page', async () => {
  const { queryClient } = renderRoutes([], DATABASES_PATH, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Базы данных' });
  const page = await queryClient.ensureQueryData(
    coursePageQueryOptions(DATABASES_ID)
  );
  if (!page) throw new Error('The Course fixture has no published Page');
  const mutation = renderHook(() => useSaveCoursePageMutation(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  await act(async () => {
    await expect(
      mutation.result.current.mutateAsync({
        ...page,
        courseId: DATABASES_ID,
        previousSlug: 'databases',
        slug: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'Rejected UUID rename',
      })
    ).rejects.toBeInstanceOf(Error);
  });

  await expect(
    queryClient.fetchQuery(coursePageQueryOptions(DATABASES_ID))
  ).resolves.toMatchObject({ courseId: 'databases', title: 'Базы данных' });
  await queryClient.invalidateQueries();
  await screen.findByRole('heading', { name: 'Базы данных' });
  expect(screen.getByRole('link', { name: 'Редактирование' })).toBeDefined();
});

test('a UUID CourseId cannot be used as a CourseSlug route locator', async () => {
  const path = `/courses/${accessWorld.courses.algorithms.id}`;
  const { router } = renderRoutes([], path, { appRoutes: true });

  await screen.findByRole('heading', { name: 'Страница не найдена' });
  expectNeutralCourseShell();
  expect(router.history.location.href).toBe(path);
});

test('case-insensitive static route segments do not hide a valid confirmed Course', async () => {
  const path = '/Courses/databases';
  const { router } = renderRoutes([], path, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Базы данных' });
  expect(
    screen.getByRole('navigation', { name: 'Разделы страницы' })
  ).toBeDefined();
  expect(screen.getByRole('link', { name: 'Редактирование' })).toBeDefined();
  expect(router.history.location.href).toBe(path);
});

test('reconnect rechecks an initially failed lookup and confirms Course context', async () => {
  let requests = 0;
  server.use(
    http.get(LOOKUP_URL, (args) => {
      requests += 1;
      if (requests === 1) return networkFailure(args);
    })
  );
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Не удалось проверить доступ' });

  try {
    await act(async () => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    await screen.findByRole('heading', { name: 'Алгоритмы' });
    expect(router.history.location.href).toBe(ALGORITHMS_PATH);
    expect(
      screen.getByRole('link', { name: 'Репозиторий' }).getAttribute('href')
    ).toBe('/courses/algorithms/repositories/vera');
  } finally {
    onlineManager.setOnline(true);
  }
});

test('focus rechecks an initial denial and establishes the newly confirmed Membership', async () => {
  const membership = mockBackend.state.memberships.find(
    ({ courseId, userId }) =>
      courseId === accessWorld.courses.algorithms.id &&
      userId === accessWorld.users.vera.id
  );
  if (!membership) throw new Error('The fixture has no Vera Membership');
  mockBackend.state.memberships = mockBackend.state.memberships.filter(
    (candidate) => candidate !== membership
  );
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Страница не найдена' });
  expectNeutralCourseShell();
  await waitFor(() =>
    expect(
      screen.queryByRole('status', { name: 'Загрузка страницы' })
    ).toBeNull()
  );
  const held = holdResponse();
  server.use(http.get(LOOKUP_URL, held.resolver));

  try {
    mockBackend.state.memberships.push(membership);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await held.requested;
    await screen.findByRole('status', { name: 'Загрузка страницы' });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(router.state.isLoading).toBe(false);
    expectNeutralCourseShell();
  } finally {
    held.release();
    focusManager.setFocused(undefined);
  }
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  expect(router.history.location.href).toBe(ALGORITHMS_PATH);
  expect(
    screen.getByRole('link', { name: 'Репозиторий' }).getAttribute('href')
  ).toBe('/courses/algorithms/repositories/vera');
});

test('manual retry rechecks a cached context after its background lookup failed', async () => {
  let requests = 0;
  server.use(
    http.get(LOOKUP_URL, (args) => {
      requests += 1;
      if (requests === 2) return networkFailure(args);
    })
  );
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  try {
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await screen.findByRole('heading', { name: 'Не удалось проверить доступ' });
    expectNeutralCourseShell();
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByRole('heading', { name: 'Алгоритмы' });
    expect(router.history.location.href).toBe(ALGORITHMS_PATH);
  } finally {
    focusManager.setFocused(undefined);
  }
});

test('returning directly from another Course rechecks cached context in the background', async () => {
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  await act(async () => {
    await router.navigate({ to: DATABASES_PATH });
  });
  await screen.findByRole('heading', { name: 'Базы данных' });
  const held = holdResponse();
  let requested = false;
  server.use(
    http.get('/api/v1/courses/algorithms', (args) => {
      requested = true;
      return held.resolver(args);
    })
  );
  try {
    await act(async () => {
      void router.navigate({ to: ALGORITHMS_PATH });
    });
    await screen.findByRole('heading', { name: 'Алгоритмы' });
    await waitFor(() => expect(requested).toBe(true));
    expect(router.history.location.href).toBe(ALGORITHMS_PATH);
  } finally {
    held.release();
  }
});

test('cached Course entry rechecks after another Course denied access', async () => {
  mockBackend.state.memberships = mockBackend.state.memberships.filter(
    ({ courseId }) => courseId !== accessWorld.courses.databases.id
  );
  const { router } = renderRoutes([], ALGORITHMS_PATH, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  await act(async () => {
    await router.navigate({ to: DATABASES_PATH });
  });
  await screen.findByRole('heading', { name: 'Страница не найдена' });
  const held = holdResponse();
  let requested = false;
  server.use(
    http.get('/api/v1/courses/algorithms', (args) => {
      requested = true;
      return held.resolver(args);
    })
  );
  try {
    await act(async () => {
      void router.navigate({ to: ALGORITHMS_PATH });
    });
    await screen.findByRole('heading', { name: 'Алгоритмы' });
    await waitFor(() => expect(requested).toBe(true));
    expect(router.history.location.href).toBe(ALGORITHMS_PATH);
  } finally {
    held.release();
  }
});

test('an unmatched nested route remains a resource 404 inside the confirmed Course shell', async () => {
  const path = '/courses/databases/not-a-route';
  const { router } = renderRoutes([], path, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Страница не найдена' });
  expect(
    screen.getByRole('link', { name: 'На страницу курса' }).getAttribute('href')
  ).toBe(DATABASES_PATH);
  expect(screen.getByRole('link', { name: 'Редактирование' })).toBeDefined();
  expect(router.history.location.href).toBe(path);
});
