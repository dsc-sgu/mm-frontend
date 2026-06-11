import type { AttemptReviewDiffViewMode } from './attempt-review-diff-view-toggle.component';

const ATTEMPT_REVIEW_DIFF_VIEW_MODE_STORAGE_KEY =
  'attempt-review.diff-view-mode';

export function getStoredDiffViewMode(): AttemptReviewDiffViewMode {
  if (typeof window === 'undefined') {
    return 'unified';
  }

  try {
    const value = window.localStorage.getItem(
      ATTEMPT_REVIEW_DIFF_VIEW_MODE_STORAGE_KEY
    );

    return isAttemptReviewDiffViewMode(value) ? value : 'unified';
  } catch {
    return 'unified';
  }
}

export function saveDiffViewMode(value: AttemptReviewDiffViewMode) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      ATTEMPT_REVIEW_DIFF_VIEW_MODE_STORAGE_KEY,
      value
    );
  } catch {
    // localStorage can be unavailable in private mode or restricted contexts.
  }
}

function isAttemptReviewDiffViewMode(
  value: string | null
): value is AttemptReviewDiffViewMode {
  return value === 'unified' || value === 'split';
}
