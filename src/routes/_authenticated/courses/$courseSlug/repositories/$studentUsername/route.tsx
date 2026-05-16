import { ensureValidUsernameOrRedirect } from '@/course/course.validation';
import {
  requireCourseParticipant,
  requireKnownCourseStudent,
} from '@/course/course.guards';
import { getStudentRepositoryBreadcrumb } from '@/course/course-header';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/$studentUsername'
)({
  staticData: {
    header: {
      getBreadcrumb: getStudentRepositoryBreadcrumb,
    },
  },
  async beforeLoad({ context, params }) {
    const studentUsername = ensureValidUsernameOrRedirect({
      studentUsername: params.studentUsername,
      courseSlug: params.courseSlug,
    });
    const courseAccess = await requireCourseParticipant({
      queryClient: context.queryClient,
      courseSlug: params.courseSlug,
    });

    if (courseAccess.role === 'teacher') {
      requireKnownCourseStudent({
        courseSlug: params.courseSlug,
        access: courseAccess,
        studentUsername,
        redirectTo: '/courses/$courseSlug/repositories',
      });
    }

    if (
      courseAccess.role === 'student' &&
      courseAccess.username !== studentUsername
    ) {
      throw redirect({
        to: '/courses/$courseSlug',
        params: { courseSlug: params.courseSlug },
      });
    }

    return { studentUsername };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
