import { useQuery } from '@tanstack/react-query';
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';
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
    const cached = context.queryClient.getQueryData(options.queryKey);
    const queryState = context.queryClient.getQueryState(options.queryKey);
    const result =
      cached?.status === 'found' && queryState?.status === 'success'
        ? cause === 'stay'
          ? cached
          : await context.queryClient.ensureQueryData({
              ...options,
              revalidateIfStale: true,
            })
        : await context.queryClient.fetchQuery(options);

    if (result.status !== 'found') {
      throw notFound();
    }
    return { courseSlug, course: result.course, courseRole: result.role };
  },
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: CourseContextLoading,
  notFoundComponent: CourseRouteOutcome,
  errorComponent: CourseRouteOutcome,
  staticData: {
    header: {
      getBreadcrumb: getCourseRootBreadcrumb,
      getNavItems: getCourseNavItems,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug, session } = Route.useRouteContext();
  const requestedCourseSlug = useRequestedCourseSlug();
  const query = useQuery({
    ...courseContextOptions(session.userId, courseSlug),
    // beforeLoad owns the entry recheck, including cached confirmation.
    refetchOnMount: false,
  });

  if (requestedCourseSlug !== courseSlug) {
    return <CourseContextLoading />;
  }
  if (query.isError) return <CourseRouteOutcome />;
  if (!query.data) return <CourseContextLoading />;
  if (query.data.status !== 'found') {
    return (
      <CourseAccessState state={courseAccessRouteState(query.data.status)} />
    );
  }
  return <Outlet />;
}
