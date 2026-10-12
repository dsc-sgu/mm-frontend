import { requireUsername } from '@/features/course/routing/params';
import { CourseResourceNotFound } from '@/features/course/features/access/ui/route-state';
import { getStudentRepositoryBreadcrumb } from '@/features/course/routing/header';
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/$studentUsername'
)({
  staticData: {
    header: {
      getBreadcrumb: getStudentRepositoryBreadcrumb,
    },
  },
  beforeLoad({ context, params }) {
    const studentUsername = requireUsername(params.studentUsername);
    if (
      context.courseRole === 'student' &&
      context.session.username !== studentUsername
    ) {
      throw notFound();
    }

    return { studentUsername };
  },
  component: RouteComponent,
  notFoundComponent: CourseResourceNotFound,
});

function RouteComponent() {
  return <Outlet />;
}
