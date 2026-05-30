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

export function getTimingLabel(attempt: CourseAttempt): {
  label: string;
  className: string;
} {
  const late = Date.parse(attempt.submittedAt) > Date.parse(attempt.deadlineAt);

  return late
    ? {
        label: `после дедлайна ${formatDateTime(attempt.deadlineAt)}`,
        className: 'text-amber-700 dark:text-amber-300',
      }
    : {
        label: `до дедлайна ${formatDateTime(attempt.deadlineAt)}`,
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
