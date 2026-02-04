import { useQuery } from '@tanstack/react-query';
import { fetchSession } from './auth.api';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => fetchSession(),
  });
}
