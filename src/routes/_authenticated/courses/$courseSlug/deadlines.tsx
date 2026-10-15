// PROTOTYPE (#181): throwaway route for deadline screen variants A and D.
// It exists only with `?variant=A|D`.
import { createFileRoute, notFound } from '@tanstack/react-router';

import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { DeadlinesPrototypePage } from '@/features/course/prototype/task-and-deadline-settings/deadlines/page';
import { validatePrototypeSearch } from '@/features/course/prototype/task-and-deadline-settings/search';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/deadlines'
)({
  validateSearch: validatePrototypeSearch,
  staticData: {
    // Teachers only, like the Course Page editor.
    courseSection: 'edit',
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Дедлайны',
        '/courses/$courseSlug/deadlines'
      ),
    },
  },
  beforeLoad({ search }) {
    if (search.variant !== 'A' && search.variant !== 'D') {
      throw notFound();
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug } = Route.useRouteContext();

  return <DeadlinesPrototypePage courseSlug={courseSlug} />;
}
