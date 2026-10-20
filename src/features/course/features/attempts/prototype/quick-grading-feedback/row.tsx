// PROTOTYPE (#121): compact quick-grading row shaped after #45/#100 — one
// container with row dividers and stable zones, the student attempt history
// (task/ui/attempt-history.tsx) as the visual reference. In quick grading the
// Grade field takes the place of the row action. Only the feedback affordance
// differs between variants.
//
// Each layout tier has one fixed row height, so the virtualizer never measures:
// - wide: every text stays on one line;
// - medium: Student name and Task title may wrap to two clamped lines;
// - stacked: the phone card.
// Diff lives next to the attempt badge in the Task zone, not in its own column.
import type { KeyboardEvent, ReactNode } from 'react';
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  LockKeyhole,
} from 'lucide-react';

import { Input } from '@/shadcn/components/ui/input';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { gradeToNumber } from '@/features/course/model/grade';
import {
  getDeadlineRelation,
  type DeadlineRelation,
} from '@/features/course/features/task/model/deadline';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import type {
  QuickEntry,
  RowOutcome,
} from '@/features/course/features/attempts/prototype/quick-grading-feedback/session';
import { normalizeGradeDraftInput } from './session';
import { desktopColumns, type FeedbackColumn } from './columns';

export type RowLayout = 'wide' | 'medium' | 'stacked';

export type RowProps = {
  layout: RowLayout;
  feedbackColumn: FeedbackColumn;
  attempt: CourseAttempt;
  entry: QuickEntry | undefined;
  outcome: RowOutcome | undefined;
  error: string | null;
  saving: boolean;
  gradeable: boolean;
  gradeInputRef: (element: HTMLInputElement | null) => void;
  onGradeChange: (value: string) => void;
  onGradeKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onActivate: () => void;
  feedbackCell: ReactNode;
};

const rowInteraction = cn(
  'transition-colors hover:bg-muted/60',
  'focus-within:bg-primary/[0.04]',
  'focus-within:shadow-[inset_3px_0_0_var(--color-primary)]'
);

