import { SESSION_OPTIONS } from '@/features/auth/api/queries';
import { AttemptReviewWorkerPool } from '@/features/course/features/attempt-review/providers/worker-pool';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
  async beforeLoad({ context }) {
    const session = await context.queryClient.ensureQueryData(SESSION_OPTIONS);
    if (session.status === 'NOT_AUTHORIZED') {
      // TODO: Make auto redirect to previous page
      throw redirect({
        to: '/login',
      });
    }
  },
  component: AuthenticatedRouteComponent,
});

function AuthenticatedRouteComponent() {
  return (
    <AttemptReviewWorkerPool>
      <Outlet />
    </AttemptReviewWorkerPool>
  );
}
