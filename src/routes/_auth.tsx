import { SESSION_OPTIONS } from '@/auth/auth.queries';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  async beforeLoad({ context }) {
    const session = await context.queryClient.ensureQueryData(SESSION_OPTIONS);
    if (session.status === 'AUTHORIZED') {
      // TODO: Make already auth toast
      throw redirect({
        to: '/',
      });
    }
  },
});
