import { CourseResourceNotFound } from '@/features/course/features/access/ui/route-state';
import { requirePositiveInteger } from '@/features/course/routing/params';
import { getTaskBreadcrumb } from '@/features/course/routing/header';
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
    const taskId = requirePositiveInteger(params.taskId);

    return { taskId };
  },
  component: RouteComponent,
  notFoundComponent: CourseResourceNotFound,
});

function RouteComponent() {
  return <Outlet />;
}
