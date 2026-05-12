import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/$studentUsername/commits'
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
