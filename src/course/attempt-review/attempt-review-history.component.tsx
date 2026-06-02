import { ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
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
    <section className={cn('grid gap-3', className)}>
      <h2 className="text-base font-semibold">История попыток</h2>
      <AttemptAdjacentControls review={review} mode={mode} />
      {review.history.length === 0 ? (
        <p className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
          Предыдущих попыток пока нет.
        </p>
      ) : (
        <div className="grid gap-2">
          {review.history.map((item) => (
            <AttemptHistoryCard
              key={item.attemptNumber}
              item={item}
              review={review}
              mode={mode}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function AttemptAdjacentControls({
  review,
  mode,
}: {
  review: AttemptReviewAggregate;
  mode: AttemptReviewMode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {review.previousAttempt ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <a
            href={attemptHref(
              review,
              review.previousAttempt.attemptNumber,
              mode
            )}
          >
            <ArrowLeft className="size-4" />
            Попытка #{review.previousAttempt.attemptNumber}
          </a>
        </Button>
      ) : null}
      {review.nextAttempt ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <a href={attemptHref(review, review.nextAttempt.attemptNumber, mode)}>
            Попытка #{review.nextAttempt.attemptNumber}
            <ArrowRight className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
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
      className="block rounded-xl border bg-card p-3 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Попытка #{item.attemptNumber}</span>
        <span className="text-sm text-muted-foreground">
          {formatDateTime(item.submittedAt)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
          <MessageSquare className="size-3.5" /> {item.commentCount}
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
