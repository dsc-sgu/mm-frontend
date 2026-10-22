import { describe, expect, test, vi } from 'vitest';
import {
  focusManager,
  isCancelledError,
  onlineManager,
  QueryObserver,
} from '@tanstack/react-query';
import { http } from 'msw';
import {
  holdResponse,
  invalidBody,
  networkFailure,
  undeclaredStatus,
} from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import { countRequests } from '@/app/testing/count-requests';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { createQueryClient } from '@/app/remote-data/query-client';
import {
  courseContextKeys,
  courseContextOptions,
  recheckCourseContextAfterAccessDenial,
} from './queries';

const SLUG = accessWorld.courses.algorithms.slug;
const VERA = accessWorld.users.vera.id;
const ANNA = accessWorld.users.anna.id;

function signInAs(userId: typeof VERA) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

describe('ACC-05: user-scoped Course context', () => {
  test('a new User looks up the same slug without inheriting the previous User role', async () => {
    mockBackend.reset('world:access');
    signInAs(VERA);
    const queryClient = createQueryClient();
    try {
      const student = await queryClient.query(courseContextOptions(VERA, SLUG));
      expect(student).toMatchObject({ status: 'found', role: 'student' });

      signInAs(ANNA);
      expect(
        queryClient.getQueryData(courseContextKeys.bySlug(ANNA, SLUG))
      ).toBeUndefined();
      const teacher = await queryClient.query(courseContextOptions(ANNA, SLUG));
      expect(teacher).toMatchObject({ status: 'found', role: 'teacher' });
      expect(
        queryClient.getQueryData(courseContextKeys.bySlug(VERA, SLUG))
      ).toEqual(student);
    } finally {
      queryClient.clear();
    }
  });
});

describe('ACC-04 / TR-05: Course context query outcomes', () => {
  test('an access denial is successful query data, not an operational error', async () => {
    mockBackend.reset('world:access');
    signInAs(accessWorld.users.guest.id);
    const queryClient = createQueryClient();
    const key = courseContextKeys.bySlug(accessWorld.users.guest.id, SLUG);
    try {
      await expect(
        queryClient.query(
          courseContextOptions(accessWorld.users.guest.id, SLUG)
        )
      ).resolves.toEqual({ status: 'not-found' });
      expect(queryClient.getQueryState(key)).toMatchObject({
        status: 'success',
        data: { status: 'not-found' },
        error: null,
      });
    } finally {
      queryClient.clear();
    }
  });

  test.each([
    ['invalid-response', invalidBody({ status: 'found' })],
    ['unexpected-http-status', undeclaredStatus(500)],
    ['network', networkFailure],
  ])(
    '%s rejects without entering cache or retrying',
    async (kind, resolver) => {
      const requests = countRequests(resolver);
      server.use(http.get('/api/v1/courses/algorithms', requests.resolver));
      const queryClient = createQueryClient();
      // The context query must override a caller's generic retry policy.
      queryClient.setDefaultOptions({ queries: { retry: 2, retryDelay: 0 } });
      try {
        await expect(
          queryClient.query(courseContextOptions(VERA, SLUG))
        ).rejects.toMatchObject({ kind });
        expect(
          queryClient.getQueryState(courseContextKeys.bySlug(VERA, SLUG))
        ).toMatchObject({ status: 'error', data: undefined, error: { kind } });
        expect(requests.count).toBe(1);
      } finally {
        queryClient.clear();
      }
    }
  );

  test('cancelling a held query does not leave an operation failure or denial', async () => {
    const held = holdResponse();
    server.use(http.get('/api/v1/courses/algorithms', held.resolver));
    const queryClient = createQueryClient();
    const key = courseContextKeys.bySlug(VERA, SLUG);
    const pending = queryClient.query(courseContextOptions(VERA, SLUG));
    const rejection = expect(pending).rejects.toSatisfy(isCancelledError);
    try {
      await held.requested;
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      await rejection;
      expect(queryClient.getQueryState(key)).toMatchObject({
        data: undefined,
        error: null,
        fetchStatus: 'idle',
      });
    } finally {
      held.release();
      queryClient.clear();
    }
  });
});

