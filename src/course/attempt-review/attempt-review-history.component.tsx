import { MessageSquare } from 'lucide-react';
import { cn } from '@/shadcn/lib/utils';
import type {
  AttemptReviewAggregate,
  AttemptReviewHistoryItem,
  AttemptReviewMode,
} from './attempt-review.types';

interface AttemptReviewHistoryProps {
  review: AttemptReviewAggregate;
  mode: AttemptReviewMode;
  className?: string;
}

export function AttemptReviewHistory({
  review,
  mode,
  className,
}: AttemptReviewHistoryProps) {
  return (
    <section className={cn('grid min-w-0 gap-2', className)}>
      {review.history.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
          Предыдущих попыток пока нет.
        </p>
      ) : (
        <div className="min-w-0 overflow-x-auto pb-1">
          <div className="flex w-max min-w-full gap-2">
            {review.history.map((item) => (
              <AttemptHistoryCard
                key={item.attemptNumber}
                item={item}
                review={review}
                mode={mode}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AttemptHistoryCard({
  item,
  review,
  mode,
}: {
  item: AttemptReviewHistoryItem;
  review: AttemptReviewAggregate;
  mode: AttemptReviewMode;
}) {
  return (
    <a
      href={attemptHref(review, item.attemptNumber, mode)}
      className="block w-56 shrink-0 rounded-lg border bg-card px-2.5 py-2 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          Попытка #{item.attemptNumber}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDateTime(item.submittedAt)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {item.score === null
            ? 'Не оценено'
            : `${item.score}/${item.maxScore}`}
        </span>
        <span className="text-emerald-700 dark:text-emerald-300">
          +{item.addedLines}
        </span>
        <span className="text-rose-700 dark:text-rose-300">
          −{item.deletedLines}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3" /> {item.commentCount}
        </span>
      </div>
    </a>
  );
}

function attemptHref(
  review: AttemptReviewAggregate,
  attemptNumber: number,
  mode: AttemptReviewMode
): string {
  const base = `/courses/${review.courseSlug}/tasks/${review.current.task.id}/attempts/${review.current.student.username}/${attemptNumber}`;
  return mode === 'editable' ? `${base}/review` : base;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}
