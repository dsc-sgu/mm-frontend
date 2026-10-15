import {
  CoursePage,
  CoursePageLoading,
} from '@/features/course/features/page/ui/page';
import { useCoursePageQuery } from '@/features/course/features/page/api/queries';
import { createFileRoute } from '@tanstack/react-router';
// PROTOTYPE (#181): `?variant=overlay|dock` edits a Task in a side panel.
import { PrototypeCourseView } from '@/features/course/prototype/task-and-deadline-settings/course-view';
import { validatePrototypeSearch } from '@/features/course/prototype/task-and-deadline-settings/search';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug/')({
  validateSearch: validatePrototypeSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const { course: confirmed, courseSlug, courseRole } = Route.useRouteContext();
  const { variant } = Route.useSearch();
  const { data: course, isPending } = useCoursePageQuery(confirmed.id);

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course) {
    return null;
  }

  if (
    (variant === 'overlay' || variant === 'dock') &&
    courseRole === 'teacher'
  ) {
    return (
      <PrototypeCourseView
        course={{ ...course, courseId: courseSlug }}
        courseSlug={courseSlug}
      />
    );
  }

  // A Page cached by CourseId may predate a slug change; links follow the
  // slug the route has just confirmed.
  return <CoursePage course={{ ...course, courseId: courseSlug }} />;
}
