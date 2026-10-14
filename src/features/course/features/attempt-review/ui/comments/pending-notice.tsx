import type { AttemptReviewLineComment } from '@/features/course/features/attempt-review/model/types';
import { cn } from '@/shadcn/lib/utils';

type AttemptReviewCommentPendingNoticeProps = {
  status: AttemptReviewLineComment['status'];
};

function pendingLabel(status: AttemptReviewLineComment['status']) {
  switch (status) {
    case 'pending-delete':
      return 'Будет удалён после сохранения отзыва';
    case 'pending-update':
      return 'Сохраните отзыв, чтобы применить изменения';
    default:
      return 'Сохраните отзыв, чтобы комментарий стал виден';
  }
}

export function AttemptReviewCommentPendingNotice({
  status,
}: AttemptReviewCommentPendingNoticeProps) {
  const label = pendingLabel(status);

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
