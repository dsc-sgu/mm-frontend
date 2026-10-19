import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { holdResponse } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';

const [, sashaSecond] = reviewWorld.attempts;
const COURSE = accessWorld.courses.algorithms.id;
const FIRST_FEEDBACK = /пустой список не обработан/;
// The real review page (diff viewer, rich-text editors) renders twice.
const PAGE_SWITCH_TIMEOUT = 20_000;

beforeEach(() => {
  // jsdom has no layout: the page asks for the desktop layout, and the
  // feedback editor's placeholder probes the viewport.
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
  document.elementFromPoint = () => null;
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: accessWorld.users.anna.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

test(
  'REV-38: switching Attempt shows only the selected Attempt, even while it loads',
  async () => {
    const user = userEvent.setup();
    renderRoutes([], '/courses/algorithms/tasks/1/attempts/sasha/1/review', {
      appRoutes: true,
    });
    await screen.findByRole('heading', { name: 'Попытка #1: Сортировки' });
    expect(screen.getByText('Сравнение с пустой базой')).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'Оценка за попытку' })
    ).toHaveProperty('value', '7,5');
    expect(screen.getByText(FIRST_FEEDBACK)).toBeTruthy();

    const held = holdResponse();
    server.use(
      http.get(
        `/api/v1/courses/${COURSE}/attempts/${sashaSecond.id}/review`,
        held.resolver
      )
    );
    await user.click(screen.getByRole('button', { name: 'Выбрать попытку' }));
    await user.click(await screen.findByRole('button', { name: /Попытка #2/ }));
    await held.requested;

    // The new Attempt's Review is on its way: nothing of Attempt #1 remains.
    await screen.findByText('Загружаем страницу проверки…');
    expect(
      screen.queryByRole('heading', { name: /Попытка #\d: Сортировки/ })
    ).toBeNull();
    expect(
      screen.queryByRole('textbox', { name: 'Оценка за попытку' })
    ).toBeNull();
    expect(screen.queryByText(FIRST_FEEDBACK)).toBeNull();
    expect(screen.queryByText('Сравнение с пустой базой')).toBeNull();

    held.release();
    await screen.findByRole('heading', { name: 'Попытка #2: Сортировки' });
    expect(screen.getByText('Сравнение с попыткой #1')).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'Оценка за попытку' })
    ).toHaveProperty('value', '');
    expect(screen.getByText('Попытка ещё не оценена')).toBeTruthy();
    expect(screen.queryByText(FIRST_FEEDBACK)).toBeNull();
  },
  PAGE_SWITCH_TIMEOUT
);
