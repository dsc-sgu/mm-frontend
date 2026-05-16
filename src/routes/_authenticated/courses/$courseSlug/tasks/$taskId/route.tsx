import { ensurePositiveIntegerOrRedirect } from '@/course/course.validation';
import { getTaskBreadcrumb } from '@/course/course-header';
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
