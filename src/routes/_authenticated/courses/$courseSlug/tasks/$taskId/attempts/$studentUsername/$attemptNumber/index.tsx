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
  const params = Route.useParams();
  const { studentUsername, attemptNumber } = Route.useRouteContext();

  return (
    <AttemptReviewPage
      mode="readonly"
      courseSlug={params.courseSlug}
      taskId={params.taskId}
      studentUsername={studentUsername}
      attemptNumber={attemptNumber}
    />
  );
}
