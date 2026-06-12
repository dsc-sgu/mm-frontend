import { COURSES_QUERY_OPTIONS } from '@/features/course/api/queries';
import { ensureValidCourseSlugOrRedirect } from '@/features/course/routing/params';
import { requireCourseParticipant } from '@/features/course/routing/guards';
import {
  getCourseNavItems,
  getCourseRootBreadcrumb,
} from '@/features/course/routing/header';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug')({
  async beforeLoad({ context, params }) {
    const courseSlug = ensureValidCourseSlugOrRedirect(params.courseSlug);
    const courseAccess = await requireCourseParticipant({
      queryClient: context.queryClient,
      courseSlug,
    });
    const courses = await context.queryClient.ensureQueryData(
      COURSES_QUERY_OPTIONS
    );
    const course = courses.find((item) => item.courseId === courseSlug);

    if (!course) {
      throw redirect({ to: '/' });
    }

    return { courseSlug, courseAccess, course };
  },
  staticData: {
    header: {
      getBreadcrumb: getCourseRootBreadcrumb,
      getNavItems: getCourseNavItems,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
