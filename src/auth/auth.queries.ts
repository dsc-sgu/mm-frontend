import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { fetchSession, login, logout, register } from './auth.api';
import { useRouter } from '@tanstack/react-router';

export const SESSION_QUERY_KEY = 'session';
export const SESSION_OPTIONS = queryOptions({
  queryKey: [SESSION_QUERY_KEY],
  queryFn: fetchSession,
  staleTime: 5 * 60 * 1000,
});

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] });
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
      await queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] });
      await router.invalidate();
    },
  });
}
