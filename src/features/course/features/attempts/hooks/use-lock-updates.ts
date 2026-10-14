import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { CourseId } from '@/features/course/model/identity';
import { createMockReviewLockUpdates } from '@/features/course/features/attempts/api/mock';
import { courseAttemptsKeys } from '@/features/course/features/attempts/api/queries';
import {
  applyReviewLockUpdatesToAttempts,
  type CourseAttemptReviewLockUpdate,
} from '@/features/course/features/attempts/model/lock-updates';
import type { CourseAttemptsListResult } from '@/features/course/features/attempts/model/types';

const MOCK_REVIEW_LOCK_UPDATE_INTERVAL = 4_500;

export function useCourseAttemptReviewLockUpdates({
  courseId,
  enabled = true,
  onUpdates,
}: {
  courseId: CourseId;
  enabled?: boolean;
  onUpdates?: (updates: CourseAttemptReviewLockUpdate[]) => void;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const updates = createMockReviewLockUpdates(courseId);

      if (updates.length === 0) {
        return;
      }

      queryClient.setQueriesData<CourseAttemptsListResult>(
        { queryKey: courseAttemptsKeys.course(courseId) },
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
  }, [courseId, enabled, onUpdates, queryClient]);
}
