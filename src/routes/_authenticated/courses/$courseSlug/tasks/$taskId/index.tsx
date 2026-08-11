import { createFileRoute } from '@tanstack/react-router';

import { CourseTaskPage } from '@/features/course/features/task/page';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/'
)({
  component: TaskRoute,
});

function TaskRoute() {
  const params = Route.useParams();
  const { courseAccess } = Route.useRouteContext();

  return (
    <CourseTaskPage
      courseSlug={params.courseSlug}
      taskId={params.taskId}
      role={courseAccess.role}
      username={courseAccess.username}
    />
  );
}
