import { AttemptReviewPage } from '@/features/course/features/attempt-review/page';
import { getAttemptReviewBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber/review'
)({
  staticData: {
    courseSection: 'attempts',
    header: {
      getBreadcrumb: getAttemptReviewBreadcrumb,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { attempt, course, courseRole, session } = Route.useRouteContext();

  return (
    <AttemptReviewPage
      mode="editable"
      courseRole={courseRole}
      courseId={course.id}
      taskId={attempt.taskId}
      studentId={attempt.studentId}
      attemptId={attempt.id}
      viewerId={session.userId}
    />
  );
}
