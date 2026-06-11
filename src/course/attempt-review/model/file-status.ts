import type { AttemptReviewFileStatus } from './types';

export function getAttemptReviewFileStatusIconClassName(
  status: AttemptReviewFileStatus
): string {
  if (status === 'added') {
    return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500';
  }

  if (status === 'deleted') {
    return 'border-rose-500/50 bg-rose-500/10 text-rose-500';
  }

  return 'border-blue-500/50 bg-blue-500/10 text-blue-500';
}

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
