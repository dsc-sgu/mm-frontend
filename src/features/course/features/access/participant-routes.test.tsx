import { act, cleanup, screen } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  mockBackend,
  accessWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { server } from '@/app/mock-backend/node';
import { networkFailure, undeclaredStatus } from '@/app/mock-backend/failures';
import { renderRoutes } from '@/app/testing/render-routes';
import { AttemptReviewPage } from '@/features/course/features/attempt-review/page';
import { reply } from '@/app/testing/reply';

// This contract exercises the real Router, HTTP operation, Query and Course
// shell up to the content seam; the page's own contracts render the content.
vi.mock('@/features/course/features/attempt-review/page', () => ({
  AttemptReviewPage: vi.fn(() => <h1>Resolved Attempt content</h1>),
}));

const COURSE_PATH = '/courses/algorithms';
const ATTEMPT_ENDPOINT =
  '/api/v1/courses/:courseId/tasks/:taskId/attempts/:studentUsername/:attemptNumber';

beforeEach(() => {
  vi.clearAllMocks();
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: accessWorld.users.sasha.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

test.each([
  '/repositories/petya',
  '/repositories/petya/commits',
  '/repositories/petya/commits/abcdef',
  '/repositories/missing',
  '/tasks/1/attempts/petya/1',
  '/tasks/1/attempts/petya/1/review',
  '/tasks/1/attempts/sasha/3',
  '/tasks/1/attempts/missing/1/review',
])(
  'ACC-16: %s is the same generic 404 inside the Course shell',
  async (path) => {
    const href = `${COURSE_PATH}${path}`;
    const { router } = renderRoutes([], href, { appRoutes: true });
    await screen.findByRole('heading', { name: 'Страница не найдена' });
    expect(
      screen
        .getByRole('link', { name: 'На страницу курса' })
        .getAttribute('href')
    ).toBe(COURSE_PATH);
    expect(
      screen.getByRole('navigation', { name: 'Разделы страницы' })
    ).toBeDefined();
    expect(screen.queryByText(/petya|Петя|missing/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Нет доступа' })).toBeNull();
    expect(AttemptReviewPage).not.toHaveBeenCalled();
    expect(router.history.location.href).toBe(href);
  }
);

test('not-found and forbidden have identical visible resource content', async () => {
  renderRoutes([], `${COURSE_PATH}/tasks/1/attempts/petya/1`, {
    appRoutes: true,
  });
  await screen.findByRole('heading', { name: 'Страница не найдена' });
  const forbidden = screen.getByRole('main').textContent;
  cleanup();
  renderRoutes([], `${COURSE_PATH}/tasks/1/attempts/sasha/3`, {
    appRoutes: true,
  });
  await screen.findByRole('heading', { name: 'Страница не найдена' });
  expect(screen.getByRole('main').textContent).toBe(forbidden);
});

test.each(['readonly', 'editable'] as const)(
  'resolved %s Attempt content receives stable identities, not locators',
  async (mode) => {
    mockBackend.state.session = {
      userId: accessWorld.users.anna.id,
      expiresAt: SESSION_EXPIRES_AT,
    };
    const path = `${COURSE_PATH}/tasks/1/attempts/petya/1${mode === 'editable' ? '/review' : ''}`;
    renderRoutes([], path, { appRoutes: true });
    await screen.findByRole('heading', { name: 'Resolved Attempt content' });
    const props = vi.mocked(AttemptReviewPage).mock.calls.at(-1)?.[0];
    expect(props).toEqual({
      mode,
      courseRole: 'teacher',
      viewerId: accessWorld.users.anna.id,
      courseId: accessWorld.courses.algorithms.id,
      taskId: '1',
      studentId: accessWorld.users.petya.id,
      attemptId: mockBackend.state.attempts[2].id,
    });
  }
);

test('a username locator resolves to UserId for all Repository descendants', async () => {
  const { router } = renderRoutes(
    [],
    `${COURSE_PATH}/repositories/sasha/commits/abcdef`,
    { appRoutes: true }
  );
  await screen.findByText('Student commit detail page');
  const match = router.state.matches.find(({ routeId }) =>
    routeId.endsWith('/commits/$commitId')
  );
  expect(match?.context.repository).toEqual({
    studentId: accessWorld.users.sasha.id,
  });
});

test('forbidden rechecks Course context and removes the shell after Membership loss', async () => {
  server.use(
    http.get(ATTEMPT_ENDPOINT, () => {
      mockBackend.state.memberships = mockBackend.state.memberships.filter(
        ({ userId }) => userId !== accessWorld.users.sasha.id
      );
    })
  );
  let lookups = 0;
  server.use(
    http.get('/api/v1/courses/:locator', () => {
      lookups += 1;
    })
  );
  renderRoutes([], `${COURSE_PATH}/tasks/1/attempts/sasha/1`, {
    appRoutes: true,
  });
  await screen.findByRole('heading', { name: 'Страница не найдена' });
  expect(screen.getByRole('link', { name: 'К моим курсам' })).toBeDefined();
  expect(
    screen.queryByRole('navigation', { name: 'Разделы страницы' })
  ).toBeNull();
  expect(lookups).toBeGreaterThanOrEqual(2);
  expect(AttemptReviewPage).not.toHaveBeenCalled();
});

test('a failed denial recheck is a technical error, not a fabricated 404', async () => {
  let lookups = 0;
  server.use(
    http.get('/api/v1/courses/:locator', (args) => {
      lookups += 1;
      if (lookups > 1) return networkFailure(args);
    })
  );
  renderRoutes([], `${COURSE_PATH}/tasks/1/attempts/petya/1`, {
    appRoutes: true,
  });
  await screen.findByRole('heading', { name: 'Не удалось проверить доступ' });
  expect(
    screen.queryByRole('heading', { name: 'Страница не найдена' })
  ).toBeNull();
  expect(AttemptReviewPage).not.toHaveBeenCalled();
});

test.each(['repository', 'attempt'] as const)(
  '%s operation failure is retryable, never a resource denial',
  async (resource) => {
    const endpoint =
      resource === 'attempt'
        ? ATTEMPT_ENDPOINT
        : '/api/v1/courses/:courseId/repositories/:studentUsername';
    server.use(http.get(endpoint, undeclaredStatus(500)));
    const { router } = renderRoutes(
      [],
      `${COURSE_PATH}${resource === 'attempt' ? '/tasks/1/attempts/sasha/1' : '/repositories/sasha'}`,
      { appRoutes: true }
    );
    await screen.findByRole('heading', { name: 'Не удалось проверить доступ' });
    expect(
      screen.queryByRole('heading', { name: 'Страница не найдена' })
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeDefined();
    server.resetHandlers();
    await act(async () => {
      await router.invalidate();
    });
    await screen.findByText(
      resource === 'attempt'
        ? 'Resolved Attempt content'
        : 'Student repository page'
    );
  }
);

test('a cached Student link cannot retain an Attempt after a backend denial', async () => {
  const path = `${COURSE_PATH}/tasks/1/attempts/sasha/1`;
  const { router } = renderRoutes([], path, { appRoutes: true });
  await screen.findByRole('heading', { name: 'Resolved Attempt content' });
  await act(async () => {
    await router.navigate({ to: COURSE_PATH });
  });
  server.use(http.get(ATTEMPT_ENDPOINT, reply(403, { status: 'forbidden' })));
  await act(async () => {
    await router.navigate({ to: path });
  });
  await screen.findByRole('heading', { name: 'Страница не найдена' });
  expect(
    screen.queryByRole('heading', { name: 'Resolved Attempt content' })
  ).toBeNull();
});
