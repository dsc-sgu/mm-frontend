import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  CircleCheck,
  CircleDashed,
  Clock3,
  MessageSquareText,
  TextAlignStart,
} from 'lucide-react';

import {
  formatDeadlineDelta,
  formatTaskDateTime,
} from '@/features/course/features/task/model/date-format';
import type { CourseTaskAttempt } from '@/features/course/features/task/model/types';
import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

export function TaskAttemptRow({
  attempt,
  courseSlug,
  deadlineAt,
  taskId,
}: {
  attempt: CourseTaskAttempt;
  courseSlug: string;
  deadlineAt: string;
  taskId: string;
}) {
  const pending = attempt.status === 'pending-review';
  const deadlineDelta = formatDeadlineDelta({
    submittedAt: attempt.submittedAt,
    deadlineAt,
  });
  const submittedLate = deadlineDelta.timing === 'after';

  return (
    <article
      className={cn(
        'grid grid-cols-1 gap-y-3 px-4 py-4',
        'transition-colors hover:bg-accent/30',
        'sm:col-span-4 sm:grid-cols-subgrid sm:items-center',
        'sm:gap-x-0 sm:gap-y-0 sm:px-5'
      )}
    >
      <h3 className="col-start-1 row-start-1 flex items-center text-lg font-bold tracking-tight sm:min-h-12 sm:pr-4">
        №{attempt.attemptNumber}
      </h3>

      <div
        className={cn(
          'col-start-1 row-start-2 flex min-w-0 items-center gap-2',
          'sm:col-start-2 sm:row-start-1 sm:min-h-12 sm:items-center',
          'sm:border-l sm:border-border/70 sm:px-4'
        )}
      >
        <Clock3
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <span className="block text-xs text-muted-foreground">
            Отправлено
          </span>
          <span
            className={cn(
              'block text-sm font-semibold',
              submittedLate
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-emerald-700 dark:text-emerald-300'
            )}
          >
            {deadlineDelta.label}
          </span>
          <time
            dateTime={attempt.submittedAt}
            className="block text-xs text-muted-foreground"
          >
            {formatTaskDateTime(attempt.submittedAt)}
          </time>
        </div>
      </div>

      <div
        className={cn(
          'col-start-1 row-start-3 min-w-0',
          'sm:col-start-3 sm:row-start-1 sm:flex sm:min-h-12 sm:items-center',
          'sm:border-l sm:border-border/70 sm:px-4'
        )}
      >
        {attempt.status === 'pending-review' ? (
          <div className="flex min-w-0 items-center gap-2">
            <CircleDashed
              className="size-4 shrink-0 text-amber-600 dark:text-amber-300"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground/90">
              Ожидает проверки
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <CircleCheck
              className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm text-foreground/80">
                Оценено{' '}
                <time dateTime={attempt.gradedAt}>
                  {formatTaskDateTime(attempt.gradedAt)}
                </time>
              </p>
              <p
                className="truncate text-sm font-semibold"
                title={attempt.gradedBy}
              >
                {attempt.gradedBy}
              </p>
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'col-start-1 row-start-4 flex items-center gap-2',
          'sm:col-start-4 sm:row-start-1 sm:min-h-12 sm:justify-end',
          'sm:border-l sm:border-border/70 sm:pl-4'
        )}
      >
        {attempt.status === 'graded' && (
          <span
            className={cn(
              'shrink-0 rounded-lg border px-2.5 py-1.5 text-base font-bold',
              getScoreTone(attempt.score, attempt.maxScore)
            )}
            aria-label={`Результат: ${attempt.score} из ${attempt.maxScore}`}
          >
            {attempt.score}
            <span className="text-sm text-muted-foreground">
              /{attempt.maxScore}
            </span>
          </span>
        )}

        <Button asChild variant="outline" className="h-9 rounded-lg px-3">
          <Link
            to="/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId"
            params={{
              courseSlug,
              taskId,
              studentUsername: attempt.studentUsername,
              attemptId: String(attempt.attemptNumber),
            }}
          >
            {pending ? (
              <TextAlignStart className="size-4" aria-hidden="true" />
            ) : (
              <MessageSquareText className="size-4" aria-hidden="true" />
            )}
            {pending ? 'Изменения' : 'Отзыв'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function getScoreTone(score: number, maxScore: number): string {
  if (score === 0) {
    return cn(
      'border-rose-200 bg-rose-50 text-rose-700',
      'dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300'
    );
  }

  if (score === maxScore) {
    return cn(
      'border-emerald-200 bg-emerald-50 text-emerald-700',
      'dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
    );
  }

  return cn(
    'border-amber-200 bg-amber-50 text-amber-700',
    'dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
  );
}
