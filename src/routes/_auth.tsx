import { sessionOptions } from '@/features/auth/api/queries';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  async beforeLoad({ context }) {
    const session = await context.queryClient.ensureQueryData(sessionOptions);
    if (session.status === 'authorized') {
      // TODO: Make already auth toast
      throw redirect({
        to: '/',
      });
    }
  },
});
