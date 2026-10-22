import {
  requireAttemptNumber,
  requireUsername,
} from '@/features/course/routing/params';
import {
  CourseResourceNotFound,
  CourseResourceCheckFailed,
} from '@/features/course/features/access/ui/route-state';
import { DiffWorkers } from '@/features/course/features/attempt-review/providers/diff-workers';
import { attemptLocatorOptions } from '@/features/course/features/attempt-review/api/locator-queries';
import { prefetchAttemptPage } from '@/features/course/features/attempt-review/api/prefetch';
import { recheckCourseContextAfterAccessDenial } from '@/features/course/features/access/api/queries';
import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber'
)({
  async beforeLoad({ context, params }) {
    const studentUsername = requireUsername(params.studentUsername);
    const attemptNumber = requireAttemptNumber(params.attemptNumber);
    const result = await context.queryClient.fetchQuery(
      attemptLocatorOptions(
        context.session.userId,
        context.course.id,
        String(context.taskId),
        studentUsername,
        attemptNumber
      )
    );
    if (result.status !== 'found') {
      // Any denial may be a lost Course access, not only a missing resource.
      await recheckCourseContextAfterAccessDenial(
        context.queryClient,
        context.session.userId,
        context.courseSlug
      );
      throw notFound();
    }
    return { attempt: result.attempt };
  },
  // Starts the page reads alongside its lazy chunk; deliberately not awaited.
  loader({ context }) {
    const { attempt, course, queryClient, session } = context;
    prefetchAttemptPage(queryClient, {
      viewerId: session.userId,
      courseId: course.id,
      taskId: attempt.taskId,
      studentId: attempt.studentId,
      attemptId: attempt.id,
    });
  },
  component: RouteComponent,
  notFoundComponent: CourseResourceNotFound,
  errorComponent: CourseResourceCheckFailed,
});

// The Attempt page and the Review editor share one diff Worker pool.
function RouteComponent() {
  return (
    <DiffWorkers>
      <Outlet />
    </DiffWorkers>
  );
}
