import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  accessWorld,
  mockBackend,
  reviewWorld,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { createQueryClient } from '@/app/remote-data/query-client';
import { renderRoutes } from '@/app/testing/render-routes';
import { sessionKeys, sessionOptions } from '@/features/auth/api/queries';
import type { UserId } from '@/features/auth/model/identity';
import {
  courseKeys,
  coursesKeys,
  coursesQueryOptions,
} from '@/features/course/api/queries';
import {
  courseContextKeys,
  courseContextOptions,
} from '@/features/course/features/access/api/queries';
import { attemptLocatorKeys } from '@/features/course/features/attempt-review/api/locator-queries';
import { attemptReviewKeys } from '@/features/course/features/attempt-review/api/queries';
import { courseAttemptsKeys } from '@/features/course/features/attempts/api/queries';
import {
  coursePageKeys,
  coursePageQueryOptions,
} from '@/features/course/features/page/api/queries';
import { repositoryLocatorKeys } from '@/features/course/features/repository/api/queries';
import { taskPageKeys } from '@/features/course/features/task/api/queries';
import { reviewKeys } from '@/features/course/features/review/api/queries';
import {
  CourseSlugSchema,
  type AttemptNumber,
} from '@/features/course/model/identity';
import * as v from 'valibot';

const { algorithms, databases } = accessWorld.courses;
const { vera, sasha } = accessWorld.users;

beforeEach(() => {
  mockBackend.reset('world:access');
  signInAs(vera.id);
});

function signInAs(userId: UserId) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

/**
 * Session-bound entries that still hold data. A mounted observer may recreate
 * an empty entry after removal; only data could show the previous session.
 */
function sessionBoundQueries(queryClient: QueryClient) {
  return [courseContextKeys.all, coursesKeys.all, courseKeys.all].flatMap(
    (queryKey) =>
      queryClient
        .getQueryCache()
        .findAll({ queryKey })
        .filter(({ state }) => state.data !== undefined)
  );
}

/**
 * Records whether a session-bound entry was still cached at the moment a new
 * session outcome reached the cache, i.e. before any screen could use it.
 */
function watchSessionChanges(queryClient: QueryClient) {
  const leftovers: QueryKey[][] = [];
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      event.query.queryHash === JSON.stringify(sessionKeys.all)
    ) {
      leftovers.push(
        sessionBoundQueries(queryClient).map(({ queryKey }) => queryKey)
      );
    }
  });
  return { leftovers, unsubscribe };
}

async function loadVeraCaches(queryClient: QueryClient) {
  await queryClient.query(sessionOptions);
  await Promise.all([
    queryClient.query(courseContextOptions(vera.id, databases.slug)),
    queryClient.query(coursesQueryOptions(vera.id)),
    queryClient.query(coursePageQueryOptions(databases.id)),
  ]);
  expect(sessionBoundQueries(queryClient)).toHaveLength(3);
}

