import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { FullNameSchema } from '@/features/auth/model/full-name';
import { UserIdSchema, type UserId } from '@/features/auth/model/identity';
import { GradeSchema } from '@/features/course/model/grade';
import {
  AttemptIdSchema,
  AttemptNumberSchema,
  type CourseId,
} from '@/features/course/model/identity';
import { ReviewRevisionSchema } from '@/features/course/features/review/model/revision';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';
import type { TaskAttempt } from '@/features/course/features/task/model/types';

// Working wire contract pending backend confirmation #113: a Grade travels
// with the number of the Review Revision that published it.
const AttemptHistorySchema = v.object({
  attempts: v.array(
    v.object({
      id: AttemptIdSchema,
      attemptNumber: AttemptNumberSchema,
      submittedAt: v.pipe(v.string(), v.isoTimestamp()),
      review: v.nullable(
        v.object({
          revision: ReviewRevisionSchema,
          grade: GradeSchema,
          publishedAt: v.pipe(v.string(), v.isoTimestamp()),
          publishedBy: v.object({
            id: UserIdSchema,
            ...FullNameSchema.entries,
          }),
        })
      ),
      updates: v.picklist(['seen', 'unseen']),
    })
  ),
});

export type LoadAttemptHistoryResult =
  | { status: 'found'; attempts: TaskAttempt[] }
  | ResourceDenial;

/** The Student's Attempts at the Task with their Grades, newest first. */
export function loadAttemptHistory(
  courseId: CourseId,
  taskId: string,
  studentId: UserId,
  signal?: AbortSignal
): Promise<LoadAttemptHistoryResult> {
  return runHttpOperation<LoadAttemptHistoryResult>(
    {
      name: 'load-attempt-history',
      url: apiPath(
        'courses',
        courseId,
        'tasks',
        taskId,
        'students',
        studentId,
        'attempt-history'
      ),
      credentials: 'include',
      signal,
    },
    async (context) => {
      const denial = readResourceDenial(context);
      if (denial) {
        return denial;
      }
      if (context.response.status !== 200) {
        throw unexpectedHttpStatus(context);
      }
      const { attempts } = await readJson(context, AttemptHistorySchema);
      return { status: 'found', attempts };
    }
  );
}
