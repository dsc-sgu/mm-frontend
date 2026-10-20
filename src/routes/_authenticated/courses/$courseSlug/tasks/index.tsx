// PROTOTYPE (#181): throwaway route for deadline screen variant B — a Task
// list with a side panel. It exists only while #181 is on in the prototype
// bar.
import { createFileRoute } from '@tanstack/react-router';

import { CourseRouteOutcome } from '@/features/course/features/access/ui/route-state';
import { createCourseSectionBreadcrumb } from '@/features/course/routing/header';
import { DeadlinesPrototypePage } from '@/features/course/prototype/task-and-deadline-settings/deadlines/page';
import {
  useCurrentVariant,
  validatePrototypeSearch,
} from '@/features/course/prototype/task-and-deadline-settings/search';

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
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug } = Route.useRouteContext();
  const variant = useCurrentVariant();

  if (!variant) {
    return <CourseRouteOutcome kind="resource" />;
  }

  return <DeadlinesPrototypePage courseSlug={courseSlug} />;
}
