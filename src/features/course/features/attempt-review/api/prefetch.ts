import type { QueryClient } from '@tanstack/react-query';
import { attemptPageQueries, type AttemptPageInput } from './queries';

/**
 * Starts every read of the Attempt page from the route loader, so the reads
 * load alongside the page's lazy chunk instead of after it mounts. Not awaited
 * by the loader: the page shows its own loading state, and the router never
 * keeps the previous Attempt on screen while the next one loads.
 */
export function prefetchAttemptPage(
  queryClient: QueryClient,
  input: AttemptPageInput
) {
  const queries = attemptPageQueries(input);
  // A failure stays in the query's state, where the page renders it.
  const ignore = () => undefined;
  queryClient.query(queries.summary).catch(ignore);
  queryClient.query(queries.review).catch(ignore);
  queryClient.query(queries.material).catch(ignore);
  queryClient.query(queries.attempts).catch(ignore);
}
