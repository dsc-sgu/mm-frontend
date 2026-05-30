import type { CourseAttempt } from './course-attempts.types';

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const dateTimeFormatCache = new Map<string, string>();

export function formatDateTime(value: string): string {
  const cached = dateTimeFormatCache.get(value);

  if (cached) {
    return cached;
  }

  const formatted = DATE_TIME_FORMAT.format(new Date(value));
  dateTimeFormatCache.set(value, formatted);
  return formatted;
}

function formatDuration(value: number): string {
  const totalMinutes = Math.max(1, Math.ceil(Math.abs(value) / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return [`${days} д`, hours > 0 ? `${hours} ч` : '']
      .filter(Boolean)
      .join(' ');
  }

  return [hours > 0 ? `${hours} ч` : '', minutes > 0 ? `${minutes} мин` : '']
    .filter(Boolean)
    .join(' ');
}

export function getTimingLabel(attempt: CourseAttempt): {
  label: string;
  className: string;
} {
  const submittedAt = Date.parse(attempt.submittedAt);
  const deadlineAt = Date.parse(attempt.deadlineAt);
  const deadlineOffset = submittedAt - deadlineAt;

  if (deadlineOffset > 0) {
    return {
      label: `через ${formatDuration(deadlineOffset)} после дедлайна`,
      className: 'text-amber-700 dark:text-amber-300',
    };
  }

  if (deadlineOffset < 0) {
    return {
      label: `за ${formatDuration(deadlineOffset)} до дедлайна`,
      className: 'text-emerald-700 dark:text-emerald-300',
    };
  }

  return {
    label: 'сдано в дедлайн',
    className: 'text-emerald-700 dark:text-emerald-300',
  };
}

export function getGroupLabel(attempt: CourseAttempt): string {
  return [
    attempt.student.group,
    attempt.student.subgroup ? `${attempt.student.subgroup} подгр.` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
