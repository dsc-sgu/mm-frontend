import { parseCourseSlugParam } from '@/course/course-route-params';
import { requireCourseParticipant } from '@/course/course-route-guards';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug')({
  async beforeLoad({ context, params }) {
    const courseSlug = parseCourseSlugParam(params.courseSlug);
    const courseAccess = await requireCourseParticipant({
      queryClient: context.queryClient,
      courseSlug,
    });

    return { courseSlug, courseAccess };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
