import { CourseTaskPage } from '@/features/course/features/task/page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/courses/$courseSlug/tasks/$taskId/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { courseSlug, taskId } = Route.useParams();

  return <CourseTaskPage courseSlug={courseSlug} taskId={taskId} />;
}
