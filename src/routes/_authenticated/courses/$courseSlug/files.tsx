import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/files'
)({
  staticData: {
    courseSection: 'files',
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Файлы',
        '/courses/$courseSlug/files'
      ),
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <main className="p-6 text-2xl font-semibold">Course files page</main>;
}
