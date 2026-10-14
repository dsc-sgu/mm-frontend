import type { CodeViewOptions } from '@pierre/diffs';
import type { CodeViewHandle } from '@pierre/diffs/react';
import type {
  AttemptReviewChangedFile,
  AttemptReviewLineComment,
} from './types';

export type AttemptReviewCodeViewAnnotation =
  | { type: 'line-comment'; comment: AttemptReviewLineComment }
  // The rendered view of a Markdown file is mounted as an annotation, because
  // CodeView measures annotation content and lays out the files around it.
  | { type: 'rendered-markdown'; file: AttemptReviewChangedFile };

// The review CodeView carries no caret metadata.
export type AttemptReviewCodeViewHandle = CodeViewHandle<
  AttemptReviewCodeViewAnnotation,
  undefined
>;

export type AttemptReviewCodeViewOptions = CodeViewOptions<
  AttemptReviewCodeViewAnnotation,
  undefined
>;
