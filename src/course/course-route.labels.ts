export function formatCommitLabel(commitId: string) {
  return commitId.length > 7 ? commitId.slice(0, 7) : commitId;
}

export function formatAttemptLabel(attemptId: string) {
  return `Попытка #${attemptId}`;
}

export function formatAttemptReviewLabel(attemptId: string) {
  return `Оценка попытки #${attemptId}`;
}

export function formatStudentFullName(student: {
  lastName: string;
  firstName: string;
  patronymic?: string | null;
}) {
  return [student.lastName, student.firstName, student.patronymic]
    .filter(Boolean)
    .join(' ');
}
