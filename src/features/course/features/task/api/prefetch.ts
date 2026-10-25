import type { QueryClient } from '@tanstack/react-query';
import { taskPageQueries, type TaskPageInput } from './queries';

/**
 * Starts every read of the Task page from the route loader, so the reads load
 * alongside the page's lazy chunk instead of after it mounts. Not awaited by
 * the loader: the page shows its own loading state.
 */
export function prefetchTaskPage(
  queryClient: QueryClient,
  input: TaskPageInput
) {
  const queries = taskPageQueries(input);
  // A failure stays in the query's state, where the page renders it.
  const ignore = () => undefined;
  queryClient.query(queries.task).catch(ignore);
  if (queries.attemptHistory) {
    queryClient.query(queries.attemptHistory).catch(ignore);
  }
}