describe('ACC-06: a session change clears every session-bound family', () => {
  test('logout through the Header clears them before the login screen', async () => {
    const user = userEvent.setup();
    const { queryClient, router } = renderRoutes([], '/courses/databases', {
      appRoutes: true,
    });
    await screen.findByRole('heading', { name: 'Базы данных' });
    await queryClient.query(coursesQueryOptions(vera.id));
    expect(
      queryClient.getQueryCache().findAll({ queryKey: courseKeys.all })
    ).not.toHaveLength(0);
    const watch = watchSessionChanges(queryClient);

    try {
      await user.click(
        screen.getByRole('button', { name: 'Меню пользователя' })
      );
      await user.click(await screen.findByRole('menuitem', { name: 'Выход' }));
      await waitFor(() =>
        expect(router.state.location.pathname).toBe('/login')
      );
    } finally {
      watch.unsubscribe();
    }

    expect(watch.leftovers).toEqual([[]]);
    expect(sessionBoundQueries(queryClient)).toEqual([]);
    expect(screen.queryByText('Базы данных')).toBeNull();
  });

  test('login through the form clears what a previous session left', async () => {
    mockBackend.state.session = null;
    const user = userEvent.setup();
    const { queryClient, router } = renderRoutes([], '/login', {
      appRoutes: true,
    });
    await screen.findByRole('button', { name: 'Войти' });
    // Left behind when a logout could not be confirmed by this tab.
    queryClient.setQueryData(
      courseContextKeys.bySlug(vera.id, databases.slug),
      {
        status: 'found',
        course: { ...databases, id: databases.id },
        role: 'teacher',
      }
    );
    queryClient.setQueryData(coursePageKeys.detail(databases.id), null);
    const watch = watchSessionChanges(queryClient);

    try {
      await user.type(screen.getByLabelText('Email'), sasha.email);
      await user.type(screen.getByLabelText('Пароль'), sasha.password);
      await user.click(screen.getByRole('button', { name: 'Войти' }));
      await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    } finally {
      watch.unsubscribe();
    }

    expect(watch.leftovers.at(-1)).toEqual([]);
    expect(
      queryClient.getQueryData(
        courseContextKeys.bySlug(vera.id, databases.slug)
      )
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(coursePageKeys.detail(databases.id))
    ).toBeUndefined();
  });

  test('a session replaced outside the tab is cleared before it is cached', async () => {
    const queryClient = createQueryClient();
    try {
      await loadVeraCaches(queryClient);
      const watch = watchSessionChanges(queryClient);
      signInAs(sasha.id);

      await queryClient.refetchQueries({ queryKey: sessionKeys.all });
      watch.unsubscribe();

      expect(watch.leftovers).toEqual([[]]);
      expect(sessionBoundQueries(queryClient)).toEqual([]);
    } finally {
      queryClient.clear();
    }
  });

  test('a recheck of the same session keeps its caches', async () => {
    const queryClient = createQueryClient();
    try {
      await loadVeraCaches(queryClient);

      await queryClient.refetchQueries({ queryKey: sessionKeys.all });

      expect(sessionBoundQueries(queryClient)).toHaveLength(3);
    } finally {
      queryClient.clear();
    }
  });
});

