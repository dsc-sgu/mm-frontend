import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserIdSchema, type Username } from '@/features/auth/model/identity';
import {
  AttemptIdSchema,
  AttemptNumberSchema,
  type CourseId,
  type AttemptNumber,
} from '@/features/course/model/identity';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';

const FoundAttemptSchema = v.object({
  status: v.literal('found'),
  attempt: v.object({
    id: AttemptIdSchema,
    studentId: UserIdSchema,
    taskId: v.pipe(v.string(), v.regex(/^[1-9]\d*$/)),
    attemptNumber: AttemptNumberSchema,
  }),
});

export type LoadAttemptResult =
  | v.InferOutput<typeof FoundAttemptSchema>
  | ResourceDenial;

export function loadAttempt(
  courseId: CourseId,
  taskId: string,
  studentUsername: Username,
  attemptNumber: AttemptNumber,
  signal?: AbortSignal
): Promise<LoadAttemptResult> {
  return runHttpOperation<LoadAttemptResult>(
    {
      name: 'load-attempt',
      url: apiPath(
        'courses',
        courseId,
        'tasks',
        taskId,
        'attempts',
        studentUsername,
        attemptNumber
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
      return readJson(context, FoundAttemptSchema);
    }
  );
}
