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

import { formatFullName } from '@/features/auth/model/full-name';
import type { Session } from '@/features/auth/model/types';
import type { CourseId } from '@/features/course/model/identity';
import { useMarkAttemptUpdatesSeenMutation } from '@/features/course/features/task/api/queries';
import {
  formatTaskDateTime,
  getDeadlineRelation,
} from '@/features/course/features/task/model/deadline';
import type { DeadlineRelation } from '@/features/course/features/task/model/deadline';
import type {
  TaskAttempt,
  TaskAttemptReview,
} from '@/features/course/features/task/model/types';
import {
  compareGrades,
  formatGrade,
  isZeroGrade,
  type Grade,
} from '@/features/course/model/grade';
import { Button } from '@/shadcn/components/ui/button';
import { cn } from '@/shadcn/lib/utils';

export function TaskAttemptHistory({
  attempts,
  courseId,
  courseSlug,
  deadlineAt,
  maxGrade,
  student,
  taskId,
}: {
  attempts: TaskAttempt[];
  courseId: CourseId;
  courseSlug: string;
  deadlineAt: string;
  maxGrade: Grade;
  student: Pick<Session, 'userId' | 'username'>;
  taskId: string;
}) {
  const markUpdatesSeenMutation = useMarkAttemptUpdatesSeenMutation();
  const hasUnseenUpdates = attempts.some(
    (attempt) => attempt.updates === 'unseen'
  );

  function markAttemptUpdatesSeen(attempt: TaskAttempt) {
    if (attempt.updates === 'seen') {
      return;
    }

    markUpdatesSeenMutation.mutate({
      viewerId: student.userId,
      courseId,
      taskId,
      studentId: student.userId,
      attemptId: attempt.id,
    });
  }

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
          <span className="whitespace-nowrap">
            История попыток
            {hasUnseenUpdates ? (
              <span className="ml-3 inline-block size-2.5 rounded-full bg-sky-500 align-middle">
                <span className="sr-only">Есть непросмотренные обновления</span>
              </span>
            ) : null}
          </span>
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
              maxGrade={maxGrade}
              studentUsername={student.username}
              taskId={taskId}
              onOpenAttempt={markAttemptUpdatesSeen}
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
  maxGrade,
  studentUsername,
  taskId,
  onOpenAttempt,
}: {
  attempt: TaskAttempt;
  courseSlug: string;
  deadlineAt: string;
  maxGrade: Grade;
  studentUsername: string;
  taskId: string;
  onOpenAttempt: (attempt: TaskAttempt) => void;
}) {
  const relation = getDeadlineRelation({
    submittedAt: attempt.submittedAt,
    deadlineAt,
  });
  const pending = attempt.review === null;
  const hasUnseenUpdates = attempt.updates === 'unseen';

  return (
    <li
      className={cn(
        'grid grid-cols-1 gap-y-3 px-4 py-4 transition-colors',
        'sm:col-span-4 sm:grid-cols-subgrid sm:items-center',
        'sm:gap-x-0 sm:gap-y-0 sm:px-5',
        hasUnseenUpdates
          ? cn(
              'bg-sky-500/[0.08] hover:bg-sky-500/[0.12]',
              'dark:bg-sky-400/[0.08] dark:hover:bg-sky-400/[0.12]'
            )
          : 'hover:bg-accent/30'
      )}
      aria-label={
        hasUnseenUpdates
          ? `Попытка №${attempt.attemptNumber}, есть непросмотренные обновления`
          : `Попытка №${attempt.attemptNumber}`
      }
    >
      <span className="col-start-1 row-start-1 flex items-center text-lg font-bold tracking-tight sm:min-h-12 sm:pr-4">
        №{attempt.attemptNumber}
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
        {attempt.review && (
          <GradeBadge grade={attempt.review.grade} maxGrade={maxGrade} />
        )}

        <Button asChild variant="outline" className="h-9 rounded-lg px-3">
          <Link
            to="/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptNumber"
            params={{
              courseSlug,
              taskId,
              studentUsername,
              attemptNumber: String(attempt.attemptNumber),
            }}
            onClick={() => onOpenAttempt(attempt)}
            preload="intent"
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
      {attempt.review === null ? (
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
        <PublishedReview review={attempt.review} />
      )}
    </div>
  );
}

function PublishedReview({ review }: { review: TaskAttemptReview }) {
  const publisherName = formatFullName(review.publishedBy);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <CircleCheck
        className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm text-foreground/80">
          Оценено{' '}
          <time dateTime={review.publishedAt}>
            {formatTaskDateTime(review.publishedAt)}
          </time>
        </p>
        <p className="truncate text-sm font-semibold" title={publisherName}>
          {publisherName}
        </p>
      </div>
    </div>
  );
}

function GradeBadge({ grade, maxGrade }: { grade: Grade; maxGrade: Grade }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-lg border px-2.5 py-1.5 text-base font-bold',
        getGradeTone(grade, maxGrade)
      )}
      aria-label={`Результат: ${formatGrade(grade)} из ${formatGrade(maxGrade)}`}
    >
      {formatGrade(grade)}
      <span className="text-sm text-muted-foreground">
        /{formatGrade(maxGrade)}
      </span>
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

function getGradeTone(grade: Grade, maxGrade: Grade): string {
  if (isZeroGrade(grade)) {
    return cn(
      'border-rose-200 bg-rose-50 text-rose-700',
      'dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300'
    );
  }

  if (compareGrades(grade, maxGrade) === 0) {
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
