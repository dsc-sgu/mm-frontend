import { useEffect } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createFileRoute,
  notFound,
  useMatches,
  useRouter,
} from '@tanstack/react-router';
import { canAccessCourseSection } from '@/features/course/features/access/model/section-policy';
import { getCourseSection } from '@/features/course/routing/section';
import { courseContextOptions } from '@/features/course/features/access/api/queries';
import { courseAccessRouteState } from '@/features/course/features/access/model/route-state';
import {
  CourseAccessState,
  CourseContextLoading,
  CourseRouteOutcome,
} from '@/features/course/features/access/ui/route-state';
import { requireCourseSlug } from '@/features/course/routing/params';
import { useRequestedCourseSlug } from '@/features/course/routing/requested-slug';
import {
  getCourseNavItems,
  getCourseRootBreadcrumb,
} from '@/features/course/routing/header';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug')({
  async beforeLoad({ context, params, cause }) {
    const courseSlug = requireCourseSlug(params.courseSlug);
    const options = courseContextOptions(context.session.userId, courseSlug);
    const result = await loadCourseContext(
      context.queryClient,
      options,
      cause === 'stay'
    );

    if (result.status !== 'found') {
      throw notFound({ data: 'course-lookup' });
    }
    return { courseSlug, course: result.course, courseRole: result.role };
  },
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: CourseContextLoading,
  notFoundComponent: ({ data }) => (
    <CourseRouteOutcome
      kind={data === 'course-lookup' ? 'lookup' : 'resource'}
    />
  ),
  errorComponent: () => <CourseRouteOutcome kind="lookup" />,
  staticData: {
    courseSection: 'page',
    header: {
      getBreadcrumb: getCourseRootBreadcrumb,
      getNavItems: getCourseNavItems,
    },
  },
  component: RouteComponent,
});

async function loadCourseContext(
  queryClient: QueryClient,
  options: ReturnType<typeof courseContextOptions>,
  stay: boolean
) {
  const cached = queryClient.getQueryData(options.queryKey);
  const query = queryClient.getQueryCache().find({
    queryKey: options.queryKey,
    exact: true,
  });
  if (cached?.status !== 'found' || query?.state.status !== 'success') {
    return queryClient.fetchQuery(options);
  }
  // Only an observed, exact identity/locator can be a reconciliation.
  if (stay && query.isActive()) {
    return cached;
  }
  return queryClient.ensureQueryData({ ...options, revalidateIfStale: true });
}

function RouteComponent() {
  const matches = useMatches();
  const section = getCourseSection(matches);
  const resourceUnavailable = matches.some(
    (match) =>
      match.routeId !== Route.id &&
      (match.status === 'notFound' || match.status === 'error')
  );
  const { courseSlug, courseRole, session } = Route.useRouteContext();
  const router = useRouter();
  const requestedCourseSlug = useRequestedCourseSlug();
  const query = useQuery({
    ...courseContextOptions(session.userId, courseSlug),
    // beforeLoad owns the entry recheck, including cached confirmation.
    refetchOnMount: false,
  });
  const roleChanged =
    query.data?.status === 'found' && query.data.role !== courseRole;

  useEffect(() => {
    if (requestedCourseSlug === courseSlug && !query.isError && roleChanged) {
      // Re-run resource guards and replace child context after a role change.
      void router.invalidate();
    }
  }, [requestedCourseSlug, courseSlug, query.isError, roleChanged, router]);

  if (requestedCourseSlug !== courseSlug) {
    return <CourseContextLoading />;
  }
  if (query.isError) return <CourseRouteOutcome kind="lookup" />;
  if (!query.data) return <CourseContextLoading />;
  if (query.data.status !== 'found') {
    return (
      <CourseAccessState state={courseAccessRouteState(query.data.status)} />
    );
  }
  // Authorize before mounting any child content, using the live lookup rather
  // than the role captured by beforeLoad. Background demotion closes the route.
  if (
    !resourceUnavailable &&
    !canAccessCourseSection(section, query.data.role)
  ) {
    return <CourseAccessState state="forbidden" courseSlug={courseSlug} />;
  }
  // Do not leave role-sensitive actions mounted while Router reconciles the
  // latest confirmed role into its child context.
  if (roleChanged) return <CourseContextLoading />;
  return <Outlet />;
}
