import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserRefSchema } from '@/features/auth/model/user-ref';
import { GradeSchema } from '@/features/course/model/grade';
import {
  AttemptIdSchema,
  AttemptNumberSchema,
  type AttemptId,
  type CourseId,
} from '@/features/course/model/identity';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';
import type { AttemptSummary } from '@/features/course/features/attempt-review/model/types';

// Working wire contract pending backend confirmation #113.
const AttemptSummarySchema = v.object({
  id: AttemptIdSchema,
  attemptNumber: AttemptNumberSchema,
  submittedAt: v.pipe(v.string(), v.isoTimestamp()),
  deadlineAt: v.pipe(v.string(), v.isoTimestamp()),
  task: v.object({ title: v.string(), maxGrade: GradeSchema }),
  student: UserRefSchema,
});

export type LoadAttemptSummaryResult =
  | { status: 'found'; summary: AttemptSummary }
  | ResourceDenial;

/** What the Attempt page header shows: Task, Student, number and times. */
export function loadAttemptSummary(
  courseId: CourseId,
  attemptId: AttemptId,
  signal?: AbortSignal
): Promise<LoadAttemptSummaryResult> {
  return runHttpOperation<LoadAttemptSummaryResult>(
    {
      name: 'load-attempt-summary',
      url: apiPath('courses', courseId, 'attempts', attemptId),
      credentials: 'include',
      signal,
    },
    async (context) => {
      const denial = readResourceDenial(context);
      if (denial) return denial;
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      const summary = await readJson(context, AttemptSummarySchema);
      return { status: 'found', summary };
    }
  );
}
