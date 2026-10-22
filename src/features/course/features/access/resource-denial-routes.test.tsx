import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';
import { courseKeys } from '@/features/course/api/queries';
import type { CourseId } from '@/features/course/model/identity';

// A page that reads one course-scoped query and handles no denial itself:
// the Course shell must react to the denial without any wiring in the page.
const probe = vi.hoisted(() => ({
  read: vi.fn<() => Promise<{ status: 'found' | 'not-found' }>>(),
}));
vi.mock('@/features/course/features/attempt-review/page', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  const { courseKeys } = await import('@/features/course/api/queries');
  return {
    AttemptReviewPage: ({ courseId }: { courseId: CourseId }) => {
      const query = useQuery({
        queryKey: [...courseKeys.byId(courseId), 'probe'],
        queryFn: () => probe.read(),
      });
      if (query.data?.status !== 'found') {
        return <p>Загрузка</p>;
      }
      return (
        <main>
          <h1>Probe content</h1>
          <textarea aria-label="Черновик" />
        </main>
      );
    },
  };
});

const COURSE_PATH = '/courses/algorithms';
const ATTEMPT_PATH = `${COURSE_PATH}/tasks/1/attempts/sasha/1`;
const COURSE_ID = accessWorld.courses.algorithms.id;
const { sasha } = accessWorld.users;

beforeEach(() => {
  probe.read.mockReset();
  mockBackend.reset('world:review');
  mockBackend.state.session = {
    userId: sasha.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

function removeSashaFromCourse() {
  mockBackend.state.memberships = mockBackend.state.memberships.filter(
    ({ userId, courseId }) => userId !== sasha.id || courseId !== COURSE_ID
  );
}

test('a denied read with a live Membership is the resource 404 inside the Course shell', async () => {
  probe.read.mockResolvedValue({ status: 'not-found' });
  renderRoutes([], ATTEMPT_PATH, { appRoutes: true });

  await screen.findByRole('link', { name: 'На страницу курса' });
  expect(
    screen.getByRole('heading', { name: 'Страница не найдена' })
  ).toBeTruthy();
  expect(
    screen.getByRole('navigation', { name: 'Разделы страницы' })
  ).toBeTruthy();
  expect(screen.queryByText('Probe content')).toBeNull();
});

test('a read denied after the locator answered found closes the Course with lost Membership', async () => {
  probe.read.mockImplementation(async () => {
    removeSashaFromCourse();
    return { status: 'not-found' };
  });
  renderRoutes([], ATTEMPT_PATH, { appRoutes: true });

  await screen.findByRole('link', { name: 'К моим курсам' });
  expect(
    screen.getByRole('heading', { name: 'Страница не найдена' })
  ).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'На страницу курса' })).toBeNull();
  expect(screen.queryByText('Probe content')).toBeNull();
});

test('a denial on a background refetch removes the content and unsaved edits', async () => {
  probe.read.mockResolvedValue({ status: 'found' });
  const { queryClient } = renderRoutes([], ATTEMPT_PATH, { appRoutes: true });
  fireEvent.change(await screen.findByRole('textbox', { name: 'Черновик' }), {
    target: { value: 'Несохранённый отзыв' },
  });

  probe.read.mockResolvedValue({ status: 'not-found' });
  await act(() =>
    queryClient.refetchQueries({ queryKey: courseKeys.byId(COURSE_ID) })
  );

  await screen.findByRole('link', { name: 'На страницу курса' });
  expect(screen.queryByText('Probe content')).toBeNull();
  expect(screen.queryByDisplayValue('Несохранённый отзыв')).toBeNull();
});

test('coming back after a denial reads the page again', async () => {
  probe.read.mockResolvedValue({ status: 'not-found' });
  const { router } = renderRoutes([], ATTEMPT_PATH, { appRoutes: true });
  await screen.findByRole('link', { name: 'На страницу курса' });

  probe.read.mockResolvedValue({ status: 'found' });
  await act(() => router.navigate({ to: COURSE_PATH }));
  await act(() => router.navigate({ to: ATTEMPT_PATH }));

  await screen.findByRole('heading', { name: 'Probe content' });
  expect(screen.queryByText('Страница не найдена')).toBeNull();
});

test('a denied locator left in the cache does not close the next page', async () => {
  probe.read.mockResolvedValue({ status: 'found' });
  const { router } = renderRoutes(
    [],
    `${COURSE_PATH}/tasks/1/attempts/sasha/3`,
    {
      appRoutes: true,
    }
  );
  await screen.findByRole('link', { name: 'На страницу курса' });

  await act(() => router.navigate({ to: ATTEMPT_PATH }));

  await screen.findByRole('heading', { name: 'Probe content' });
});
