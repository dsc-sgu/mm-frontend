import { CoursePageLoadError } from '@/features/course/features/page/ui/load-error';
import { prefetchCoursePage } from '@/features/course/features/page-document/api/queries';
import {
  CoursePage,
  CoursePageLoading,
} from '@/features/course/features/page/ui/page';
import { useCoursePageQuery } from '@/features/course/features/page-document/api/queries';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug/')({
  loader: ({ context }) => {
    prefetchCoursePage(
      context.queryClient,
      context.course.id,
      context.session.userId
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { course: confirmed, courseSlug } = Route.useRouteContext();
  const {
    data: course,
    isPending,
    isError,
    refetch,
  } = useCoursePageQuery(confirmed.id);

  if (isError) {
    return <CoursePageLoadError onRetry={refetch} />;
  }

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course || course.status === 'not-found') {
    return null;
  }

  return <CoursePage course={{ ...course, slug: courseSlug }} />;
}
