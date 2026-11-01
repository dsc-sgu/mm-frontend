import { prefetchCoursePage } from '@/features/course/features/page-document/api/queries';
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
  loader: ({ context }) => {
    prefetchCoursePage(
      context.queryClient,
      context.course.id,
      context.session.userId
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { course, courseSlug } = Route.useRouteContext();

  return <CoursePageEditPage courseId={course.id} courseSlug={courseSlug} />;
}
