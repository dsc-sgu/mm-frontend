import { getRepositoryCommitDetailBreadcrumb } from '@/header/header-data.utils';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/repositories/$studentUsername/commits/$commitId'
)({
  staticData: {
    header: {
      getBreadcrumb: getRepositoryCommitDetailBreadcrumb,
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="p-6 text-2xl font-semibold">
      Student commit detail page
    </main>
  );
}
