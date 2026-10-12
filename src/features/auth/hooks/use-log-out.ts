import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useLogoutMutation } from '@/features/auth/api/queries';
import { authFailureText } from '@/features/auth/ui/failure-text';

/**
 * Logs out and reports a failure as a toast.
 *
 * The caller (the header) stays mounted across pages, so a failure is shown
 * only while the user is still on the page where logout started.
 */
export function useLogOut() {
  const logoutMutation = useLogoutMutation();
  const router = useRouter();

  return () => {
    const startPathname = router.state.location.pathname;

    logoutMutation.mutate(undefined, {
      onError: (error) => {
        if (router.state.location.pathname === startPathname) {
          toast.error(authFailureText('logout', error));
        }
      },
    });
  };
}
