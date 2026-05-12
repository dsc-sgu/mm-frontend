import { parsePositiveIntegerParam } from '@/course/course-route-params';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId'
)({
  beforeLoad({ params }) {
    const taskId = parsePositiveIntegerParam({
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
