import {
  CoursePage,
  CoursePageLoading,
  CoursePageNotFound,
} from '@/course/course-page.component';
import { useCoursePageQuery } from '@/course/course-page.queries';
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
    return <CoursePageNotFound />;
  }

  return <CoursePage course={course} />;
}
