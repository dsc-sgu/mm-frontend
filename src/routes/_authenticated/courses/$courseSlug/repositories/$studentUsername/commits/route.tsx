import { getRepositoryCommitsBreadcrumb } from '@/course/course-header';
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
