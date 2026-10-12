import type {
  AttemptReviewChangedFile,
  AttemptReviewLineComment,
} from './types';

export type AttemptReviewCodeViewAnnotation =
  | { type: 'line-comment'; comment: AttemptReviewLineComment }
  // The rendered view of a Markdown file is mounted as an annotation, because
  // CodeView measures annotation content and lays out the files around it.
  | { type: 'rendered-markdown'; file: AttemptReviewChangedFile };
