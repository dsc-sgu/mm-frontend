import type { ReactNode } from 'react';

// jsdom cannot run the review's Web Workers. Without a pool the Attempt page
// does not wait for one, so component contracts render it; browser contracts
// use the real pool.
export function AttemptReviewWorkerPool({ children }: { children: ReactNode }) {
  return children;
}
