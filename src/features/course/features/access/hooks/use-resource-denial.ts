import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import type { UserId } from '@/features/auth/model/identity';
import type { CourseId, CourseSlug } from '@/features/course/model/identity';
import { recheckCourseContextAfterAccessDenial } from '@/features/course/features/access/api/queries';
import {
  hasObservedResourceDenial,
  removeUnobservedResourceDenials,
} from '@/features/course/features/access/api/resource-denial';
import { nextDeniedLocation } from '@/features/course/features/access/model/resource-denial';

type CourseResource = {
  userId: UserId;
  courseId: CourseId;
  courseSlug: CourseSlug;
};

/**
 * Whether a read of the page at the current location was denied. Any read
 * under the Course prefix counts, a background refetch included, so a page
 * gets this reaction without wiring it. An adapter to the QueryCache: no
 * TanStack hook selects over the data of many queries.
 */
export function useResourceDenial({
  userId,
  courseId,
  courseSlug,
}: CourseResource): boolean {
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();
  const href = useRouterState({ select: (state) => state.location.href });
  const observedDenial = useSyncExternalStore(queryCache.subscribe, () =>
    hasObservedResourceDenial(queryCache, courseId)
  );
  const [deniedLocation, setDeniedLocation] = useState<string | null>(null);
  const next = nextDeniedLocation(deniedLocation, { href, observedDenial });
  if (next !== deniedLocation) {
    setDeniedLocation(next);
  }

  useEffect(() => {
    // Once the page has unmounted, or its location was left, nobody shows
    // these denials any more: the next visit reads the page again.
    removeUnobservedResourceDenials(queryClient, courseId);
  }, [deniedLocation, queryClient, courseId]);

  useEffect(() => {
    if (deniedLocation === null) {
      return;
    }
    // Any denial may be a lost Membership (ADR 0006); the Course route closes
    // itself on it and renders the recheck's own failure from its query.
    recheckCourseContextAfterAccessDenial(
      queryClient,
      userId,
      courseSlug
    ).catch(() => undefined);
  }, [deniedLocation, queryClient, userId, courseSlug]);

  return next !== null;
}
