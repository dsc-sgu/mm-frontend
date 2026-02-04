import { SESSION_OPTIONS } from '@/auth/auth.queries';
import { createFileRoute, redirect } from '@tanstack/react-router';

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
});
