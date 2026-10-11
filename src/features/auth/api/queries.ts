import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { OperationFailure } from '@/app/remote-data/http';
import { checkSession } from '@/features/auth/api/check-session';
import { login } from '@/features/auth/api/login';
import { logout } from '@/features/auth/api/logout';
import { register } from '@/features/auth/api/register';

export const sessionKeys = {
  all: ['session'] as const,
};

/**
 * Checking the session is safe to repeat. One retry covers a network failure
 * or a gateway status; any other failure, and cancellation, is final.
 */
export function canRetrySessionCheck(failureCount: number, error: Error) {
  if (failureCount >= 1 || !(error instanceof OperationFailure)) {
    return false;
  }

  const { reason } = error;
  return (
    reason.kind === 'network' ||
    (reason.kind === 'unexpected-http' &&
      [502, 503, 504].includes(reason.status))
  );
}

export const sessionOptions = queryOptions({
  queryKey: sessionKeys.all,
  queryFn: ({ signal }) => checkSession(signal),
  staleTime: 5 * 60 * 1000,
  retry: canRetrySessionCheck,
  retryDelay: 500,
});

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: async (outcome) => {
      if (outcome.status === 'signed-in') {
        // The caller navigates into the app next, so wait for the new session.
        await queryClient.invalidateQueries({
          queryKey: sessionKeys.all,
          refetchType: 'all',
        });
      }
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: register,
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sessionKeys.all,
        refetchType: 'all',
      });
      await router.invalidate();
    },
  });
}
