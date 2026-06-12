import type { AttemptReviewLineComment } from '@/features/course/features/attempt-review/model/types';
import { cn } from '@/shadcn/lib/utils';

type AttemptReviewCommentPendingNoticeProps = {
  status: AttemptReviewLineComment['status'];
};

export function AttemptReviewCommentPendingNotice({
  status,
}: AttemptReviewCommentPendingNoticeProps) {
  const label =
    status === 'pending-delete'
      ? 'Будет удалён после сохранения отзыва'
      : status === 'pending-update'
        ? 'Сохраните отзыв, чтобы применить изменения'
        : 'Сохраните отзыв, чтобы комментарий стал виден';

  return (
    <span
      className={cn(
        'rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900',
        'dark:bg-amber-950/50 dark:text-amber-200'
      )}
    >
      {label}
    </span>
  );
}
