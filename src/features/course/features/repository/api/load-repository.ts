import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { UserIdSchema, type Username } from '@/features/auth/model/identity';
import type { CourseId } from '@/features/course/model/identity';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';

const FoundRepositorySchema = v.object({
  status: v.literal('found'),
  repository: v.object({ studentId: UserIdSchema }),
});

export type LoadRepositoryResult =
  | v.InferOutput<typeof FoundRepositorySchema>
  | ResourceDenial;

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
      const denial = readResourceDenial(context);
      if (denial) {
        return denial;
      }
      if (context.response.status !== 200) {
        throw unexpectedHttpStatus(context);
      }
      return readJson(context, FoundRepositorySchema);
    }
  );
}
