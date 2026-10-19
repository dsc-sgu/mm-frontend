import type { FileDiffMetadata } from '@pierre/diffs';
import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import {
  AttemptNumberSchema,
  type AttemptId,
  type CourseId,
} from '@/features/course/model/identity';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';
import type {
  AttemptMaterial,
  AttemptReviewChangedFile,
  AttemptReviewFileStatus,
} from '@/features/course/features/attempt-review/model/types';

// Temporary material until the changed-files manifest of REV3.2: the backend
// lists every changed file with both texts against the baseline Attempt.
const AttemptMaterialSchema = v.object({
  baselineAttemptNumber: v.nullable(AttemptNumberSchema),
  files: v.array(
    v.object({
      path: v.pipe(v.string(), v.nonEmpty()),
      status: v.picklist(['added', 'deleted', 'changed']),
      oldText: v.string(),
      newText: v.string(),
    })
  ),
});

type ChangedFileDto = v.InferOutput<
  typeof AttemptMaterialSchema
>['files'][number];

export type LoadAttemptMaterialResult =
  | { status: 'found'; material: AttemptMaterial }
  | ResourceDenial;

export function loadAttemptMaterial(
  courseId: CourseId,
  attemptId: AttemptId,
  signal?: AbortSignal
): Promise<LoadAttemptMaterialResult> {
  return runHttpOperation<LoadAttemptMaterialResult>(
    {
      name: 'load-attempt-material',
      url: apiPath('courses', courseId, 'attempts', attemptId, 'material'),
      credentials: 'include',
      signal,
    },
    async (context) => {
      const denial = readResourceDenial(context);
      if (denial) return denial;
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      const material = await readJson(context, AttemptMaterialSchema);
      // Loaded lazily: the route loader starts this read from the main bundle.
      const { parseDiffFromFile } = await import('@pierre/diffs');
      return {
        status: 'found',
        material: {
          baselineAttemptNumber: material.baselineAttemptNumber,
          changedFiles: material.files.map((file) =>
            toChangedFile(attemptId, file, parseDiffFromFile)
          ),
        },
      };
    }
  );
}

const DIFF_TYPES: Record<AttemptReviewFileStatus, FileDiffMetadata['type']> = {
  added: 'new',
  deleted: 'deleted',
  changed: 'change',
};

type ParseDiffFromFile = typeof import('@pierre/diffs').parseDiffFromFile;

function toChangedFile(
  attemptId: AttemptId,
  { path, status, oldText, newText }: ChangedFileDto,
  parseDiffFromFile: ParseDiffFromFile
): AttemptReviewChangedFile {
  const diff: FileDiffMetadata = {
    ...parseDiffFromFile(
      {
        name: path,
        contents: oldText,
        cacheKey: `${attemptId}:${path}:old`,
      },
      {
        name: path,
        contents: newText,
        cacheKey: `${attemptId}:${path}:new`,
      },
      { context: 4 }
    ),
    type: DIFF_TYPES[status],
  };

  return {
    path,
    status,
    contents: { oldText, newText },
    addedLines: diff.hunks.reduce((sum, hunk) => sum + hunk.additionLines, 0),
    deletedLines: diff.hunks.reduce((sum, hunk) => sum + hunk.deletionLines, 0),
    diff,
  };
}
