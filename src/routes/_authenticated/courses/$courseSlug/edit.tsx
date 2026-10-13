import { CoursePageEditPage } from '@/features/course/features/page-edit/page';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/edit'
)({
  staticData: {
    courseSection: 'edit',
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Редактирование',
        '/courses/$courseSlug/edit'
      ),
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug } = Route.useParams();

  return <CoursePageEditPage courseSlug={courseSlug} />;
}
