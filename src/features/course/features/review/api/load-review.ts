import * as v from 'valibot';
import { apiPath } from '@/app/remote-data/api-path';
import {
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';
import { FullNameSchema } from '@/features/auth/model/full-name';
import { UserIdSchema } from '@/features/auth/model/identity';
import { GradeSchema } from '@/features/course/model/grade';
import type { AttemptId, CourseId } from '@/features/course/model/identity';
import { ReviewRevisionSchema } from '@/features/course/features/review/model/revision';
import {
  readResourceDenial,
  type ResourceDenial,
} from '@/features/course/features/access/api/resource-denial';
import type { ReviewResult } from '@/features/course/features/review/model/types';

// Working Review wire contract pending backend confirmation #113: the latest
// revision carries its number, and replies come inside their root comment.
const AuthorSchema = v.object({
  id: UserIdSchema,
  ...FullNameSchema.entries,
});
const SideSchema = v.picklist(['deletions', 'additions']);
const LineSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

const ReviewResultSchema = v.variant('status', [
  v.object({
    status: v.literal('published'),
    review: v.object({
      revision: ReviewRevisionSchema,
      grade: GradeSchema,
      overallFeedbackHtml: v.string(),
      publishedAt: v.pipe(v.string(), v.isoTimestamp()),
      publishedBy: AuthorSchema,
      comments: v.array(
        v.object({
          id: v.string(),
          author: AuthorSchema,
          filePath: v.string(),
          side: SideSchema,
          lineNumber: LineSchema,
          endSide: v.optional(SideSchema),
          endLineNumber: v.optional(LineSchema),
          html: v.string(),
          createdAt: v.pipe(v.string(), v.isoTimestamp()),
          updatedAt: v.pipe(v.string(), v.isoTimestamp()),
          replies: v.array(
            v.object({
              id: v.string(),
              author: AuthorSchema,
              html: v.string(),
              createdAt: v.pipe(v.string(), v.isoTimestamp()),
              updatedAt: v.pipe(v.string(), v.isoTimestamp()),
            })
          ),
        })
      ),
    }),
  }),
  v.object({ status: v.literal('none') }),
]);

export type LoadReviewResult = ReviewResult | ResourceDenial;

/** The published Review of an Attempt, or the declared absence of one. */
export function loadReview(
  courseId: CourseId,
  attemptId: AttemptId,
  signal?: AbortSignal
): Promise<LoadReviewResult> {
  return runHttpOperation<LoadReviewResult>(
    {
      name: 'load-review',
      url: apiPath('courses', courseId, 'attempts', attemptId, 'review'),
      credentials: 'include',
      signal,
    },
    async (context) => {
      const denial = readResourceDenial(context);
      if (denial) return denial;
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      return readJson(context, ReviewResultSchema);
    }
  );
}
