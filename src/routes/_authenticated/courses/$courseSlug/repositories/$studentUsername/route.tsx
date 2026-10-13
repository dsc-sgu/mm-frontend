import { requireUsername } from '@/features/course/routing/params';
import {
  CourseResourceNotFound,
  CourseResourceCheckFailed,
} from '@/features/course/features/access/ui/route-state';
import { repositoryLocatorOptions } from '@/features/course/features/repository/api/queries';
import { recheckCourseContextAfterAccessDenial } from '@/features/course/features/access/api/queries';
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
  async beforeLoad({ context, params }) {
    const studentUsername = requireUsername(params.studentUsername);
    const result = await context.queryClient.fetchQuery(
      repositoryLocatorOptions(
        context.session.userId,
        context.course.id,
        studentUsername
      )
    );
    if (result.status === 'forbidden') {
      await recheckCourseContextAfterAccessDenial(
        context.queryClient,
        context.session.userId,
        context.courseSlug
      );
    }
    if (result.status !== 'found') throw notFound();
    return { repository: result.repository };
  },
  component: RouteComponent,
  notFoundComponent: CourseResourceNotFound,
  errorComponent: CourseResourceCheckFailed,
});

function RouteComponent() {
  return <Outlet />;
}
