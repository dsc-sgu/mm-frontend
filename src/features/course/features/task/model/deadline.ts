const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const MINUTE_MS = 60 * 1000;
const HOUR_MINUTES = 60;
const DAY_MINUTES = 24 * HOUR_MINUTES;

export type DeadlineRelation =
  | { timing: 'before'; label: string }
  | { timing: 'exact'; label: string }
  | { timing: 'after'; label: string }
  | { timing: 'unknown'; label: string };

export function formatTaskDateTime(value: string): string {
  const date = new Date(value);

  return Number.isFinite(date.getTime())
    ? DATE_TIME_FORMAT.format(date)
    : 'Дата не указана';
}

export function getDeadlineRelation({
  submittedAt,
  deadlineAt,
}: {
  submittedAt: string;
  deadlineAt: string;
}): DeadlineRelation {
  const submittedAtMs = new Date(submittedAt).getTime();
  const deadlineAtMs = new Date(deadlineAt).getTime();

  if (!Number.isFinite(submittedAtMs) || !Number.isFinite(deadlineAtMs)) {
    return { timing: 'unknown', label: 'срок не определён' };
  }

  const differenceMs = submittedAtMs - deadlineAtMs;

  if (differenceMs === 0) {
    return { timing: 'exact', label: 'в момент дедлайна' };
  }

  const duration = formatDuration(Math.abs(differenceMs));

  return differenceMs < 0
    ? { timing: 'before', label: `за ${duration} до дедлайна` }
    : { timing: 'after', label: `${duration} после дедлайна` };
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(1, Math.round(durationMs / MINUTE_MS));
  const days = Math.floor(totalMinutes / DAY_MINUTES);
  const hours = Math.floor((totalMinutes % DAY_MINUTES) / HOUR_MINUTES);
  const minutes = totalMinutes % HOUR_MINUTES;

  if (days > 0) {
    return joinDurationParts([
      formatCount(days, ['день', 'дня', 'дней']),
      hours > 0 ? formatCount(hours, ['час', 'часа', 'часов']) : null,
    ]);
  }

  if (hours > 0) {
    return joinDurationParts([
      formatCount(hours, ['час', 'часа', 'часов']),
      minutes > 0 ? formatCount(minutes, ['минуту', 'минуты', 'минут']) : null,
    ]);
  }

  return formatCount(totalMinutes, ['минуту', 'минуты', 'минут']);
}

function joinDurationParts(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join(' ');
}

function formatCount(
  value: number,
  forms: readonly [one: string, few: string, many: string]
): string {
  const modulo100 = value % 100;
  const modulo10 = value % 10;

  if (modulo100 >= 11 && modulo100 <= 14) {
    return `${value} ${forms[2]}`;
  }

  if (modulo10 === 1) {
    return `${value} ${forms[0]}`;
  }

  if (modulo10 >= 2 && modulo10 <= 4) {
    return `${value} ${forms[1]}`;
  }

  return `${value} ${forms[2]}`;
}
