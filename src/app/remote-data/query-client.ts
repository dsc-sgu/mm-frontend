import { QueryClient } from '@tanstack/react-query';

/**
 * Automatic retries are off for queries and mutations. A query that is safe to
 * repeat declares its own retry limit and delay next to its operation.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}
