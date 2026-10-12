import { sessionOptions } from '@/features/auth/api/queries';
import { CourseContextLoading } from '@/features/course/features/access/ui/route-state';
import { AttemptReviewWorkerPool } from '@/features/course/features/attempt-review/providers/worker-pool';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
  async beforeLoad({ context }) {
    const session = await context.queryClient.ensureQueryData(sessionOptions);
    if (session.status === 'not-authorized') {
      // TODO: Make auto redirect to previous page
      throw redirect({
        to: '/login',
      });
    }

    return { session: session.session };
  },
  component: AuthenticatedRouteComponent,
  pendingComponent: CourseContextLoading,
  pendingMs: 0,
  pendingMinMs: 0,
});

function AuthenticatedRouteComponent() {
  return (
    <AttemptReviewWorkerPool>
      <Outlet />
    </AttemptReviewWorkerPool>
  );
}
