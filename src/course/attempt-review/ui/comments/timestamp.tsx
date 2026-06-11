import { formatAttemptReviewRelativeDateTime } from '@/course/attempt-review/model/date-format';

type AttemptReviewCommentTimestampProps = {
  createdAt: string;
  updatedAt: string;
};

export function AttemptReviewCommentTimestamp({
  createdAt,
  updatedAt,
}: AttemptReviewCommentTimestampProps) {
  const edited = createdAt !== updatedAt;
  const date = formatAttemptReviewRelativeDateTime(
    edited ? updatedAt : createdAt
  );

  return (
    <span title={date.title}>
      {date.label}
      {edited ? ' · изменено' : ''}
    </span>
  );
}
