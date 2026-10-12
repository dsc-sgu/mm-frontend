import { requireCourseRole } from '@/features/course/routing/guards';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/'
)({
  beforeLoad({ context }) {
    requireCourseRole({
      courseRole: context.courseRole,
      courseSlug: context.courseSlug,
      roles: ['teacher'],
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="p-6 text-2xl font-semibold">Repositories list page</main>
  );
}