describe('ACC-09: Course context rechecks', () => {
  test('re-entering an inactive Course exposes confirmed context immediately and rechecks membership', async () => {
    mockBackend.reset('world:access');
    signInAs(VERA);
    const requests = countRequests(() => undefined);
    server.use(http.get('/api/v1/courses/algorithms', requests.resolver));
    const queryClient = createQueryClient();
    const observer = new QueryObserver(
      queryClient,
      courseContextOptions(VERA, SLUG)
    );
    let unsubscribe = observer.subscribe(() => undefined);
    try {
      await vi.waitFor(() => {
        expect(observer.getCurrentResult().data).toMatchObject({
          status: 'found',
          role: 'student',
        });
      });
      unsubscribe();
      mockBackend.state.memberships = mockBackend.state.memberships.filter(
        ({ userId, courseId }) =>
          userId !== VERA || courseId !== accessWorld.courses.algorithms.id
      );
      unsubscribe = observer.subscribe(() => undefined);
      expect(observer.getCurrentResult().data).toMatchObject({
        status: 'found',
        role: 'student',
      });
      await vi.waitFor(() => {
        expect(observer.getCurrentResult().data).toEqual({
          status: 'not-found',
        });
      });
      expect(requests.count).toBe(2);
    } finally {
      unsubscribe();
      queryClient.clear();
    }
  });

  test.each(['focus', 'reconnect'] as const)(
    '%s rechecks the confirmed context and exposes a membership denial',
    async (trigger) => {
      mockBackend.reset('world:access');
      signInAs(VERA);
      focusManager.setFocused(true);
      onlineManager.setOnline(true);
      const requests = countRequests(() => undefined);
      server.use(http.get('/api/v1/courses/algorithms', requests.resolver));
      const queryClient = createQueryClient();
      queryClient.mount();
      const observer = new QueryObserver(
        queryClient,
        courseContextOptions(VERA, SLUG)
      );
      const unsubscribe = observer.subscribe(() => undefined);
      try {
        await vi.waitFor(() => {
          expect(observer.getCurrentResult().data).toMatchObject({
            status: 'found',
            role: 'student',
          });
        });
        mockBackend.state.memberships = mockBackend.state.memberships.filter(
          ({ userId, courseId }) =>
            userId !== VERA || courseId !== accessWorld.courses.algorithms.id
        );
        if (trigger === 'focus') {
          focusManager.setFocused(false);
          focusManager.setFocused(true);
        } else {
          onlineManager.setOnline(false);
          onlineManager.setOnline(true);
        }
        await vi.waitFor(() => {
          expect(observer.getCurrentResult()).toMatchObject({
            status: 'success',
            data: { status: 'not-found' },
            error: null,
          });
        });
        expect(requests.count).toBe(2);
      } finally {
        unsubscribe();
        queryClient.unmount();
        queryClient.clear();
        focusManager.setFocused(undefined);
        onlineManager.setOnline(true);
      }
    }
  );

  test('access denial explicitly rechecks an inactive context, without touching another User or Course', async () => {
    mockBackend.reset('world:access');
    signInAs(VERA);
    const queryClient = createQueryClient();
    const otherCourseKey = courseContextKeys.bySlug(
      VERA,
      accessWorld.courses.databases.slug
    );
    const otherUserKey = courseContextKeys.bySlug(ANNA, SLUG);
    try {
      await queryClient.query(courseContextOptions(VERA, SLUG));
      await queryClient.query(
        courseContextOptions(VERA, accessWorld.courses.databases.slug)
      );
      signInAs(ANNA);
      await queryClient.query(courseContextOptions(ANNA, SLUG));
      const otherUserState = queryClient.getQueryState(otherUserKey);
      const otherCourseState = queryClient.getQueryState(otherCourseKey);
      signInAs(VERA);
      mockBackend.state.memberships = mockBackend.state.memberships.filter(
        ({ userId, courseId }) =>
          userId !== VERA || courseId !== accessWorld.courses.algorithms.id
      );
      const requests = countRequests(() => undefined);
      server.use(http.get('/api/v1/courses/algorithms', requests.resolver));

      await expect(
        recheckCourseContextAfterAccessDenial(queryClient, VERA, SLUG)
      ).resolves.toEqual({ status: 'not-found' });
      expect(
        queryClient.getQueryData(courseContextKeys.bySlug(VERA, SLUG))
      ).toEqual({ status: 'not-found' });
      expect(requests.count).toBe(1);
      expect(queryClient.getQueryState(otherUserKey)).toBe(otherUserState);
      expect(queryClient.getQueryState(otherCourseKey)).toBe(otherCourseState);
    } finally {
      queryClient.clear();
    }
  });

  test('the access-denial recheck rejects technical failure instead of inventing a denial', async () => {
    mockBackend.reset('world:access');
    signInAs(VERA);
    const queryClient = createQueryClient();
    const key = courseContextKeys.bySlug(VERA, SLUG);
    try {
      const confirmed = await queryClient.query(
        courseContextOptions(VERA, SLUG)
      );
      server.use(http.get('/api/v1/courses/algorithms', undeclaredStatus(500)));

      await expect(
        recheckCourseContextAfterAccessDenial(queryClient, VERA, SLUG)
      ).rejects.toMatchObject({ kind: 'unexpected-http-status' });
      expect(queryClient.getQueryState(key)).toMatchObject({
        status: 'error',
        error: { kind: 'unexpected-http-status' },
        data: confirmed,
        isInvalidated: true,
      });
    } finally {
      queryClient.clear();
    }
  });

  test('a protected access denial replaces an active, older lookup rather than trusting its pending response', async () => {
    mockBackend.reset('world:access');
    signInAs(VERA);
    const queryClient = createQueryClient();
    const held = holdResponse();
    let unsubscribe: () => void = () => undefined;
    try {
      await queryClient.query(courseContextOptions(VERA, SLUG));
      let firstRequest = true;
      server.use(
        http.get('/api/v1/courses/algorithms', (info) => {
          if (firstRequest) {
            firstRequest = false;
            return held.resolver(info);
          }
        })
      );
      const observer = new QueryObserver(
        queryClient,
        courseContextOptions(VERA, SLUG)
      );
      unsubscribe = observer.subscribe(() => undefined);
      const outdated = queryClient.query(courseContextOptions(VERA, SLUG));
      const cancellation = expect(outdated).rejects.toSatisfy(isCancelledError);
      await held.requested;
      mockBackend.state.memberships = mockBackend.state.memberships.filter(
        ({ userId, courseId }) =>
          userId !== VERA || courseId !== accessWorld.courses.algorithms.id
      );

      await expect(
        recheckCourseContextAfterAccessDenial(queryClient, VERA, SLUG)
      ).resolves.toEqual({ status: 'not-found' });
      await cancellation;
      await vi.waitFor(() => {
        expect(observer.getCurrentResult()).toMatchObject({
          status: 'success',
          data: { status: 'not-found' },
          error: null,
        });
      });
    } finally {
      held.release();
      unsubscribe();
      queryClient.clear();
    }
  });
});
