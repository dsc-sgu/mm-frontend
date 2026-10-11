// PROTOTYPE (#121): compact quick-grading row shaped after #45/#100 — one
// container with row dividers and stable zones, the student attempt history
// (task/ui/attempt-history.tsx) as the visual reference. In quick grading the
// Grade field takes the place of the row action. Only the feedback affordance
// differs between variants; the list fixes the row height.
import type { KeyboardEvent, ReactNode } from 'react';
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  LockKeyhole,
} from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Input } from '@/shadcn/components/ui/input';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { normalizeScoreDraftInput } from '@/features/course/features/grading';
import {
  getDeadlineRelation,
  type DeadlineRelation,
} from '@/features/course/features/task/model/deadline';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import type {
  QuickEntry,
  RowOutcome,
} from '@/features/course/features/attempts/prototype/quick-grading-feedback/session';
import { columnsKey, desktopColumns, type FeedbackColumn } from './columns';

export type RowLayout = 'desktop' | 'mobile';

export type RowProps = {
  layout: RowLayout;
  feedbackColumn: FeedbackColumn;
  showAction: boolean;
  attempt: CourseAttempt;
  entry: QuickEntry | undefined;
  outcome: RowOutcome | undefined;
  error: string | null;
  saving: boolean;
  gradeable: boolean;
  active: boolean;
  gradeInputRef: (element: HTMLInputElement | null) => void;
  onGradeChange: (value: string) => void;
  onGradeKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onActivate: () => void;
  feedbackCell: ReactNode;
};

export function QuickRow(props: RowProps) {
  const { layout, attempt } = props;
  const relation = getDeadlineRelation({
    submittedAt: attempt.submittedAt,
    deadlineAt: attempt.deadlineAt,
  });

  if (layout === 'mobile') {
    return (
      <article
        onClick={props.onActivate}
        className={cn(
          'grid h-full grid-rows-[auto_auto_auto_1fr] gap-y-0.5 px-4 py-2.5',
          props.active ? activeRowClassName : null
        )}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span
            data-student-name
            title={attempt.student.fullName}
            className="truncate text-sm font-semibold"
          >
            {attempt.student.fullName}
          </span>
          <span className="shrink-0 text-xs">
            <StateZoneContent {...props} compact />
          </span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          №{attempt.attemptNumber} · {attempt.task.title}
        </span>
        <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
          <span
            className={cn('truncate', relationTone[relation.timing])}
            title={relation.label}
          >
            {relation.label}
          </span>
          <DiffStats attempt={attempt} />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <GradeZoneContent {...props} />
          <div className="min-w-0 flex-1">{props.feedbackCell}</div>
        </div>
      </article>
    );
  }

  const feedbackOwnZone = props.feedbackColumn === 'field';

  return (
    <article
      onClick={props.onActivate}
      className={cn(
        'grid h-full items-center px-4',
        desktopColumns[columnsKey(props.feedbackColumn, props.showAction)],
        props.active ? activeRowClassName : null
      )}
    >
      <div className="min-w-0 pr-3 leading-tight">
        <p
          data-student-name
          title={attempt.student.fullName}
          className="truncate text-sm font-semibold"
        >
          {attempt.student.fullName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {attempt.student.group}
        </p>
      </div>
      <Zone>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm" title={attempt.task.title}>
            {attempt.task.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Попытка №{attempt.attemptNumber}
          </p>
        </div>
      </Zone>
      <Zone>
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              'truncate text-xs font-semibold',
              relationTone[relation.timing]
            )}
            title={relation.label}
          >
            {relation.label}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {DATE_FORMAT.format(new Date(attempt.submittedAt))}
          </p>
        </div>
      </Zone>
      <Zone>
        <div className="min-w-0 text-xs leading-tight">
          <StateZoneContent {...props} />
        </div>
      </Zone>
      <Zone>
        <DiffStats attempt={attempt} />
      </Zone>
      <Zone>
        <GradeZoneContent {...props} />
        {feedbackOwnZone ? null : props.feedbackCell}
      </Zone>
      {feedbackOwnZone ? (
        <Zone>
          <div className="min-w-0 flex-1">{props.feedbackCell}</div>
        </Zone>
      ) : null}
      {props.showAction ? (
        <Zone>
          <Button
            type="button"
            variant="outline"
            tabIndex={-1}
            title="В прототипе никуда не ведёт: показывает, сколько места занимает действие строки"
            className="h-9 rounded-lg px-2.5"
            onClick={(event) => event.stopPropagation()}
          >
            Ревью
            <ArrowRight className="size-4" />
          </Button>
        </Zone>
      ) : null}
    </article>
  );
}

const activeRowClassName = cn(
  'bg-primary/[0.04]',
  'shadow-[inset_3px_0_0_var(--color-primary)]'
);

function Zone({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex h-10 min-w-0 items-center gap-1.5 border-l border-border/70',
        'px-3'
      )}
    >
      {children}
    </div>
  );
}

