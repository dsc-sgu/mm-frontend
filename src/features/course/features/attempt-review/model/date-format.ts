const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatAttemptReviewDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}

const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat('ru-RU', {
  numeric: 'auto',
});

export function formatAttemptReviewRelativeDateTime(value: string): {
  label: string;
  title: string;
} {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);
  const title = formatAttemptReviewDateTime(value);

  if (!Number.isFinite(date.getTime())) {
    return { label: title, title };
  }

  if (absDiffMs < 60 * 1000) {
    return { label: 'только что', title };
  }

  if (absDiffMs < 60 * 60 * 1000) {
    return {
      label: RELATIVE_TIME_FORMAT.format(
        Math.round(diffMs / (60 * 1000)),
        'minute'
      ),
      title,
    };
  }

  if (absDiffMs < 24 * 60 * 60 * 1000) {
    return {
      label: RELATIVE_TIME_FORMAT.format(
        Math.round(diffMs / (60 * 60 * 1000)),
        'hour'
      ),
      title,
    };
  }

  if (absDiffMs < 7 * 24 * 60 * 60 * 1000) {
    return {
      label: RELATIVE_TIME_FORMAT.format(
        Math.round(diffMs / (24 * 60 * 60 * 1000)),
        'day'
      ),
      title,
    };
  }

  return { label: title, title };
}
