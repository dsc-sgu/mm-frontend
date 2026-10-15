import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { holdResponse } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { accessDenial } from '@/app/mock-backend/participant-access';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';
import { reviewKeys } from '@/features/course/features/review/api/queries';

const [sashaFirst, sashaSecond] = reviewWorld.attempts;
const { anna } = accessWorld.users;
const SASHA_FIRST_URL = '/courses/algorithms/tasks/1/attempts/sasha/1/review';
const SASHA_FIRST_API = `/api/v1/courses/${accessWorld.courses.algorithms.id}/attempts/${sashaFirst.id}`;
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

/** Anna leaves the Course: every read by AttemptId is denied from now on. */
function removeAnnaFromCourse() {
  mockBackend.state.memberships = mockBackend.state.memberships.filter(
    ({ userId, courseId }) => userId !== anna.id || courseId !== COURSE
  );
}

test(
  'a read denied after the locator resolved closes the Course with lost Membership',
  async () => {
    server.use(
      http.get(`${SASHA_FIRST_API}/material`, () => {
        removeAnnaFromCourse();
        return accessDenial('forbidden');
      })
    );
    renderRoutes([], SASHA_FIRST_URL, { appRoutes: true });

    await screen.findByRole('link', { name: 'К моим курсам' });
    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' })
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: /Попытка #\d: Сортировки/ })
    ).toBeNull();
  },
  PAGE_SWITCH_TIMEOUT
);

test(
  'a missing resource read shows the resource 404 inside the Course',
  async () => {
    server.use(
      http.get(`${SASHA_FIRST_API}/material`, () => accessDenial('not-found'))
    );
    renderRoutes([], SASHA_FIRST_URL, { appRoutes: true });

    await screen.findByRole('link', { name: 'На страницу курса' });
    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' })
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: /Попытка #\d: Сортировки/ })
    ).toBeNull();
  },
  PAGE_SWITCH_TIMEOUT
);

test(
  'a denied background refetch removes the loaded Attempt and its edits',
  async () => {
    const { queryClient } = renderRoutes([], SASHA_FIRST_URL, {
      appRoutes: true,
    });
    await screen.findByRole('heading', { name: 'Попытка #1: Сортировки' });
    expect(screen.getByText(FIRST_FEEDBACK)).toBeTruthy();

    removeAnnaFromCourse();
    await queryClient.invalidateQueries({
      queryKey: reviewKeys.attempt(COURSE, sashaFirst.id),
    });

    await screen.findByRole('link', { name: 'К моим курсам' });
    expect(
      screen.queryByRole('heading', { name: 'Попытка #1: Сортировки' })
    ).toBeNull();
    expect(screen.queryByText(FIRST_FEEDBACK)).toBeNull();
  },
  PAGE_SWITCH_TIMEOUT
);
