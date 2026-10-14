import {
  CoursePage,
  CoursePageLoading,
} from '@/features/course/features/page/ui/page';
import { useCoursePageQuery } from '@/features/course/features/page/api/queries';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { course: confirmed, courseSlug } = Route.useRouteContext();
  const { data: course, isPending } = useCoursePageQuery(confirmed.id);

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course) {
    return null;
  }

  // A Page cached by CourseId may predate a slug change; links follow the
  // slug the route has just confirmed.
  return <CoursePage course={{ ...course, courseId: courseSlug }} />;
}
