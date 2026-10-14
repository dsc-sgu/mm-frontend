import { parseDiffFromFile, type FileDiffMetadata } from '@pierre/diffs';
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

export function loadAttemptMaterial(
  courseId: CourseId,
  attemptId: AttemptId,
  signal?: AbortSignal
): Promise<AttemptMaterial> {
  return runHttpOperation(
    {
      name: 'load-attempt-material',
      url: apiPath('courses', courseId, 'attempts', attemptId, 'material'),
      credentials: 'include',
      signal,
    },
    async (context) => {
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      const material = await readJson(context, AttemptMaterialSchema);
      return {
        baselineAttemptNumber: material.baselineAttemptNumber,
        changedFiles: material.files.map(toChangedFile),
      };
    }
  );
}

const DIFF_TYPES: Record<AttemptReviewFileStatus, FileDiffMetadata['type']> = {
  added: 'new',
  deleted: 'deleted',
  changed: 'change',
};

function toChangedFile({
  path,
  status,
  oldText,
  newText,
}: ChangedFileDto): AttemptReviewChangedFile {
  const diff: FileDiffMetadata = {
    ...parseDiffFromFile(
      {
        name: path,
        contents: oldText,
        cacheKey: `${path}:old:${hash(oldText)}`,
      },
      {
        name: path,
        contents: newText,
        cacheKey: `${path}:new:${hash(newText)}`,
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

function hash(value: string): string {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return String(result);
}
