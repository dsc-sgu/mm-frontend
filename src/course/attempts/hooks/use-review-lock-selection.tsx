import { useCallback, useEffect, useRef } from 'react';
import type { Set as ImmutableSetType } from 'immutable';
import { toast } from 'sonner';

import { useCourseAttemptReviewLockUpdates } from './use-lock-updates';
import type { CourseAttemptReviewLockUpdate } from '../model/lock-updates';
import type { CourseAttempt } from '../model/types';

export function useCourseAttemptsReviewLockSelectionSync({
  courseSlug,
  enabled,
  selectedAttemptIds,
  attemptById,
  removeAttemptIds,
}: {
  courseSlug: string;
  enabled: boolean;
  selectedAttemptIds: ImmutableSetType<string>;
  attemptById: Map<string, CourseAttempt>;
  removeAttemptIds: (attemptIds: Iterable<string>) => void;
}) {
  const selectedAttemptIdsRef = useRef(selectedAttemptIds);
  const attemptByIdRef = useRef(attemptById);

  useEffect(() => {
    selectedAttemptIdsRef.current = selectedAttemptIds;
    attemptByIdRef.current = attemptById;
  }, [attemptById, selectedAttemptIds]);

  const handleReviewLockUpdates = useCallback(
    (updates: CourseAttemptReviewLockUpdate[]) => {
      const lockedAttemptIds = new Set(
        updates
          .filter((update) => update.reviewLock)
          .map((update) => update.attemptId)
      );

      if (lockedAttemptIds.size === 0) {
        return;
      }

      const lockedSelectedAttempts = selectedAttemptIdsRef.current
        .filter((attemptId) => lockedAttemptIds.has(attemptId))
        .map((attemptId) => attemptByIdRef.current.get(attemptId))
        .filter((attempt): attempt is CourseAttempt => Boolean(attempt))
        .toArray();

      if (lockedSelectedAttempts.length === 0) {
        return;
      }

      removeAttemptIds(lockedAttemptIds);
      toast.warning('Выбор обновлён', {
        description: renderLockedSelectionToastDescription(
          lockedSelectedAttempts
        ),
      });
    },
    [removeAttemptIds]
  );

  useCourseAttemptReviewLockUpdates({
    courseSlug,
    enabled,
    onUpdates: handleReviewLockUpdates,
  });
}

function renderLockedSelectionToastDescription(attempts: CourseAttempt[]) {
  const visibleAttempts = attempts.slice(0, 3);
  const hiddenAttemptsCount = attempts.length - visibleAttempts.length;

  return (
    <div className="max-w-full space-y-2 overflow-hidden">
      <p>
        {attempts.length === 1
          ? 'Попытка снята с выбора, потому что её взяли на проверку.'
          : `С выбора снято попыток: ${attempts.length}. Их взяли на проверку.`}
      </p>
      <ul className="max-w-full space-y-1 overflow-hidden">
        {visibleAttempts.map((attempt) => (
          <li key={attempt.id} className="max-w-full break-words">
            {attempt.task.title} — {attempt.student.fullName}
          </li>
        ))}
        {hiddenAttemptsCount > 0 ? <li>И ещё: {hiddenAttemptsCount}</li> : null}
      </ul>
    </div>
  );
}
