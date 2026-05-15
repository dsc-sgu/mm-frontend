import { getRepositoryCommitsBreadcrumb } from '@/header/header-data.utils';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/$studentUsername/commits'
)({
  staticData: {
    header: {
      getBreadcrumb: getRepositoryCommitsBreadcrumb,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
