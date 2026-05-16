import { getCourseRepositoriesBreadcrumb } from '@/course/course-header';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories'
)({
  staticData: {
    header: {
      getBreadcrumb: getCourseRepositoriesBreadcrumb,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
