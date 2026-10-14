import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserIdSchema, type Username } from '@/features/auth/model/identity';
import type { CourseId } from '@/features/course/model/identity';

const FoundRepositorySchema = v.object({
  status: v.literal('found'),
  repository: v.object({ studentId: UserIdSchema }),
});
const MissingRepositorySchema = v.strictObject({
  status: v.literal('not-found'),
});
const ForbiddenRepositorySchema = v.strictObject({
  status: v.literal('forbidden'),
});

export type LoadRepositoryResult =
  | v.InferOutput<typeof FoundRepositorySchema>
  | v.InferOutput<typeof MissingRepositorySchema>
  | v.InferOutput<typeof ForbiddenRepositorySchema>;

export function loadRepository(
  courseId: CourseId,
  studentUsername: Username,
  signal?: AbortSignal
): Promise<LoadRepositoryResult> {
  return runHttpOperation<LoadRepositoryResult>(
    {
      name: 'load-repository',
      url: apiPath('courses', courseId, 'repositories', studentUsername),
      credentials: 'include',
      signal,
    },
    async (context) => {
      switch (context.response.status) {
        case 200:
          return readJson(context, FoundRepositorySchema);
        case 404:
          return readJson(context, MissingRepositorySchema);
        case 403:
          return readJson(context, ForbiddenRepositorySchema);
        default:
          throw unexpectedHttpStatus(context);
      }
    }
  );
}
