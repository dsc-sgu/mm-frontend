import type { FullName } from '@/features/auth/model/full-name';
import type { UserId } from '@/features/auth/model/identity';
import type { Grade } from '@/features/course/model/grade';
import type { ReviewRevision } from './revision';

export type ReviewCommentSide = 'deletions' | 'additions';

export type ReviewAuthor = { id: UserId } & FullName;

export type ReviewReply = {
  id: string;
  author: ReviewAuthor;
  html: string;
  createdAt: string;
  updatedAt: string;
};

/** A root comment of a Review Revision with the replies posted to it. */
export type ReviewComment = {
  id: string;
  author: ReviewAuthor;
  filePath: string;
  side: ReviewCommentSide;
  lineNumber: number;
  endSide?: ReviewCommentSide;
  endLineNumber?: number;
  html: string;
  createdAt: string;
  updatedAt: string;
  replies: ReviewReply[];
};

/** The latest published Review Revision of an Attempt. */
export type Review = {
  revision: ReviewRevision;
  grade: Grade;
  overallFeedbackHtml: string;
  publishedAt: string;
  publishedBy: ReviewAuthor;
  comments: ReviewComment[];
};

/** An Attempt without a published Review is a declared outcome. */
export type ReviewResult =
  | { status: 'published'; review: Review }
  | { status: 'none' };

export function unwrapPublishedReview(result: ReviewResult): Review | null {
  return result.status === 'published' ? result.review : null;
}

/** A root comment as the Review editor sends it; the backend keeps authors. */
export type ReviewCommentInput = Pick<
  ReviewComment,
  | 'id'
  | 'filePath'
  | 'side'
  | 'lineNumber'
  | 'endSide'
  | 'endLineNumber'
  | 'html'
>;
