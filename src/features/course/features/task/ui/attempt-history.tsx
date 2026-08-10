import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  CircleCheck,
  CircleDashed,
  Clock3,
  History,
  MessageSquareText,
  Send,
  TextAlignStart,
} from 'lucide-react';

import {
  formatTaskDateTime,
  getDeadlineRelation,
} from '@/features/course/features/task/model/deadline';
import type { DeadlineRelation } from '@/features/course/features/task/model/deadline';
import type { TaskAttempt } from '@/features/course/features/task/model/types';
import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

export function TaskAttemptHistory({
  attempts,
  courseSlug,
  deadlineAt,
  maxScore,
  taskId,
}: {
  attempts: TaskAttempt[];
  courseSlug: string;
  deadlineAt: string;
  maxScore: number;
  taskId: string;
}) {
  return (
    <section className="mt-7 sm:mt-9" aria-labelledby="attempts-heading">
      <div className="mb-5 px-1">
        <h2
          id="attempts-heading"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"
        >
          <History
            className="size-5 text-muted-foreground sm:size-6"
            aria-hidden="true"
          />
          История попыток
        </h2>
      </div>

      {attempts.length > 0 ? (
        <ol
          className={cn(
            'divide-y overflow-hidden rounded-2xl border bg-card',
            'sm:grid sm:grid-cols-[max-content_minmax(0,1fr)_minmax(0,1fr)_max-content]'
          )}
        >
          {attempts.map((attempt) => (
            <TaskAttemptHistoryItem
              key={attempt.id}
              attempt={attempt}
              courseSlug={courseSlug}
              deadlineAt={deadlineAt}
              maxScore={maxScore}
              taskId={taskId}
            />
          ))}
        </ol>
      ) : (
        <EmptyAttemptHistory />
      )}
    </section>
  );
}

function TaskAttemptHistoryItem({
  attempt,
  courseSlug,
  deadlineAt,
  maxScore,
  taskId,
}: {
  attempt: TaskAttempt;
  courseSlug: string;
  deadlineAt: string;
  maxScore: number;
  taskId: string;
}) {
  const relation = getDeadlineRelation({
    submittedAt: attempt.submittedAt,
    deadlineAt,
  });
  const pending = attempt.review.status === 'pending';

  return (
    <li
      className={cn(
        'grid grid-cols-1 gap-y-3 px-4 py-4',
        'transition-colors hover:bg-accent/30',
        'sm:col-span-4 sm:grid-cols-subgrid sm:items-center',
        'sm:gap-x-0 sm:gap-y-0 sm:px-5'
      )}
      aria-label={`Попытка №${attempt.number}`}
    >
      <span className="col-start-1 row-start-1 flex items-center text-lg font-bold tracking-tight sm:min-h-12 sm:pr-4">
        №{attempt.number}
      </span>

      <SubmissionTime attempt={attempt} deadlineRelation={relation} />
      <ReviewStatus attempt={attempt} />

      <div
        className={cn(
          'col-start-1 row-start-4 flex items-center gap-2',
          'sm:col-start-4 sm:row-start-1 sm:min-h-12 sm:justify-end',
          'sm:border-l sm:border-border/70 sm:pl-4'
        )}
      >
        {attempt.review.status === 'graded' && (
          <ScoreBadge score={attempt.review.score} maxScore={maxScore} />
        )}

        <Button asChild variant="outline" className="h-9 rounded-lg px-3">
          <Link
            to="/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId"
            params={{
              courseSlug,
              taskId,
              studentUsername: attempt.studentUsername,
              attemptId: String(attempt.number),
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
    </li>
  );
}

function SubmissionTime({
  attempt,
  deadlineRelation,
}: {
  attempt: TaskAttempt;
  deadlineRelation: DeadlineRelation;
}) {
  return (
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
        <span className="block text-xs text-muted-foreground">Отправлено</span>
        <span
          className={cn(
            'block text-sm font-semibold',
            getDeadlineRelationTone(deadlineRelation.timing)
          )}
        >
          {deadlineRelation.label}
        </span>
        <time
          dateTime={attempt.submittedAt}
          className="block text-xs text-muted-foreground"
        >
          {formatTaskDateTime(attempt.submittedAt)}
        </time>
      </div>
    </div>
  );
}

function ReviewStatus({ attempt }: { attempt: TaskAttempt }) {
  return (
    <div
      className={cn(
        'col-start-1 row-start-3 min-w-0',
        'sm:col-start-3 sm:row-start-1 sm:flex sm:min-h-12 sm:items-center',
        'sm:border-l sm:border-border/70 sm:px-4'
      )}
    >
      {attempt.review.status === 'pending' ? (
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
              <time dateTime={attempt.review.gradedAt}>
                {formatTaskDateTime(attempt.review.gradedAt)}
              </time>
            </p>
            <p
              className="truncate text-sm font-semibold"
              title={attempt.review.graderName}
            >
              {attempt.review.graderName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score, maxScore }: { score: number; maxScore: number }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-lg border px-2.5 py-1.5 text-base font-bold',
        getScoreTone(score, maxScore)
      )}
      aria-label={`Результат: ${score} из ${maxScore}`}
    >
      {score}
      <span className="text-sm text-muted-foreground">/{maxScore}</span>
    </span>
  );
}

function EmptyAttemptHistory() {
  return (
    <div
      className={cn(
        'rounded-3xl border border-dashed bg-card px-6 py-12 text-center',
        'sm:px-10'
      )}
    >
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Send className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Попыток пока нет</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        После отправки решения здесь появятся время, статус проверки и
        результат.
      </p>
    </div>
  );
}

function getDeadlineRelationTone(timing: DeadlineRelation['timing']): string {
  if (timing === 'after') {
    return 'text-rose-700 dark:text-rose-300';
  }

  if (timing === 'before' || timing === 'exact') {
    return 'text-emerald-700 dark:text-emerald-300';
  }

  return 'text-muted-foreground';
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