function DiffStats({ attempt }: { attempt: CourseAttempt }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-xs font-medium">
      <span className="text-emerald-700 dark:text-emerald-300">
        +{attempt.diff.addedLines}
      </span>
      <span className="text-rose-700 dark:text-rose-300">
        −{attempt.diff.deletedLines}
      </span>
    </span>
  );
}

function GradeZoneContent({
  attempt,
  entry,
  outcome,
  error,
  saving,
  gradeable,
  gradeInputRef,
  onGradeChange,
  onGradeKeyDown,
  onActivate,
}: RowProps) {
  const maxScore = attempt.task.maxScore;

  if (gradeable) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <Input
          ref={gradeInputRef}
          type="text"
          inputMode="decimal"
          value={entry?.grade ?? ''}
          disabled={saving}
          placeholder="—"
          aria-label={`Балл: ${attempt.student.fullName}, ${attempt.task.title}`}
          aria-invalid={Boolean(error)}
          onFocus={onActivate}
          onKeyDown={onGradeKeyDown}
          onChange={(event) => {
            const next = normalizeScoreDraftInput(event.target.value);

            if (next !== null) {
              onGradeChange(next);
            }
          }}
          className={cn(
            'h-9 w-14 rounded-lg px-1 text-center text-base font-bold',
            'md:text-base',
            error
              ? 'border-destructive bg-destructive/10 text-destructive'
              : entry?.grade
                ? [
                    'border-orange-400 bg-orange-50 text-orange-950',
                    'dark:border-orange-500/70 dark:bg-orange-950/35',
                    'dark:text-orange-100',
                  ]
                : null
          )}
        />
        <span className="text-sm text-muted-foreground">/{maxScore}</span>
      </span>
    );
  }

  if (outcome?.status === 'saved') {
    return <ScoreBadge score={outcome.grade} maxScore={maxScore} />;
  }

  if (attempt.grade) {
    return <ScoreBadge score={attempt.grade.score} maxScore={maxScore} />;
  }

  return <span className="text-sm text-muted-foreground">—/{maxScore}</span>;
}

function StateZoneContent({
  attempt,
  outcome,
  error,
  saving,
  entry,
  compact = false,
}: RowProps & { compact?: boolean }) {
  const second = (text: string) =>
    compact ? null : (
      <span className="block truncate font-normal text-muted-foreground">
        {text}
      </span>
    );

  if (saving) {
    return <State icon={<Spinner className="size-3.5" />}>Публикуется…</State>;
  }

  if (outcome?.status === 'saved') {
    return (
      <State icon={<CircleCheck className={iconTone.ok} />}>Опубликовано</State>
    );
  }

  if (outcome?.status === 'conflict') {
    return (
      <State
        icon={<CircleX className="size-3.5 text-destructive" />}
        className="text-destructive"
      >
        Review уже есть
        {second(`${outcome.author} · ${outcome.publishedGrade}`)}
      </State>
    );
  }

  if (attempt.grade) {
    return (
      <State icon={<CircleCheck className={iconTone.ok} />}>
        Оценено
        {second(attempt.grade.gradedBy)}
      </State>
    );
  }

  if (attempt.reviewLock) {
    return (
      <State
        icon={<LockKeyhole className={iconTone.warn} />}
        className="text-amber-700 dark:text-amber-300"
      >
        На проверке
        {second(attempt.reviewLock.teacherName)}
      </State>
    );
  }

  if (error) {
    return (
      <State
        icon={<CircleAlert className="size-3.5 text-destructive" />}
        className="font-semibold text-destructive"
      >
        {error}
      </State>
    );
  }

  if (entry) {
    return (
      <State
        icon={<CircleDot className="size-3.5 text-orange-600" />}
        className="font-semibold text-orange-600 dark:text-orange-300"
      >
        Не сохранено
      </State>
    );
  }

  return (
    <State icon={<CircleDashed className={iconTone.warn} />}>Не оценено</State>
  );
}

function State({
  icon,
  className,
  children,
}: {
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function ScoreBadge({ score, maxScore }: { score: number; maxScore: number }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-lg border px-2 py-1 text-sm font-bold',
        score === 0
          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300'
          : score === maxScore
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
      )}
    >
      {score}
      <span className="text-xs text-muted-foreground">/{maxScore}</span>
    </span>
  );
}

const iconTone = {
  ok: 'size-3.5 text-emerald-600 dark:text-emerald-300',
  warn: 'size-3.5 text-amber-600 dark:text-amber-300',
};

const relationTone: Record<DeadlineRelation['timing'], string> = {
  before: 'text-emerald-700 dark:text-emerald-300',
  exact: 'text-emerald-700 dark:text-emerald-300',
  after: 'text-rose-700 dark:text-rose-300',
  unknown: 'text-muted-foreground',
};

const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
