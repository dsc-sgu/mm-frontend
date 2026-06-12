import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronsUpDown, MessageSquare } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import { formatAttemptReviewDateTime } from '@/features/course/features/attempt-review/model/date-format';
import type {
  AttemptReviewAggregate,
  AttemptReviewMode,
} from '@/features/course/features/attempt-review/model/types';

type AttemptReviewAttemptSelectProps = {
  review: AttemptReviewAggregate;
  mode: AttemptReviewMode;
  variant?: 'panel' | 'header';
  className?: string;
};

export function AttemptReviewAttemptSelect({
  review,
  mode,
  variant = 'panel',
  className,
}: AttemptReviewAttemptSelectProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const attempts = useMemo(() => getAttemptOptions(review), [review]);
  const currentAttempt =
    attempts.find(
      (attempt) => attempt.attemptNumber === review.current.attemptNumber
    ) ?? attempts[0];
  const headerVariant = variant === 'header';

  return (
    <div className={cn(headerVariant ? 'grid gap-1' : 'grid gap-2', className)}>
      {headerVariant ? null : <p className="text-sm font-medium">Попытка</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'group cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
              headerVariant ? 'rounded-lg' : 'rounded-xl'
            )}
            aria-label="Выбрать попытку"
          >
            <AttemptOptionCard
              attempt={currentAttempt}
              selected
              variant={headerVariant ? 'header-trigger' : 'trigger'}
              trailing={
                <ChevronsUpDown className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              }
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={headerVariant ? 'end' : 'start'}
          className="w-[var(--radix-popover-trigger-width)] min-w-72 overflow-hidden p-0"
        >
          <div className="max-h-80 overflow-y-auto">
            <div className="divide-y">
              {attempts.map((attempt) => {
                const selected =
                  attempt.attemptNumber === review.current.attemptNumber;

                return (
                  <button
                    key={attempt.attemptNumber}
                    type="button"
                    className="block w-full cursor-pointer text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
                    onClick={() => {
                      setOpen(false);

                      if (selected) {
                        return;
                      }

                      void navigate({
                        to:
                          mode === 'editable'
                            ? '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/review'
                            : '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/',
                        params: {
                          courseSlug: review.courseSlug,
                          taskId: review.current.task.id,
                          studentUsername: review.current.student.username,
                          attemptId: String(attempt.attemptNumber),
                        },
                      });
                    }}
                  >
                    <AttemptOptionCard
                      attempt={attempt}
                      selected={selected}
                      variant="menu-item"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type AttemptSelectOption = {
  attemptNumber: number;
  submittedAt: string;
  score: number | null;
  maxScore: number;
  addedLines: number;
  deletedLines: number;
  commentCount: number;
};

function AttemptOptionCard({
  attempt,
  selected = false,
  trailing,
  variant = 'trigger',
}: {
  attempt: AttemptSelectOption;
  selected?: boolean;
  trailing?: ReactNode;
  variant?: 'trigger' | 'header-trigger' | 'menu-item';
}) {
  if (variant === 'header-trigger') {
    return (
      <div
        className={cn(
          'attempt-review-attempt-trigger flex h-9 min-w-0 items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 transition-colors hover:bg-muted/70 lg:block lg:h-auto lg:px-3 lg:py-2',
          selected && 'bg-primary/5'
        )}
      >
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">
            <span className="attempt-review-attempt-label-short">
              #{attempt.attemptNumber}
            </span>
            <span className="attempt-review-attempt-label-full">
              Попытка #{attempt.attemptNumber}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {attempt.score === null
              ? 'Не оценено'
              : `${attempt.score}/${attempt.maxScore}`}
            {trailing}
          </span>
        </div>
        <div className="mt-0.5 hidden items-center gap-2 overflow-hidden text-xs text-muted-foreground lg:flex">
          <span className="truncate">
            {formatAttemptReviewDateTime(attempt.submittedAt)}
          </span>
          <span className="shrink-0 text-emerald-700 dark:text-emerald-300">
            +{attempt.addedLines}
          </span>
          <span className="shrink-0 text-rose-700 dark:text-rose-300">
            −{attempt.deletedLines}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" /> {attempt.commentCount}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === 'trigger'
          ? 'rounded-lg border bg-background px-2.5 py-2 transition-colors hover:border-primary'
          : 'px-3 py-2.5 transition-colors',
        selected &&
          (variant === 'trigger'
            ? 'border-primary bg-primary/5'
            : 'bg-primary/5')
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          Попытка #{attempt.attemptNumber}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {formatAttemptReviewDateTime(attempt.submittedAt)}
          {trailing}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {attempt.score === null
            ? 'Не оценено'
            : `${attempt.score}/${attempt.maxScore}`}
        </span>
        <span className="text-emerald-700 dark:text-emerald-300">
          +{attempt.addedLines}
        </span>
        <span className="text-rose-700 dark:text-rose-300">
          −{attempt.deletedLines}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3" /> {attempt.commentCount}
        </span>
      </div>
    </div>
  );
}

function getAttemptOptions(review: AttemptReviewAggregate) {
  const attempts = new Map<number, AttemptSelectOption>();

  const addAttempt = (attempt: AttemptSelectOption) => {
    attempts.set(attempt.attemptNumber, attempt);
  };

  review.attempts.forEach(addAttempt);

  addAttempt({
    attemptNumber: review.current.attemptNumber,
    submittedAt: review.current.submittedAt,
    score: review.current.grade?.score ?? null,
    maxScore: review.current.task.maxScore,
    addedLines: review.changedFiles.reduce(
      (sum, file) => sum + file.addedLines,
      0
    ),
    deletedLines: review.changedFiles.reduce(
      (sum, file) => sum + file.deletedLines,
      0
    ),
    commentCount: review.lineComments.length,
  });

  return Array.from(attempts.values()).sort(
    (first, second) => second.attemptNumber - first.attemptNumber
  );
}
