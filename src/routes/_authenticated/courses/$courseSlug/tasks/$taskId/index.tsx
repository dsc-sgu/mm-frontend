import { createFileRoute } from '@tanstack/react-router';

import { CourseTaskPage } from '@/features/course/features/task/page';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/'
)({
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
      viewerId={session.userId}
    />
  );
}
