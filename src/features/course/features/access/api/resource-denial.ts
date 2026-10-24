import type { QueryCache, QueryClient } from '@tanstack/react-query';
import type { HttpResponseContext } from '@/app/remote-data/http';
import { courseKeys } from '@/features/course/api/queries';
import type { CourseId } from '@/features/course/model/identity';

/**
 * A read of a participant-bound resource can be denied at any moment, its
 * locator included: access is rechecked on every request, so the denial is a
 * declared outcome, not a failure. A missing and a foreign resource are one
 * outcome (ADR 0006).
 */
export type ResourceDenial = { status: 'not-found' };

// Working contract pending backend confirmation #113: denials carry no body.
export function readResourceDenial(
  context: HttpResponseContext
): ResourceDenial | null {
  return context.response.status === 404 ? { status: 'not-found' } : null;
}

export function isResourceDenial(data: unknown): data is ResourceDenial {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    data.status === 'not-found'
  );
}

/**
 * Whether a mounted page shows a course-scoped read that was denied. Only
 * observed queries count: a locator resolved in `beforeLoad` keeps its denial
 * in the cache without closing the next page. Under the Course prefix
 * `not-found` is reserved for a `ResourceDenial`.
 */
export function hasObservedResourceDenial(
  queryCache: QueryCache,
  courseId: CourseId
): boolean {
  return queryCache
    .findAll({ queryKey: courseKeys.byId(courseId) })
    .some(
      (query) =>
        query.getObserversCount() > 0 && isResourceDenial(query.state.data)
    );
}

/** Drops the denials no page shows, so the next visit reads them again. */
export function removeUnobservedResourceDenials(
  queryClient: QueryClient,
  courseId: CourseId
) {
  queryClient.removeQueries({
    queryKey: courseKeys.byId(courseId),
    predicate: (query) =>
      query.getObserversCount() === 0 && isResourceDenial(query.state.data),
  });
}
