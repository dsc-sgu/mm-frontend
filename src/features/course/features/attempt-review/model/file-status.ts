import type { AttemptReviewFileStatus } from './types';

export function getAttemptReviewFileStatusGlyph(
  status: AttemptReviewFileStatus
): string {
  if (status === 'added') {
    return '+';
  }

  if (status === 'deleted') {
    return '−';
  }

  return '•';
}

export function getAttemptReviewFileStatusShortGlyph(
  status: AttemptReviewFileStatus
): string {
  if (status === 'added') {
    return 'A';
  }

  if (status === 'deleted') {
    return 'D';
  }

  return 'M';
}

export function getAttemptReviewFileStatusLabel(
  status: AttemptReviewFileStatus
): string {
  if (status === 'added') {
    return 'Добавлен';
  }

  if (status === 'deleted') {
    return 'Удалён';
  }

  return 'Изменён';
}
