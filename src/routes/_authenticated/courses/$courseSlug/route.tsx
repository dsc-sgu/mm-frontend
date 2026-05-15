import { COURSES_QUERY_OPTIONS } from '@/course/course.queries';
import { ensureValidCourseSlugOrRedirect } from '@/course/course.validation';
import { requireCourseParticipant } from '@/course/course.guards';
import {
  getCourseNavItems,
  getCourseRootBreadcrumb,
} from '@/header/header-data.utils';
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
