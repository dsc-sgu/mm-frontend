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

const FoundAttemptSchema = v.object({
  status: v.literal('found'),
  attempt: v.object({
    id: AttemptIdSchema,
    studentId: UserIdSchema,
    taskId: v.pipe(v.string(), v.regex(/^[1-9]\d*$/)),
    attemptNumber: AttemptNumberSchema,
  }),
});
const MissingAttemptSchema = v.strictObject({ status: v.literal('not-found') });
const ForbiddenAttemptSchema = v.strictObject({
  status: v.literal('forbidden'),
});

export type LoadAttemptResult =
  | v.InferOutput<typeof FoundAttemptSchema>
  | v.InferOutput<typeof MissingAttemptSchema>
  | v.InferOutput<typeof ForbiddenAttemptSchema>;

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
      switch (context.response.status) {
        case 200:
          return readJson(context, FoundAttemptSchema);
        case 404:
          return readJson(context, MissingAttemptSchema);
        case 403:
          return readJson(context, ForbiddenAttemptSchema);
        default:
          throw unexpectedHttpStatus(context);
      }
    }
  );
}
