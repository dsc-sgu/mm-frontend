import { AttemptReviewPage } from '@/features/course/features/attempt-review/page';
import { requireCourseRole } from '@/features/course/routing/guards';
import { getAttemptReviewBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber/review'
)({
  staticData: {
    header: {
      getBreadcrumb: getAttemptReviewBreadcrumb,
    },
  },
  async beforeLoad({ context, params }) {
    await requireCourseRole({
      queryClient: context.queryClient,
      courseSlug: params.courseSlug,
      roles: ['teacher'],
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  const { studentUsername, attemptNumber } = Route.useRouteContext();

  return (
    <AttemptReviewPage
      mode="editable"
      courseSlug={params.courseSlug}
      taskId={params.taskId}
      studentUsername={studentUsername}
      attemptNumber={attemptNumber}
    />
  );
}
