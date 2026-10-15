// PROTOTYPE (#181): throwaway route for deadline screen variant B — a Task
// list with a side panel. It exists only with `?variant=B`.
import { createFileRoute, notFound } from '@tanstack/react-router';

import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { DeadlinesPrototypePage } from '@/features/course/prototype/task-and-deadline-settings/deadlines/page';
import { validatePrototypeSearch } from '@/features/course/prototype/task-and-deadline-settings/search';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/'
)({
  validateSearch: validatePrototypeSearch,
  staticData: {
    // Teachers only, like the Course Page editor.
    courseSection: 'edit',
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Задания',
        '/courses/$courseSlug/tasks'
      ),
    },
  },
  beforeLoad({ search }) {
    if (search.variant !== 'B') {
      throw notFound();
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug } = Route.useRouteContext();

  return <DeadlinesPrototypePage courseSlug={courseSlug} />;
}
