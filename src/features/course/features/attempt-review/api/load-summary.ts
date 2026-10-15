import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserIdSchema } from '@/features/auth/model/identity';
import { GradeSchema } from '@/features/course/model/grade';
import {
  AttemptIdSchema,
  AttemptNumberSchema,
  type AttemptId,
  type CourseId,
} from '@/features/course/model/identity';
import type { AttemptSummary } from '@/features/course/features/attempt-review/model/types';

// Working wire contract pending backend confirmation #113.
const AttemptSummarySchema = v.object({
  id: AttemptIdSchema,
  attemptNumber: AttemptNumberSchema,
  submittedAt: v.pipe(v.string(), v.isoTimestamp()),
  deadlineAt: v.pipe(v.string(), v.isoTimestamp()),
  task: v.object({ title: v.string(), maxGrade: GradeSchema }),
  student: v.object({ id: UserIdSchema, name: v.string() }),
});

/** What the Attempt page header shows: Task, Student, number and times. */
export function loadAttemptSummary(
  courseId: CourseId,
  attemptId: AttemptId,
  signal?: AbortSignal
): Promise<AttemptSummary> {
  return runHttpOperation(
    {
      name: 'load-attempt-summary',
      url: apiPath('courses', courseId, 'attempts', attemptId),
      credentials: 'include',
      signal,
    },
    async (context) => {
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      return readJson(context, AttemptSummarySchema);
    }
  );
}
