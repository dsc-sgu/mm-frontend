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
  const params = Route.useParams();
  const { studentUsername, attemptNumber, courseRole } =
    Route.useRouteContext();

  return (
    <AttemptReviewPage
      mode="editable"
      courseRole={courseRole}
      courseSlug={params.courseSlug}
      taskId={params.taskId}
      studentUsername={studentUsername}
      attemptNumber={attemptNumber}
    />
  );
}
