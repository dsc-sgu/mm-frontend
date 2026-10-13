import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/'
)({
  staticData: { courseSection: 'repositories' },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="p-6 text-2xl font-semibold">Repositories list page</main>
  );
}
