import type { ReactNode } from 'react';

// Course route contracts render the real app tree, but never render a review.
// jsdom cannot run the review's Web Workers; browser contracts use the real pool.
export function AttemptReviewWorkerPool({ children }: { children: ReactNode }) {
  return children;
}
