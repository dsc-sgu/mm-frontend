import {
  CoursePage,
  CoursePageLoading,
} from '@/course/page/course-page.component';
import { useCoursePageQuery } from '@/course/page/course-page.queries';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug } = Route.useParams();
  const { data: course, isPending } = useCoursePageQuery(courseSlug);

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course) {
    return null;
  }

  return <CoursePage course={course} />;
}
