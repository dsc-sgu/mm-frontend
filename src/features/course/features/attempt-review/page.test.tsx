import { screen, waitFor } from '@testing-library/react';
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
import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/queries';
import { attemptPageQueries } from '@/features/course/features/attempt-review/api/queries';
import { reviewKeys } from '@/features/course/features/review/api/queries';

const [sashaFirst, sashaSecond] = reviewWorld.attempts;
const { anna } = accessWorld.users;
const SASHA_FIRST_URL = '/courses/algorithms/tasks/1/attempts/sasha/1/review';
const COURSE_ID = accessWorld.courses.algorithms.id;
const SASHA_FIRST_API = `/api/v1/courses/${COURSE_ID}/attempts/${sashaFirst.id}`;
const FIRST_FEEDBACK = /пустой список не обработан/;
// Every read of the Attempt page: a denial of any one of them replaces it.
const PAGE_READS = [
  { read: 'summary', url: SASHA_FIRST_API },
  { read: 'review', url: `${SASHA_FIRST_API}/review` },
  { read: 'material', url: `${SASHA_FIRST_API}/material` },
  {
    read: 'attempts',
    url: `/api/v1/courses/${COURSE_ID}/tasks/1/students/${sashaFirst.studentId}/attempts`,
  },
];
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
        `/api/v1/courses/${COURSE_ID}/attempts/${sashaSecond.id}/review`,
        held.resolver
      )
    );
    await user.click(screen.getByRole('button', { name: 'Выбрать попытку' }));
    await user.click(await screen.findByRole('link', { name: /Попытка #2/ }));
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
    ({ userId, courseId }) => userId !== anna.id || courseId !== COURSE_ID
  );
}

// Lost Membership denies every read, so one denied read stands for all; which
// read is wired is checked by the not-found cases below.
test(
  'a read denied after the locator resolved closes the Course with lost Membership',
  async () => {
    server.use(
      http.get(`${SASHA_FIRST_API}/material`, () => {
        removeAnnaFromCourse();
        return accessDenial('not-found');
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

test.each(PAGE_READS)(
  'a missing $read resource shows the resource 404 inside the Course',
  async ({ url }) => {
    server.use(http.get(url, () => accessDenial('not-found')));
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

// The Review and the selector sit under different branches of the key tree.
test.each([
  {
    read: 'review',
    queryKey: reviewKeys.attempt(COURSE_ID, sashaFirst.id),
  },
  {
    read: 'attempts',
    queryKey: attemptReviewKeys.student(
      COURSE_ID,
      sashaFirst.taskId,
      sashaFirst.studentId
    ),
  },
])(
  'a denied background refetch of $read removes the loaded Attempt and its edits',
  async ({ queryKey }) => {
    const user = userEvent.setup();
    const { queryClient } = renderRoutes([], SASHA_FIRST_URL, {
      appRoutes: true,
    });
    await screen.findByRole('heading', { name: 'Попытка #1: Сортировки' });
    const grade = screen.getByRole('textbox', { name: 'Оценка за попытку' });
    await user.clear(grade);
    await user.type(grade, '9');
    expect(grade).toHaveProperty('value', '9');

    removeAnnaFromCourse();
    await queryClient.invalidateQueries({ queryKey });

    await screen.findByRole('link', { name: 'К моим курсам' });
    expect(
      screen.queryByRole('heading', { name: 'Попытка #1: Сортировки' })
    ).toBeNull();
    expect(
      screen.queryByRole('textbox', { name: 'Оценка за попытку' })
    ).toBeNull();
    expect(screen.queryByText(FIRST_FEEDBACK)).toBeNull();
  },
  PAGE_SWITCH_TIMEOUT
);

test('the route starts every page read before the page mounts', async () => {
  const requested: string[] = [];
  const onRequest = ({ request }: { request: Request }) => {
    requested.push(new URL(request.url).pathname);
  };
  server.events.on('request:start', onRequest);
  try {
    const { queryClient, router } = renderRoutes([], '/courses/algorithms', {
      appRoutes: true,
    });
    await screen.findByRole('link', { name: 'Попытки' });

    // Preloading runs beforeLoad and loader without rendering the page.
    await router.preloadRoute({
      to: '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber/review',
      params: {
        courseSlug: 'algorithms',
        taskId: '1',
        studentUsername: 'sasha',
        attemptNumber: '1',
      },
    });

    const attempt = `/api/v1/courses/${COURSE_ID}/attempts/${sashaFirst.id}`;
    await waitFor(() =>
      expect(requested).toEqual(
        expect.arrayContaining([
          attempt,
          `${attempt}/review`,
          `${attempt}/material`,
          `/api/v1/courses/${COURSE_ID}/tasks/1/students/${sashaFirst.studentId}/attempts`,
        ])
      )
    );
    // Taken from the page's own list, so a read added to the page without
    // its prefetch fails here.
    const pageQueries = attemptPageQueries({
      viewerId: anna.id,
      courseId: COURSE_ID,
      taskId: sashaFirst.taskId,
      studentId: sashaFirst.studentId,
      attemptId: sashaFirst.id,
    });
    for (const { queryKey } of Object.values(pageQueries)) {
      expect(
        queryClient.getQueryCache().find({ queryKey, exact: true }),
        JSON.stringify(queryKey)
      ).toBeDefined();
    }
    expect(
      screen.queryByRole('heading', { name: /Попытка #\d: Сортировки/ })
    ).toBeNull();
  } finally {
    server.events.removeListener('request:start', onRequest);
  }
});

test('hovering another Attempt in the selector preloads its reads without switching', async () => {
  const requested: string[] = [];
  const onRequest = ({ request }: { request: Request }) => {
    requested.push(new URL(request.url).pathname);
  };
  server.events.on('request:start', onRequest);
  try {
    const user = userEvent.setup();
    renderRoutes([], SASHA_FIRST_URL, { appRoutes: true });
    await screen.findByRole('heading', { name: 'Попытка #1: Сортировки' });
    await user.click(screen.getByRole('button', { name: 'Выбрать попытку' }));

    await user.hover(await screen.findByRole('link', { name: /Попытка #2/ }));

    const second = `/api/v1/courses/${COURSE_ID}/attempts/${sashaSecond.id}`;
    await waitFor(() =>
      expect(requested).toEqual(
        expect.arrayContaining([
          second,
          `${second}/review`,
          `${second}/material`,
        ])
      )
    );
    expect(
      screen.getByRole('heading', { name: 'Попытка #1: Сортировки' })
    ).toBeTruthy();
  } finally {
    server.events.removeListener('request:start', onRequest);
  }
});
