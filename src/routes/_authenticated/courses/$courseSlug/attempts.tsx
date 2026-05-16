import { requireCourseRole } from '@/course/course.guards';
import { createCourseSectionBreadcrumb } from '@/course/course-header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/attempts'
)({
  staticData: {
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Попытки',
        '/courses/$courseSlug/attempts'
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
  return <main className="p-6 text-2xl font-semibold">Attempts page</main>;
}
