import type { CourseAttempt } from './course-attempts.types';

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}

export function getTimingLabel(attempt: CourseAttempt): {
  label: string;
  className: string;
} {
  const late = new Date(attempt.submittedAt) > new Date(attempt.deadlineAt);

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
