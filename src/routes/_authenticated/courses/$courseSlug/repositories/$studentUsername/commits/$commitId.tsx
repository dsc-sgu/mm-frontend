import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/$studentUsername/commits/$commitId'
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="p-6 text-2xl font-semibold">
      Student commit detail page
    </main>
  );
}
