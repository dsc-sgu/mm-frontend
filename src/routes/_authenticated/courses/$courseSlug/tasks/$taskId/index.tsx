import { createFileRoute } from '@tanstack/react-router';

import { prefetchTaskPage } from '@/features/course/features/task/api/prefetch';
import { CourseTaskPage } from '@/features/course/features/task/page';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/'
)({
  loader({ context, params }) {
    const { course, courseRole, queryClient, session } = context;
    prefetchTaskPage(queryClient, {
      viewerId: session.userId,
      courseId: course.id,
      taskId: params.taskId,
      studentId: courseRole === 'student' ? session.userId : null,
    });
  },
  component: TaskRoute,
});

function TaskRoute() {
  const params = Route.useParams();
  const { course, courseSlug, courseRole, session } = Route.useRouteContext();

  return (
    <CourseTaskPage
      courseId={course.id}
      courseSlug={courseSlug}
      taskId={params.taskId}
      role={courseRole}
      viewer={session}
    />
  );
}
