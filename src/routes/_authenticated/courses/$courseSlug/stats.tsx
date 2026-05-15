import { createCourseChildBreadcrumb } from '@/header/header-data.utils';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/stats'
)({
  staticData: {
    header: {
      getBreadcrumb: createCourseChildBreadcrumb(
        'Аналитика',
        '/courses/$courseSlug/stats'
      ),
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <main className="p-6 text-2xl font-semibold">Stats page</main>;
}
