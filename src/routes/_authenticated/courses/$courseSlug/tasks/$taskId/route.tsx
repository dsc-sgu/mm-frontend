import { ensurePositiveIntegerOrRedirect } from '@/course/routing/params';
import { getTaskBreadcrumb } from '@/course/routing/header';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId'
)({
  staticData: {
    header: {
      getBreadcrumb: getTaskBreadcrumb,
    },
  },
  beforeLoad({ params }) {
    const taskId = ensurePositiveIntegerOrRedirect({
      value: params.taskId,
      courseSlug: params.courseSlug,
    });

    return { taskId };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
