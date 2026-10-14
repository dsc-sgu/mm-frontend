import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { createFakeDiffWorkers } from '@/app/testing/diff-workers';
import { renderRoutes } from '@/app/testing/render-routes';

const COURSE_PATH = '/courses/algorithms';
const COURSE_ATTEMPTS_PATH = `${COURSE_PATH}/attempts`;
const ATTEMPT_PATH = `${COURSE_PATH}/tasks/1/attempts/sasha/1`;
const REVIEW_PATH = `${ATTEMPT_PATH}/review`;
const ATTEMPT_HEADING = 'Попытка #1: Сортировки';
const DIFF_FAILED = 'Не удалось показать изменения';
const SAVE_BLOCKED = 'Сохранить нельзя: изменения не загрузились.';

beforeEach(() => {
  // jsdom has no layout; the feedback editor's placeholder probes the viewport.
  document.elementFromPoint = () => null;
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: accessWorld.users.anna.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

function accessibleDescription(element: HTMLElement): string | null {
  const id = element.getAttribute('aria-describedby');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
}

// The first ready diff in a run loads the routes and the main-thread Shiki.
async function findChangedFileDiffs() {
  return screen.findAllByRole(
    'button',
    { name: 'Скрыть изменение файла' },
    { timeout: 10_000 }
  );
}

describe('REV-10: diff Worker readiness on the Review editor', () => {
  test('a ready diff shows the changed files and allows Save', async () => {
    renderRoutes([], REVIEW_PATH, { appRoutes: true });

    expect(await findChangedFileDiffs()).not.toHaveLength(0);
    expect(screen.queryByRole('alert', { name: DIFF_FAILED })).toBeNull();
    expect(screen.queryByText(SAVE_BLOCKED)).toBeNull();
  });

  test('loading becomes ready without an endless page loader', async () => {
    const diffWorkers = createFakeDiffWorkers('loading');
    renderRoutes([], REVIEW_PATH, { appRoutes: true, diffWorkers });

    await screen.findByRole('heading', { name: ATTEMPT_HEADING });
    expect(
      screen.getByText('Загружаем изменения…').closest('[role="status"]')
    ).not.toBeNull();
    expect(
      accessibleDescription(screen.getByRole('button', { name: 'Сохранить' }))
    ).toBe('Сохранить можно, когда загрузятся изменения.');

    act(() => diffWorkers.report('ready'));

    expect(await findChangedFileDiffs()).not.toHaveLength(0);
    expect(screen.queryByText('Загружаем изменения…')).toBeNull();
  });

  test('unavailable Workers fail with a retry and keep the Review editable', async () => {
    const user = userEvent.setup();
    const diffWorkers = createFakeDiffWorkers('failed');
    renderRoutes([], REVIEW_PATH, { appRoutes: true, diffWorkers });

    const failure = await screen.findByRole('alert', { name: DIFF_FAILED });
    // A11Y-02: the retry is a button named «Повторить».
    expect(
      within(failure).getByRole('button', { name: 'Повторить' })
    ).toHaveProperty('disabled', false);
    expect(screen.queryByText('Загружаем изменения…')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Скрыть изменение файла' })
    ).toBeNull();

    const grade = screen.getByRole('textbox', { name: 'Оценка за попытку' });
    await user.clear(grade);
    await user.type(grade, '7');
    expect(grade).toHaveProperty('value', '7');
    screen.getByText('Есть изменения');

    const save = screen.getByRole('button', { name: 'Сохранить' });
    expect(save).toHaveProperty('disabled', true);
    expect(accessibleDescription(save)).toBe(SAVE_BLOCKED);
  });

  test('«Повторить» recreates the Workers', async () => {
    const user = userEvent.setup();
    const diffWorkers = createFakeDiffWorkers('failed');
    renderRoutes([], REVIEW_PATH, { appRoutes: true, diffWorkers });
    const failure = await screen.findByRole('alert', { name: DIFF_FAILED });
    const createdBeforeRetry = diffWorkers.created();

    diffWorkers.startWith('ready');
    await user.click(
      within(failure).getByRole('button', { name: 'Повторить' })
    );

    expect(await findChangedFileDiffs()).not.toHaveLength(0);
    expect(diffWorkers.created()).toBe(createdBeforeRetry + 1);
    expect(diffWorkers.running()).toBe(1);
    expect(screen.queryByText(SAVE_BLOCKED)).toBeNull();
  });
});

test('REV-10: the Attempt page shows a diff failure with a retry', async () => {
  const diffWorkers = createFakeDiffWorkers('failed');
  renderRoutes([], ATTEMPT_PATH, { appRoutes: true, diffWorkers });

  const failure = await screen.findByRole('alert', { name: DIFF_FAILED });
  expect(
    within(failure).getByRole('button', { name: 'Повторить' })
  ).toHaveProperty('disabled', false);
  screen.getByRole('heading', { name: ATTEMPT_HEADING });
});

test('REV-11: only the Attempt routes run diff Workers', async () => {
  const diffWorkers = createFakeDiffWorkers();
  const { router } = renderRoutes([], COURSE_PATH, {
    appRoutes: true,
    diffWorkers,
  });
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  expect(diffWorkers.created()).toBe(0);

  await act(() => router.navigate({ to: COURSE_ATTEMPTS_PATH }));
  await waitFor(() => expect(router.state.status).toBe('idle'));
  expect(router.state.location.pathname).toBe(COURSE_ATTEMPTS_PATH);
  expect(diffWorkers.created()).toBe(0);

  await act(() => router.navigate({ to: ATTEMPT_PATH }));
  await findChangedFileDiffs();
  expect(diffWorkers.running()).toBe(1);

  // The Attempt page and the Review editor share the pool.
  const created = diffWorkers.created();
  await act(() => router.navigate({ to: REVIEW_PATH }));
  await screen.findByRole('button', { name: 'Сохранить' });
  expect(diffWorkers.created()).toBe(created);
  expect(diffWorkers.running()).toBe(1);

  await act(() => router.navigate({ to: COURSE_PATH }));
  await screen.findByRole('heading', { name: 'Алгоритмы' });
  expect(diffWorkers.running()).toBe(0);
});
