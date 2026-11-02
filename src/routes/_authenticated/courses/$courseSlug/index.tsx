import {
  CoursePage,
  CoursePageLoading,
} from '@/features/course/features/page/ui/page';
import { useCoursePageQuery } from '@/features/course/features/page/api/queries';
import { prefetchCoursePage } from '@/features/course/features/page/api/prefetch';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug/')({
  loader({ context }) {
    prefetchCoursePage(context.queryClient, {
      courseId: context.course.id,
      viewerId: context.session.userId,
      role: context.courseRole,
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { course: confirmed, courseRole, session } = Route.useRouteContext();
  const { data: outcome, isPending } = useCoursePageQuery({
    courseId: confirmed.id,
    viewerId: session.userId,
    role: courseRole,
  });

  if (isPending) {
    return <CoursePageLoading />;
  }
  if (outcome?.status !== 'found') {
    return null;
  }
  return <CoursePage course={outcome.page} />;
}
