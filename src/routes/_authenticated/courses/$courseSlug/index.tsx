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
    prefetchCoursePage(context.queryClient, {
      courseId: context.course.id,
      viewerId: context.session.userId,
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { course: confirmed, courseSlug, session } = Route.useRouteContext();
  const {
    data: course,
    isPending,
    isError,
    isFetching,
    errorUpdatedAt,
    refetch,
  } = useCoursePageQuery({
    courseId: confirmed.id,
    viewerId: session.userId,
  });

  // A no-data retry resets Query to pending; keep the failure screen visible.
  if (isError || (isPending && errorUpdatedAt > 0)) {
    return <CoursePageLoadError isRetrying={isFetching} onRetry={refetch} />;
  }

  if (isPending) {
    return <CoursePageLoading />;
  }

  if (!course || course.status === 'not-found') {
    return null;
  }

  return <CoursePage course={{ ...course, slug: courseSlug }} />;
}
