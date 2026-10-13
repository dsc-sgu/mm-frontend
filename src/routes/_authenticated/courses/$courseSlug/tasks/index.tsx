// PROTOTYPE (#181): throwaway route for deadline screen variant B — a Task
// list with a side panel. It exists only with `?variant=B`.
import { createFileRoute, notFound } from '@tanstack/react-router';

import { requireCourseRole } from '@/features/course/routing/guards';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { DeadlinesPrototypePage } from '@/features/course/prototype/task-and-deadline-settings/deadlines/page';
import { validatePrototypeSearch } from '@/features/course/prototype/task-and-deadline-settings/search';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/'
)({
  validateSearch: validatePrototypeSearch,
  staticData: {
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Задания',
        '/courses/$courseSlug/tasks'
      ),
    },
  },
  async beforeLoad({ context, params, search }) {
    if (search.variant !== 'B') {
      throw notFound();
    }

    await requireCourseRole({
      queryClient: context.queryClient,
      courseSlug: params.courseSlug,
      roles: ['teacher'],
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug } = Route.useParams();

  return <DeadlinesPrototypePage courseSlug={courseSlug} />;
}
