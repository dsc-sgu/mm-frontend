import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories'
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
