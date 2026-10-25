import { apiPath } from '@/app/remote-data/api-path';
import { runHttpOperation, unexpectedHttpStatus } from '@/app/remote-data/http';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';

export type MarkAttemptUpdatesSeenResult = { status: 'seen' } | ResourceDenial;

// Working wire contract pending backend confirmation #113. Temporary: REV8
// replaces it with marking the Review seen.
/** Records that the Student has looked at the Attempt's latest Review. */
export function markAttemptUpdatesSeen(
  courseId: CourseId,
  attemptId: AttemptId,
  signal?: AbortSignal
): Promise<MarkAttemptUpdatesSeenResult> {
  return runHttpOperation<MarkAttemptUpdatesSeenResult>(
    {
      name: 'mark-attempt-updates-seen',
      url: apiPath('courses', courseId, 'attempts', attemptId, 'updates-seen'),
      method: 'POST',
      credentials: 'include',
      signal,
    },
    async (context) => {
      const denial = readResourceDenial(context);
      if (denial) {
        return denial;
      }
      if (context.response.status !== 204) {
        throw unexpectedHttpStatus(context);
      }
      return { status: 'seen' };
    }
  );
}
