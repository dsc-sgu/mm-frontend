const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatAttemptReviewDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}
