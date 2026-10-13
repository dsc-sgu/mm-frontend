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
  const { courseSlug } = Route.useParams();
  const { variant } = Route.useSearch();
  const { courseAccess } = Route.useRouteContext();
  const { data: course, isPending } = useCoursePageQuery(courseSlug);

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course) {
    return null;
  }

  if (
    (variant === 'overlay' || variant === 'dock') &&
    courseAccess.role === 'teacher'
  ) {
    return <PrototypeCourseView course={course} courseSlug={courseSlug} />;
  }

  return <CoursePage course={course} />;
}