describe('ACC-07: course-scoped operations and keys address CourseId', () => {
  test('after a slug change the old slug is not found and the Page cache stays', async () => {
    const queryClient = createQueryClient();
    try {
      const page = await queryClient.query(
        coursePageQueryOptions(databases.id)
      );
      expect(page).toMatchObject({ title: 'Базы данных' });

      // DRF1 owns the rename operation; the contract renames in backend state.
      const renamed = v.parse(CourseSlugSchema, 'relational-databases');
      const course = mockBackend.state.courses.find(
        ({ id }) => id === databases.id
      );
      if (!course) throw new Error('The databases fixture is missing');
      course.slug = renamed;

      await expect(
        queryClient.query(courseContextOptions(vera.id, databases.slug))
      ).resolves.toEqual({ status: 'course-not-found' });
      await expect(
        queryClient.query(courseContextOptions(vera.id, renamed))
      ).resolves.toMatchObject({
        status: 'found',
        course: { id: databases.id },
      });
      expect(
        queryClient.getQueryState(coursePageKeys.detail(databases.id))
      ).toMatchObject({ status: 'success', data: page });
      // The RAM Page addresses the same CourseId the lookup returned.
      await expect(
        queryClient.query({
          ...coursePageQueryOptions(databases.id),
          staleTime: 0,
        })
      ).resolves.toMatchObject({ title: 'Базы данных' });
    } finally {
      queryClient.clear();
    }
  });

  test('the renamed Course opens at its new slug and the old one is not found', async () => {
    const { router } = renderRoutes([], '/courses/databases', {
      appRoutes: true,
    });
    await screen.findByRole('heading', { name: 'Базы данных' });
    const course = mockBackend.state.courses.find(
      ({ id }) => id === databases.id
    );
    if (!course) throw new Error('The databases fixture is missing');
    course.slug = v.parse(CourseSlugSchema, 'relational-databases');

    await router.navigate({ to: '/' });
    await router.navigate({
      to: '/courses/$courseSlug',
      params: { courseSlug: 'databases' },
    });
    await screen.findByRole('heading', { name: 'Страница не найдена' });
    expect(screen.queryByText('Базы данных')).toBeNull();

    await router.navigate({
      to: '/courses/$courseSlug',
      params: { courseSlug: 'relational-databases' },
    });
    await screen.findByRole('heading', { name: 'Базы данных' });
    expect(
      screen.getByRole('link', { name: 'Редактирование' }).getAttribute('href')
    ).toBe('/courses/relational-databases/edit');
  });

  test('every course-scoped family extends the one Course prefix', () => {
    const prefix = courseKeys.byId(algorithms.id);
    const attemptId = reviewWorld.attempts[0].id;
    const one = 1 as AttemptNumber;
    const keys = [
      coursePageKeys.detail(algorithms.id),
      taskPageKeys.detail({
        courseId: algorithms.id,
        taskId: '1',
        studentId: sasha.id,
      }),
      courseAttemptsKeys.list(algorithms.id, {
        tasks: [],
        students: [],
        graded: 'any',
      }),
      reviewKeys.detail(vera.id, algorithms.id, attemptId),
      attemptReviewKeys.summary(vera.id, algorithms.id, attemptId),
      attemptReviewKeys.material(vera.id, algorithms.id, attemptId),
      attemptReviewKeys.studentAttempts(vera.id, algorithms.id, '1', sasha.id),
      attemptLocatorKeys.byNumber(
        vera.id,
        algorithms.id,
        '1',
        sasha.username,
        one
      ),
      repositoryLocatorKeys.byUsername(vera.id, algorithms.id, sasha.username),
    ];

    for (const key of keys) {
      expect(key.slice(0, prefix.length)).toEqual([...prefix]);
      expect(key).not.toContain(algorithms.slug);
    }
  });
});

describe('a confirmed Membership loss', () => {
  test('removes that Course prefix in one call and keeps other Courses', async () => {
    const queryClient = createQueryClient();
    try {
      await queryClient.query(courseContextOptions(vera.id, algorithms.slug));
      await queryClient.query(coursePageQueryOptions(algorithms.id));
      await queryClient.query(coursePageQueryOptions(databases.id));
      mockBackend.state.memberships = mockBackend.state.memberships.filter(
        ({ courseId, userId }) =>
          !(courseId === algorithms.id && userId === vera.id)
      );

      await expect(
        queryClient.query({
          ...courseContextOptions(vera.id, algorithms.slug),
          staleTime: 0,
        })
      ).resolves.toEqual({ status: 'not-member' });

      expect(
        queryClient
          .getQueryCache()
          .findAll({ queryKey: courseKeys.byId(algorithms.id) })
      ).toEqual([]);
      expect(
        queryClient.getQueryData(coursePageKeys.detail(databases.id))
      ).toMatchObject({ title: 'Базы данных' });
    } finally {
      queryClient.clear();
    }
  });

  test('a slug that stops resolving keeps the Course cache', async () => {
    const queryClient = createQueryClient();
    try {
      await queryClient.query(courseContextOptions(vera.id, algorithms.slug));
      await queryClient.query(coursePageQueryOptions(algorithms.id));
      mockBackend.state.courses = mockBackend.state.courses.filter(
        ({ id }) => id !== algorithms.id
      );

      await queryClient.query({
        ...courseContextOptions(vera.id, algorithms.slug),
        staleTime: 0,
      });

      expect(
        queryClient.getQueryData(coursePageKeys.detail(algorithms.id))
      ).toBeDefined();
    } finally {
      queryClient.clear();
    }
  });
});
