import {
  requireAttemptNumber,
  requireUsername,
} from '@/features/course/routing/params';
import { CourseResourceNotFound } from '@/features/course/features/access/ui/route-state';
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber'
)({
  beforeLoad({ context, params }) {
    const studentUsername = requireUsername(params.studentUsername);
    const attemptNumber = requireAttemptNumber(params.attemptNumber);
    if (
      context.courseRole === 'student' &&
      context.session.username !== studentUsername
    ) {
      throw notFound();
    }

    return { attemptNumber, studentUsername };
  },
  component: RouteComponent,
  notFoundComponent: CourseResourceNotFound,
});

function RouteComponent() {
  return <Outlet />;
}
