import { sessionOptions } from '@/features/auth/api/queries';
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
});

function AuthenticatedRouteComponent() {
  return (
    <AttemptReviewWorkerPool>
      <Outlet />
    </AttemptReviewWorkerPool>
  );
}
