import { getTaskEditBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/edit'
)({
  staticData: {
    courseSection: 'edit',
    header: {
      getBreadcrumb: getTaskEditBreadcrumb,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <main className="p-6 text-2xl font-semibold">Task edit page</main>;
}