export function QuickRow(props: RowProps) {
  const { layout, attempt } = props;

  if (layout === 'stacked') {
    return (
      <article
        onClick={props.onActivate}
        className={cn(
          'grid h-full grid-rows-[auto_auto_auto_1fr] gap-y-1 px-4 py-2.5',
          rowInteraction
        )}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span
            data-fit="name"
            title={attempt.student.fullName}
            className="truncate text-sm font-semibold"
          >
            {attempt.student.fullName}
          </span>
          <span className="shrink-0 text-xs">
            <StateZoneContent {...props} compact />
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <AttemptBadge number={attempt.attemptNumber} />
          <span
            data-fit="task"
            title={attempt.task.title}
            className="truncate text-xs text-muted-foreground"
          >
            {attempt.task.title}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
          <SubmissionLine attempt={attempt} />
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
  const zoneHeight = zoneHeightByLayout[layout];
  const textFit = textFitByLayout[layout];

  return (
    <article
      onClick={props.onActivate}
      className={cn(
        'grid h-full items-center px-4',
        desktopColumns[props.feedbackColumn],
        props.feedbackColumn === 'none' ? 'cursor-pointer' : null,
        rowInteraction
      )}
    >
      <div className="min-w-0 pr-3 leading-tight">
        <p
          data-fit="name"
          title={attempt.student.fullName}
          className={cn('text-sm font-semibold', textFit)}
        >
          {attempt.student.fullName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {attempt.student.group}
        </p>
      </div>
      <Zone height={zoneHeight}>
        <div className="min-w-0 leading-tight">
          <p
            data-fit="task"
            title={attempt.task.title}
            className={cn('text-sm', textFit)}
          >
            {attempt.task.title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <AttemptBadge number={attempt.attemptNumber} />
            <DiffStats attempt={attempt} />
          </div>
        </div>
      </Zone>
      <Zone height={zoneHeight}>
        <SubmissionZoneContent attempt={attempt} />
      </Zone>
      <Zone height={zoneHeight}>
        <div className="min-w-0 text-xs">
          <StateZoneContent {...props} />
        </div>
      </Zone>
      <Zone height={zoneHeight}>
        <GradeZoneContent {...props} />
      </Zone>
      {feedbackOwnZone ? (
        <Zone height={zoneHeight}>
          <div className="min-w-0 flex-1">{props.feedbackCell}</div>
        </Zone>
      ) : null}
    </article>
  );
}

const zoneHeightByLayout: Record<Exclude<RowLayout, 'stacked'>, string> = {
  wide: 'h-10',
  medium: 'h-16',
};

const textFitByLayout: Record<Exclude<RowLayout, 'stacked'>, string> = {
  wide: 'truncate',
  medium: 'line-clamp-2 [overflow-wrap:anywhere]',
};

function Zone({ height, children }: { height: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1.5 border-l border-border/70 px-3',
        height
      )}
    >
      {children}
    </div>
  );
}

function AttemptBadge({ number }: { number: number }) {
  return (
    <span
      title={number > 1 ? `Повторная попытка №${number}` : 'Первая попытка'}
      className={cn(
        'shrink-0 rounded-md px-1.5 text-[11px] leading-[18px] font-semibold',
        number > 1
          ? [
              'bg-violet-100 text-violet-800',
              'dark:bg-violet-500/20 dark:text-violet-200',
            ]
          : 'bg-muted text-muted-foreground'
      )}
    >
      Попытка {number}
    </span>
  );
}

function DiffStats({ attempt }: { attempt: CourseAttempt }) {
  return (
    <span
      title="Строк добавлено и удалено в этой попытке"
      className="flex shrink-0 items-center gap-1.5 text-xs font-medium"
    >
      <span className="text-emerald-700 dark:text-emerald-300">
        +{attempt.diff.addedLines}
      </span>
      <span className="text-rose-700 dark:text-rose-300">
        −{attempt.diff.deletedLines}
      </span>
    </span>
  );
}

function SubmissionZoneContent({ attempt }: { attempt: CourseAttempt }) {
  const relation = getDeadlineRelation(attempt);

  return (
    <div className="min-w-0 leading-tight">
      <p
        data-fit="submission"
        title={relation.label}
        className={cn(
          'truncate text-xs font-semibold',
          relationTone[relation.timing]
        )}
      >
        {compactRelation(attempt)}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {DATE_FORMAT.format(new Date(attempt.submittedAt))}
      </p>
    </div>
  );
}

function SubmissionLine({ attempt }: { attempt: CourseAttempt }) {
  const relation = getDeadlineRelation(attempt);

  return (
    <span
      data-fit="submission"
      title={relation.label}
      className="flex min-w-0 items-center gap-1.5 truncate"
    >
      <span className={cn('font-semibold', relationTone[relation.timing])}>
        {compactRelation(attempt)}
      </span>
      <span className="text-muted-foreground">
        {DATE_FORMAT.format(new Date(attempt.submittedAt))}
      </span>
    </span>
  );
}

// Same wording as the full label in the tooltip ("за 1 день 4 часа до
// дедлайна"), with abbreviated units; the longest form, "2 д 23 ч после
// дедлайна", fits the 11rem Submission zone.
function compactRelation({
  submittedAt,
  deadlineAt,
}: Pick<CourseAttempt, 'submittedAt' | 'deadlineAt'>) {
  const difference =
    new Date(submittedAt).getTime() - new Date(deadlineAt).getTime();

  if (!Number.isFinite(difference)) {
    return 'срок не указан';
  }

  if (difference === 0) {
    return 'точно в срок';
  }

  const minutes = Math.max(1, Math.round(Math.abs(difference) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const duration = formatDuration(days, hours, minutes);

  return difference < 0
    ? `за ${duration} до дедлайна`
    : `${duration} после дедлайна`;
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
  const maxScore = gradeToNumber(attempt.task.maxGrade);

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
            const next = normalizeGradeDraftInput(event.target.value);

            if (next !== null) {
              onGradeChange(next);
            }
          }}
          className={cn(
            'h-9 w-14 rounded-lg px-1 text-center text-base font-bold',
            'md:text-base',
            error && 'border-destructive bg-destructive/10 text-destructive',
            !error &&
              entry?.grade && [
                'border-orange-400 bg-orange-50 text-orange-950',
                'dark:border-orange-500/70 dark:bg-orange-950/35',
                'dark:text-orange-100',
              ]
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
    return (
      <ScoreBadge
        score={gradeToNumber(attempt.grade.value)}
        maxScore={maxScore}
      />
    );
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
  const state = (() => {
    if (saving) {
      return {
        icon: <Spinner className="size-3.5" />,
        label: 'Публикуется…',
      };
    }

    if (outcome?.status === 'saved') {
      return {
        icon: <CircleCheck className={iconTone.ok} />,
        label: 'Опубликовано',
      };
    }

    if (outcome?.status === 'conflict') {
      return {
        icon: <CircleX className="size-3.5 text-destructive" />,
        tone: 'text-destructive',
        label: 'Уже оценено',
        detail: `${shortName(outcome.author)} · ${outcome.publishedGrade}`,
        title: `Review уже опубликовал ${outcome.author} с баллом ${outcome.publishedGrade}. Ваш балл не сохранён.`,
      };
    }

    if (attempt.grade) {
      return {
        icon: <CircleCheck className={iconTone.ok} />,
        label: 'Оценено',
        detail: shortName(attempt.grade.gradedBy),
        title: `Оценил ${attempt.grade.gradedBy}`,
      };
    }

    if (attempt.reviewLock) {
      return {
        icon: <LockKeyhole className={iconTone.warn} />,
        tone: 'text-amber-700 dark:text-amber-300',
        label: 'На проверке',
        detail: shortName(attempt.reviewLock.teacherName),
        title: `Проверяет ${attempt.reviewLock.teacherName}`,
      };
    }

    if (error) {
      return {
        icon: <CircleAlert className="size-3.5 text-destructive" />,
        tone: 'font-semibold text-destructive',
        label: error,
      };
    }

    if (entry) {
      return {
        icon: <CircleDot className="size-3.5 text-orange-600" />,
        tone: 'font-semibold text-orange-600 dark:text-orange-300',
        label: 'Не сохранено',
      };
    }

    return {
      icon: <CircleDashed className={iconTone.warn} />,
      label: 'Не оценено',
    };
  })();

  return (
    <span
      title={'title' in state ? state.title : undefined}
      className={cn(
        'flex min-w-0 items-center gap-1.5',
        'tone' in state ? state.tone : null
      )}
    >
      <span className="shrink-0">{state.icon}</span>
      <span className="min-w-0 leading-tight">
        <span
          data-fit="state"
          className={cn('truncate', compact ? null : 'block')}
        >
          {state.label}
        </span>
        {'detail' in state ? (
          <span
            data-fit="state"
            className={cn(
              'truncate font-normal text-muted-foreground',
              compact ? 'ml-1.5' : 'block'
            )}
          >
            {state.detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}

// "Фамилия Имя Отчество" → "Фамилия И. О."; mock teachers are "Имя Фамилия".
function shortName(fullName: string) {
  const parts = fullName.split(' ').filter(Boolean);

  if (parts.length === 3) {
    return `${parts[0]} ${parts[1]?.[0]}. ${parts[2]?.[0]}.`;
  }

  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]?.[0]}.`;
  }

  return fullName;
}

/** Whole days past three; otherwise days and hours, hours, or minutes. */
function formatDuration(days: number, hours: number, minutes: number) {
  if (days >= 3 || (days > 0 && hours === 0)) {
    return `${days} д`;
  }

  if (days > 0) {
    return `${days} д ${hours} ч`;
  }

  return hours > 0 ? `${hours} ч` : `${minutes} мин`;
}

type ScoreTone = 'zero' | 'full' | 'partial';

const SCORE_TONE: Record<ScoreTone, string[]> = {
  zero: [
    'border-rose-200 bg-rose-50 text-rose-700',
    'dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300',
  ],
  full: [
    'border-emerald-200 bg-emerald-50 text-emerald-700',
    'dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300',
  ],
  partial: [
    'border-amber-200 bg-amber-50 text-amber-700',
    'dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
  ],
};

function scoreTone(score: number, maxScore: number): ScoreTone {
  if (score === 0) {
    return 'zero';
  }

  return score === maxScore ? 'full' : 'partial';
}

function ScoreBadge({ score, maxScore }: { score: number; maxScore: number }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-lg border px-2 py-1 text-sm font-bold',
        SCORE_TONE[scoreTone(score, maxScore)]
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
