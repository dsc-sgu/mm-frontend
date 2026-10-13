// PROTOTYPE (#181): throwaway route for deadline screen variants A and D.
// It exists only with `?variant=A|D`.
import { createFileRoute, notFound } from '@tanstack/react-router';

import { requireCourseRole } from '@/features/course/routing/guards';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { DeadlinesPrototypePage } from '@/features/course/prototype/task-and-deadline-settings/deadlines/page';
import { validatePrototypeSearch } from '@/features/course/prototype/task-and-deadline-settings/search';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/deadlines'
)({
  validateSearch: validatePrototypeSearch,
  staticData: {
    header: {
      getBreadcrumb: createCourseSectionBreadcrumb(
        'Дедлайны',
        '/courses/$courseSlug/deadlines'
      ),
    },
  },
  async beforeLoad({ context, params, search }) {
    if (search.variant !== 'A' && search.variant !== 'D') {
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
