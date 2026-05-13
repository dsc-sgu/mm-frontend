import { ensureValidCourseSlugOrRedirect } from '@/course/course.validation';
import { requireCourseParticipant } from '@/course/course.guards';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/courses/$courseSlug')({
  async beforeLoad({ context, params }) {
    const courseSlug = ensureValidCourseSlugOrRedirect(params.courseSlug);
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
