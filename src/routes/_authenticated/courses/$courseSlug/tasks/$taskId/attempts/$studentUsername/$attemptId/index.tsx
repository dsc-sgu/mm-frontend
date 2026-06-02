import { AttemptReviewPage } from '@/course/attempt-review/attempt-review.page';
import { getAttemptDiffBreadcrumb } from '@/course/course-route.header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/'
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

  return (
    <AttemptReviewPage
      mode="readonly"
      courseSlug={params.courseSlug}
      taskId={params.taskId}
      studentUsername={params.studentUsername}
      attemptId={Number(params.attemptId)}
    />
  );
}
