import { AttemptReviewPage } from '@/features/course/features/attempt-review/page';
import { getAttemptDiffBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber/'
)({
  staticData: {
    header: {
      getBreadcrumb: getAttemptDiffBreadcrumb,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { attempt, course, courseRole, session } = Route.useRouteContext();

  return (
    <AttemptReviewPage
      mode="readonly"
      courseRole={courseRole}
      courseId={course.id}
      studentId={attempt.studentId}
      attemptId={attempt.id}
      viewerId={session.userId}
    />
  );
}
