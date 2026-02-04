import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { fetchSession, login, register } from './auth.api';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] });
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: register,
  });
}
