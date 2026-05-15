import { getCourseRepositoriesBreadcrumb } from '@/header/header-data.utils';
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
