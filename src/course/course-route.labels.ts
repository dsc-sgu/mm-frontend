export function formatCommitLabel(commitId: string) {
  return commitId.length > 7 ? commitId.slice(0, 7) : commitId;
}

export function formatAttemptLabel(attemptId: string) {
  return `Попытка #${attemptId}`;
}

export function formatAttemptReviewLabel(attemptId: string) {
  return `Оценка попытки #${attemptId}`;
}
