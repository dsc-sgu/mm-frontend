import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { OperationFailure } from '@/app/remote-data/http';
import {
  checkSession,
  type SessionOutcome,
} from '@/features/auth/api/check-session';
import { login } from '@/features/auth/api/login';
import { logout } from '@/features/auth/api/logout';
import { register } from '@/features/auth/api/register';
import { courseKeys, coursesKeys } from '@/features/course/api/queries';
import { courseContextKeys } from '@/features/course/features/access/api/queries';

export const sessionKeys = {
  all: ['session'] as const,
};

/**
 * Checking the session is safe to repeat. One retry covers a network failure
 * or a gateway status; any other failure, and cancellation, is final.
 */
function canRetrySessionCheck(failureCount: number, error: Error) {
  if (failureCount >= 1 || !(error instanceof OperationFailure)) {
    return false;
  }

  const { reason } = error;
  return (
    reason.kind === 'network' ||
    (reason.kind === 'unexpected-http-status' &&
      [502, 503, 504].includes(reason.status))
  );
}

/**
 * Drops every family a previous session could have reached: Course context,
 * the course list and everything under the Course prefix. Removal, not
 * invalidation, so nothing of the previous User can render while refetching.
 */
function removeSessionBoundCache(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: courseContextKeys.all });
  queryClient.removeQueries({ queryKey: coursesKeys.all });
  queryClient.removeQueries({ queryKey: courseKeys.all });
}

function sessionUserId(outcome: SessionOutcome | undefined) {
  return outcome?.status === 'authorized' ? outcome.session.userId : null;
}

export const sessionOptions = queryOptions({
  queryKey: sessionKeys.all,
  queryFn: async ({ client, signal }) => {
    const outcome = await checkSession(signal);
    // A session replaced outside this tab is seen only here. Clearing before
    // the outcome reaches the cache keeps the next screen from showing data
    // the previous session loaded.
    const previous = client.getQueryData<SessionOutcome>(sessionKeys.all);
    if (previous && sessionUserId(previous) !== sessionUserId(outcome)) {
      removeSessionBoundCache(client);
    }
    return outcome;
  },
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
        removeSessionBoundCache(queryClient);
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
      removeSessionBoundCache(queryClient);
      await queryClient.invalidateQueries({
        queryKey: sessionKeys.all,
        refetchType: 'all',
      });
      await router.invalidate();
    },
  });
}
