import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Link,
  useParams,
  useRouteContext,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import type { CourseAccessRouteState } from '@/features/course/features/access/model/route-state';
import {
  courseContextOptions,
  recheckCourseContextAfterAccessDenial,
} from '@/features/course/features/access/api/queries';
import type { ResourceDenial } from '@/features/course/features/access/api/resource-denial';
import type { UserId } from '@/features/auth/model/identity';
import type { CourseSlug } from '@/features/course/model/identity';
import { parseCourseSlug } from '@/features/course/routing/params';
import { useRequestedCourseSlug } from '@/features/course/routing/requested-slug';
import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

const titles: Record<CourseAccessRouteState, string> = {
  'check-failed': 'Не удалось проверить доступ',
  forbidden: 'Нет доступа',
  'course-not-found': 'Страница не найдена',
  'resource-not-found': 'Страница не найдена',
};

export function CourseContextLoading() {
  return <main className="flex-1" aria-busy="true" />;
}

export function CourseAccessState({
  state,
  courseSlug,
  onRetry,
}: {
  state: CourseAccessRouteState;
  courseSlug?: string;
  onRetry?: () => void;
}) {
  const failed = state === 'check-failed';
  const forbidden = state === 'forbidden';
  const insideCourse = state === 'resource-not-found' || forbidden;

  return (
    <main
      className={cn(
        'flex flex-1 flex-col items-center justify-center',
        'gap-4 p-6 text-center'
      )}
    >
      <h1 className="text-2xl font-semibold">{titles[state]}</h1>
      {forbidden && (
        <p className="text-muted-foreground">
          Этот раздел доступен только преподавателям курса.
        </p>
      )}
      {!failed && !forbidden && (
        <p className="text-muted-foreground">
          Возможно, ссылка устарела или страница больше недоступна.
        </p>
      )}
      <div className="flex gap-3">
        {failed && onRetry && <Button onClick={onRetry}>Повторить</Button>}
        <Button asChild variant={failed ? 'outline' : 'default'}>
          {insideCourse && courseSlug ? (
            <Link to="/courses/$courseSlug" params={{ courseSlug }}>
              На страницу курса
            </Link>
          ) : (
            <Link to="/">К моим курсам</Link>
          )}
        </Button>
      </div>
    </main>
  );
}

export function CourseResourceNotFound() {
  const { courseSlug } = useParams({
    from: '/_authenticated/courses/$courseSlug',
  });
  return (
    <CourseAccessState state="resource-not-found" courseSlug={courseSlug} />
  );
}

/**
 * Replaces a participant-bound page whose read was denied after its locator
 * resolved. Any denial may be a lost Membership or a changed role (ADR 0006):
 * the recheck lets the Course route close itself in that case.
 * Pages render it by hand until #243 applies it from the Course shell.
 */
export function CourseResourceDenied({ denial }: { denial: ResourceDenial }) {
  const queryClient = useQueryClient();
  const { session, courseSlug } = useRouteContext({
    from: '/_authenticated/courses/$courseSlug',
  });

  useEffect(() => {
    // The Course route renders the recheck's own failure from its query.
    recheckCourseContextAfterAccessDenial(
      queryClient,
      session.userId,
      courseSlug
    ).catch(() => undefined);
  }, [denial, queryClient, session.userId, courseSlug]);

  return <CourseResourceNotFound />;
}

export function CourseResourceCheckFailed() {
  const router = useRouter();
  return (
    <CourseAccessState
      state="check-failed"
      onRetry={() => void router.invalidate()}
    />
  );
}

export function CourseRouteOutcome({ kind }: { kind: 'lookup' | 'resource' }) {
  const { session } = useRouteContext({ from: '/_authenticated' });
  const { courseSlug: rawSlug } = useParams({
    from: '/_authenticated/courses/$courseSlug',
  });
  const requestedSlug = useRequestedCourseSlug();
  const courseSlug = parseCourseSlug(rawSlug);
  if (requestedSlug !== rawSlug) return <CourseContextLoading />;
  if (!courseSlug) return <CourseAccessState state="course-not-found" />;
  return (
    <CourseLocatorOutcome
      kind={kind}
      userId={session.userId}
      courseSlug={courseSlug}
    />
  );
}

function CourseLocatorOutcome({
  kind,
  userId,
  courseSlug,
}: {
  kind: 'lookup' | 'resource';
  userId: UserId;
  courseSlug: CourseSlug;
}) {
  const router = useRouter();
  const requestedSlug = useRequestedCourseSlug();
  const isLoading = useRouterState({ select: (state) => state.isLoading });
  const query = useQuery({
    ...courseContextOptions(userId, courseSlug),
    // beforeLoad already performed the first attempt.
    refetchOnMount: false,
    retryOnMount: false,
  });

  useEffect(() => {
    if (
      kind === 'lookup' &&
      requestedSlug === courseSlug &&
      !isLoading &&
      !query.isError &&
      query.data?.status === 'found'
    ) {
      // Reconcile the newly confirmed identity into Router context so its
      // child guards run before protected content can mount.
      void router.invalidate();
    }
  }, [
    kind,
    requestedSlug,
    courseSlug,
    isLoading,
    query.isError,
    query.data,
    router,
  ]);

  if (requestedSlug !== courseSlug) return <CourseContextLoading />;
  if (query.isError) {
    return (
      <CourseAccessState
        state="check-failed"
        onRetry={() => void router.invalidate()}
      />
    );
  }
  if (kind === 'resource' && query.data?.status === 'found') {
    return <CourseResourceNotFound />;
  }
  if (!query.data || query.data.status === 'found') {
    return <CourseContextLoading />;
  }
  return <CourseAccessState state="course-not-found" />;
}
