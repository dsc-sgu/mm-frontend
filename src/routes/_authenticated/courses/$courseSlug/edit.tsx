import { CoursePageEditPage } from '@/features/course/features/page-edit/page';
import { prefetchCoursePage } from '@/features/course/features/page/api/prefetch';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/edit'
)({
  loader({ context }) {
    prefetchCoursePage(context.queryClient, {
      courseId: context.course.id,
      viewerId: context.session.userId,
      role: context.courseRole,
    });
  },
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
  const { course, courseSlug, courseRole, session } = Route.useRouteContext();

  return (
    <CoursePageEditPage
      courseId={course.id}
      courseSlug={courseSlug}
      viewerId={session.userId}
      role={courseRole}
    />
  );
}
