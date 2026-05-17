import { requireCourseRole } from '@/course/course.guards';
import { getTaskEditBreadcrumb } from '@/course/course-route.header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/edit'
)({
  staticData: {
    header: {
      getBreadcrumb: getTaskEditBreadcrumb,
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
  return <main className="p-6 text-2xl font-semibold">Task edit page</main>;
}
