import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { createMockReviewLockUpdates } from '@/course/attempts/api/mock';
import { COURSE_ATTEMPTS_QUERY_KEY } from '@/course/attempts/api/queries';
import {
  applyReviewLockUpdatesToAttempts,
  type CourseAttemptReviewLockUpdate,
} from '@/course/attempts/model/lock-updates';
import type { CourseAttemptsListResult } from '@/course/attempts/model/types';

const MOCK_REVIEW_LOCK_UPDATE_INTERVAL = 4_500;

export function useCourseAttemptReviewLockUpdates({
  courseSlug,
  enabled = true,
  onUpdates,
}: {
  courseSlug: string;
  enabled?: boolean;
  onUpdates?: (updates: CourseAttemptReviewLockUpdate[]) => void;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const updates = createMockReviewLockUpdates(courseSlug);

      if (updates.length === 0) {
        return;
      }

      queryClient.setQueriesData<CourseAttemptsListResult>(
        { queryKey: [COURSE_ATTEMPTS_QUERY_KEY, courseSlug] },
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            attempts: applyReviewLockUpdatesToAttempts(
              current.attempts,
              updates
            ),
          };
        }
      );
      onUpdates?.(updates);
    }, MOCK_REVIEW_LOCK_UPDATE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [courseSlug, enabled, onUpdates, queryClient]);
}
