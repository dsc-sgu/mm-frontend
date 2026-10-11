// PROTOTYPE (#121): compact quick-grading row shared by every variant. Only the
// feedback cell differs between variants; the row height is fixed by the list.
import type { KeyboardEvent, ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';

import { Input } from '@/shadcn/components/ui/input';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { cn } from '@/shadcn/lib/utils';
import { normalizeScoreDraftInput } from '@/features/course/features/grading';
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';
import { desktopColumns, type FeedbackColumn } from './columns';
import type {
  QuickEntry,
  RowOutcome,
} from '@/features/course/features/attempts/prototype/quick-grading-feedback/session';

export type RowLayout = 'desktop' | 'mobile';
export type RowProps = {
  layout: RowLayout;
  feedbackColumn: FeedbackColumn;
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
  const gradeCell = <GradeCell {...props} />;
  const statusCell = <StatusCell {...props} />;

  if (layout === 'mobile') {
    return (
      <article
        onClick={props.onActivate}
        className={cn(
          'grid h-full grid-rows-[auto_auto_1fr] gap-0.5 rounded-xl border',
          'bg-card px-3 py-2',
          props.active
            ? 'border-primary ring-1 ring-primary/40'
            : 'border-border'
        )}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">
            {attempt.student.fullName}
          </span>
          <span className="shrink-0 text-xs">{statusCell}</span>
        </div>
        <span className="truncate text-xs text-muted-foreground">
          #{attempt.attemptNumber} · {attempt.task.title}
        </span>
        <div className="flex min-w-0 items-center gap-2">
          {gradeCell}
          <div className="min-w-0 flex-1">{props.feedbackCell}</div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={props.onActivate}
      className={cn(
        'grid h-full items-center gap-4 rounded-xl border bg-card px-4',
        desktopColumns[props.feedbackColumn],
        props.active ? 'border-primary ring-1 ring-primary/40' : 'border-border'
      )}
    >
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold">
          {attempt.student.fullName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {attempt.student.group}
        </p>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm">{attempt.task.title}</p>
        <SubmissionLine attempt={attempt} />
      </div>
      {gradeCell}
      <div className="min-w-0">{props.feedbackCell}</div>
      <div className="min-w-0 text-xs leading-tight">{statusCell}</div>
    </article>
  );
}

function SubmissionLine({ attempt }: { attempt: CourseAttempt }) {
  const late = Date.parse(attempt.submittedAt) > Date.parse(attempt.deadlineAt);

  return (
    <p className="truncate text-xs text-muted-foreground">
      Попытка #{attempt.attemptNumber} ·{' '}
      {DATE_FORMAT.format(new Date(attempt.submittedAt))}
      {late ? (
        <span className="text-amber-700 dark:text-amber-300">
          {' '}
          · после дедлайна
        </span>
      ) : null}
    </p>
  );
}

function GradeCell({
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
      <span className="flex shrink-0 items-center gap-1.5">
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
            'h-10 w-16 rounded-lg px-1 text-center text-base font-semibold',
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
        <span className="text-sm font-semibold text-muted-foreground">
          / {maxScore}
        </span>
      </span>
    );
  }

  if (outcome?.status === 'saved') {
    return (
      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        {outcome.grade}/{maxScore}
      </span>
    );
  }

  if (attempt.grade) {
    return (
      <span className="text-sm text-muted-foreground">
        {attempt.grade.score}/{maxScore}
      </span>
    );
  }

  return <span className="text-sm text-muted-foreground">—</span>;
}

function StatusCell({ attempt, outcome, error, saving, entry }: RowProps) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Spinner className="size-3" /> Публикуется…
      </span>
    );
  }

  if (outcome?.status === 'saved') {
    return (
      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
        Опубликовано
      </span>
    );
  }

  if (outcome?.status === 'conflict') {
    return (
      <span className="block truncate font-semibold text-destructive">
        Review уже есть
        <span className="block truncate font-normal">
          {outcome.author} · {outcome.publishedGrade}/{attempt.task.maxScore}
        </span>
      </span>
    );
  }

  if (attempt.grade) {
    return (
      <span className="block truncate text-muted-foreground">
        Оценено
        <span className="block truncate">{attempt.grade.gradedBy}</span>
      </span>
    );
  }

  if (attempt.reviewLock) {
    return (
      <span className="block truncate text-amber-700 dark:text-amber-300">
        <span className="inline-flex items-center gap-1">
          <LockKeyhole className="size-3" /> На проверке
        </span>
        <span className="block truncate">{attempt.reviewLock.teacherName}</span>
      </span>
    );
  }

  if (error) {
    return <span className="font-semibold text-destructive">{error}</span>;
  }

  if (entry) {
    return (
      <span className="font-semibold text-orange-600 dark:text-orange-300">
        Не сохранено
      </span>
    );
  }

  return <span className="text-muted-foreground">Не оценено</span>;
}

const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
