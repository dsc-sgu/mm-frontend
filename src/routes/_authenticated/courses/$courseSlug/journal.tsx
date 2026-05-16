import { createCourseSectionBreadcrumb } from '@/header/header-data.utils';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/journal'
)({
  staticData: {
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Журнал',
        '/courses/$courseSlug/journal'
      ),
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <main className="p-6 text-2xl font-semibold">Journal page</main>;
}
