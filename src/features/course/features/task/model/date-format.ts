const TASK_DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatTaskDateTime(value: string): string {
  return TASK_DATE_TIME_FORMAT.format(new Date(value));
}

export type DeadlineDelta = {
  timing: 'before' | 'exact' | 'after';
  label: string;
};

export function formatDeadlineDelta({
  submittedAt,
  deadlineAt,
}: {
  submittedAt: string;
  deadlineAt: string;
}): DeadlineDelta {
  const deltaMs =
    new Date(submittedAt).getTime() - new Date(deadlineAt).getTime();

  if (deltaMs === 0) {
    return { timing: 'exact', label: 'в момент дедлайна' };
  }

  const duration = formatDuration(Math.abs(deltaMs));

  if (deltaMs < 0) {
    return {
      timing: 'before',
      label: `за ${duration} до дедлайна`,
    };
  }

  return {
    timing: 'after',
    label: `${duration} после дедлайна`,
  };
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(1, Math.round(durationMs / (60 * 1000)));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return [
      formatCount(days, 'день', 'дня', 'дней'),
      hours > 0 ? formatCount(hours, 'час', 'часа', 'часов') : null,
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (hours > 0) {
    return [
      formatCount(hours, 'час', 'часа', 'часов'),
      minutes > 0 ? formatCount(minutes, 'минуту', 'минуты', 'минут') : null,
    ]
      .filter(Boolean)
      .join(' ');
  }

  return formatCount(totalMinutes, 'минуту', 'минуты', 'минут');
}

function formatCount(
  value: number,
  one: string,
  few: string,
  many: string
): string {
  const modulo100 = value % 100;
  const modulo10 = value % 10;
  const form =
    modulo100 >= 11 && modulo100 <= 14
      ? many
      : modulo10 === 1
        ? one
        : modulo10 >= 2 && modulo10 <= 4
          ? few
          : many;

  return `${value} ${form}`;
}
