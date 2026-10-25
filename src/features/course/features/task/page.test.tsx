import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { server } from '@/app/mock-backend/node';
import { accessDenial } from '@/app/mock-backend/participant-access';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';
import { taskPageQueries } from '@/features/course/features/task/api/queries';

const { sasha } = accessWorld.users;
const COURSE_ID = accessWorld.courses.algorithms.id;
const TASK_URL = '/courses/algorithms/tasks/1';
const HISTORY_API = `/api/v1/courses/${COURSE_ID}/tasks/1/students/${sasha.id}/attempt-history`;

beforeEach(() => {
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: sasha.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

test('the Student sees the history built from the canonical Attempts and Reviews', async () => {
  renderRoutes([], TASK_URL, { appRoutes: true });

  const second = await screen.findByRole('listitem', { name: 'Попытка №2' });
  expect(within(second).getByText('Ожидает проверки')).toBeTruthy();

  const first = screen.getByRole('listitem', {
    name: 'Попытка №1, есть непросмотренные обновления',
  });
  expect(within(first).getByLabelText('Результат: 7,5 из 10')).toBeTruthy();
  expect(within(first).getByText('Борис')).toBeTruthy();
  expect(screen.getByText('Есть непросмотренные обновления')).toBeTruthy();
});

test('opening an Attempt with updates marks them seen in the backend', async () => {
  const user = userEvent.setup();
  renderRoutes([], TASK_URL, { appRoutes: true });
  const first = await screen.findByRole('listitem', {
    name: 'Попытка №1, есть непросмотренные обновления',
  });

  await user.click(within(first).getByRole('link', { name: /Отзыв/ }));

  await waitFor(() =>
    expect(mockBackend.state.unseenAttemptUpdates).toEqual([])
  );
});

test('a denied history shows the resource 404 inside the Course', async () => {
  server.use(http.get(HISTORY_API, () => accessDenial('not-found')));
  renderRoutes([], TASK_URL, { appRoutes: true });

  await screen.findByRole('link', { name: 'На страницу курса' });
  expect(
    screen.getByRole('heading', { name: 'Страница не найдена' })
  ).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'История попыток' })).toBeNull();
});

test('the route starts every page read before the page mounts', async () => {
  const { queryClient, router } = renderRoutes([], '/courses/algorithms', {
    appRoutes: true,
  });
  // The Student's Course page has loaded its context.
  await screen.findAllByText('Алгоритмы');

  // Preloading runs beforeLoad and loader without rendering the page.
  await router.preloadRoute({
    to: '/courses/$courseSlug/tasks/$taskId',
    params: { courseSlug: 'algorithms', taskId: '1' },
  });

  // Taken from the page's own list, so a read added to the page without its
  // prefetch fails here.
  const pageQueries = taskPageQueries({
    viewerId: sasha.id,
    courseId: COURSE_ID,
    taskId: '1',
    studentId: sasha.id,
  });
  for (const options of Object.values(pageQueries)) {
    expect(options).not.toBeNull();
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: options?.queryKey ?? [], exact: true }),
      JSON.stringify(options?.queryKey)
    ).toBeDefined();
  }
  expect(screen.queryByRole('heading', { name: 'История попыток' })).toBeNull();
});
