import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronsUpDown, MessageSquare } from 'lucide-react';
import { formatGrade, type Grade } from '@/features/course/model/grade';
import type {
  AttemptId,
  AttemptNumber,
} from '@/features/course/model/identity';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shadcn/components/ui/popover';
import { cn } from '@/shadcn/lib/utils';
import { formatAttemptReviewDateTime } from '@/features/course/features/attempt-review/model/date-format';
import type {
  AttemptReviewMode,
  StudentAttempt,
} from '@/features/course/features/attempt-review/model/types';
import styles from './attempt-select.module.css';

type AttemptReviewAttemptSelectProps = {
  attempts: StudentAttempt[];
  /** The open Attempt, also when the list does not have it yet. */
  current: StudentAttempt;
  maxGrade: Grade;
  mode: AttemptReviewMode;
  variant?: 'panel' | 'header';
  className?: string;
};

export function AttemptReviewAttemptSelect({
  attempts: studentAttempts,
  current,
  maxGrade,
  mode,
  variant = 'panel',
  className,
}: AttemptReviewAttemptSelectProps) {
  const [open, setOpen] = useState(false);
  // Data is addressed by identities; links follow the confirmed route locators.
  const { courseSlug, taskId, studentUsername } = useParams({
    from: '/_authenticated/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber',
  });
  const attempts = useMemo(
    () => getAttemptOptions(studentAttempts, current, maxGrade),
    [studentAttempts, current, maxGrade]
  );
  const currentAttempt =
    attempts.find((attempt) => attempt.id === current.id) ??
    toAttemptOption(current, maxGrade);
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
                <ChevronsUpDown
                  className={cn(
                    'size-4 text-muted-foreground transition-colors',
                    'group-hover:text-foreground'
                  )}
                />
              }
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={headerVariant ? 'end' : 'start'}
          className={cn(
            'w-[var(--radix-popover-trigger-width)] min-w-72 overflow-hidden',
            'p-0'
          )}
        >
          <div className="max-h-80 overflow-y-auto">
            <div className="divide-y">
              {attempts.map((attempt) => {
                const selected = attempt.id === current.id;
                const card = (
                  <AttemptOptionCard
                    attempt={attempt}
                    selected={selected}
                    variant="menu-item"
                  />
                );

                if (selected) {
                  return (
                    <button
                      key={attempt.id}
                      type="button"
                      className={menuItemClassName}
                      onClick={() => setOpen(false)}
                    >
                      {card}
                    </button>
                  );
                }

                // A link, so hover and focus preload the Attempt's route.
                return (
                  <Link
                    key={attempt.id}
                    to={
                      mode === 'editable'
                        ? '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber/review'
                        : '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber/'
                    }
                    params={{
                      courseSlug,
                      taskId,
                      studentUsername,
                      attemptNumber: String(attempt.attemptNumber),
                    }}
                    preload="intent"
                    className={menuItemClassName}
                    onClick={() => setOpen(false)}
                  >
                    {card}
                  </Link>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const menuItemClassName = cn(
  'block w-full cursor-pointer text-left',
  'transition-colors outline-none hover:bg-muted/60',
  'focus-visible:bg-muted/60'
);

type AttemptSelectOption = {
  id: AttemptId;
  attemptNumber: AttemptNumber;
  submittedAt: string;
  gradeLabel: string;
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
          'flex h-9 min-w-0 items-center justify-between gap-2',
          'rounded-lg bg-muted/50 px-2.5 transition-colors hover:bg-muted/70',
          'lg:block lg:h-auto lg:px-3 lg:py-2',
          styles.trigger,
          selected && 'bg-primary/5'
        )}
      >
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">
            <span className={styles.labelShort}>#{attempt.attemptNumber}</span>
            <span className={styles.labelFull}>
              Попытка #{attempt.attemptNumber}
            </span>
          </span>
          <span
            className={cn(
              'ml-auto flex shrink-0 items-center gap-1.5 text-xs',
              'text-muted-foreground'
            )}
          >
            {attempt.gradeLabel}
            {trailing}
          </span>
        </div>
        <div
          className={cn(
            'mt-0.5 hidden items-center gap-2 overflow-hidden text-xs',
            'text-muted-foreground lg:flex'
          )}
        >
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
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground'
          )}
        >
          {formatAttemptReviewDateTime(attempt.submittedAt)}
          {trailing}
        </span>
      </div>
      <div
        className={cn(
          'mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs',
          'text-muted-foreground'
        )}
      >
        <span>{attempt.gradeLabel}</span>
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

function getGradeLabel(grade: Grade | null, maxGrade: Grade): string {
  return grade
    ? `${formatGrade(grade)}/${formatGrade(maxGrade)}`
    : 'Не оценено';
}

function toAttemptOption(
  { review, ...attempt }: StudentAttempt,
  maxGrade: Grade
): AttemptSelectOption {
  return {
    ...attempt,
    gradeLabel: getGradeLabel(review?.grade ?? null, maxGrade),
  };
}

function getAttemptOptions(
  attempts: StudentAttempt[],
  current: StudentAttempt,
  maxGrade: Grade
): AttemptSelectOption[] {
  const listed = attempts.some(({ id }) => id === current.id);

  return (listed ? attempts : [...attempts, current])
    .map((attempt) => toAttemptOption(attempt, maxGrade))
    .sort((first, second) => second.attemptNumber - first.attemptNumber);
}
