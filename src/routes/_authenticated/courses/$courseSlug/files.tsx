import { requireCourseRole } from '@/course/course.guards';
import { createCourseSectionBreadcrumb } from '@/course/course-route.header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/files'
)({
  staticData: {
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Файлы',
        '/courses/$courseSlug/files'
      ),
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
  return <main className="p-6 text-2xl font-semibold">Course files page</main>;
}
