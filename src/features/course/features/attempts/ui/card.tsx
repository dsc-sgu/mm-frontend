import { Link } from '@tanstack/react-router';
import { Eye, FileCheck2, LockKeyhole } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Checkbox } from '@/shadcn/components/ui/checkbox';
import { cn } from '@/shadcn/lib/utils';
import {
  CourseAttemptsScoreField,
  scoreDraftChanged,
  scoreDraftValidationError,
} from '@/features/course/features/grading';
import type {
  CourseAttempt,
  CourseAttemptGrade,
} from '@/features/course/features/attempts/model/types';

type AttemptCardProps =
  | {
      mode: 'default';
      attempt: CourseAttempt;
      courseSlug: string;
      selected: boolean;
      onSelectedChange: (checked: boolean) => void;
    }
  | {
      mode: 'quick-grading';
      attempt: CourseAttempt;
      draftScore: string;
      onDraftScoreChange: (score: string) => void;
      onDraftScoreReset: () => void;
    };

export function AttemptCard(props: AttemptCardProps) {
  const canSelect = props.mode === 'default' && !props.attempt.reviewLock;
  const selected = canSelect ? props.selected : false;
  const draftScoreChanged =
    props.mode === 'quick-grading'
      ? scoreDraftChanged(props.attempt, props.draftScore)
      : false;
  const draftScoreError =
    props.mode === 'quick-grading'
      ? scoreDraftValidationError(props.attempt, props.draftScore)
      : null;

  return (
    <article
      className={cn(
        'max-w-full overflow-hidden rounded-2xl border bg-card',
        'px-4 py-4 transition-colors sm:px-7 sm:py-6',
        selected ? 'border-primary' : 'border-border'
      )}
    >
      <div
        className={cn(
          'grid min-w-0 gap-2 sm:flex sm:items-start sm:justify-between',
          'sm:gap-4'
        )}
      >
        <div className="flex min-w-0 items-start">
          {!props.attempt.reviewLock ? (
            <div
              className={cn(
                'mt-[0.1875rem] mr-2 grid w-5 shrink-0 place-items-center overflow-hidden',
                'transition-[opacity,transform] duration-200 ease-out sm:mt-1',
                canSelect ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              )}
              aria-hidden={!canSelect}
            >
              {canSelect ? (
                <Checkbox
                  checked={selected}
                  onCheckedChange={(value) => {
                    if (props.mode === 'default') {
                      props.onSelectedChange(value === true);
                    }
                  }}
                  aria-label={`Выбрать попытку ${props.attempt.task.title}`}
                  className="size-5 rounded-md transition-opacity duration-200"
                />
              ) : null}
            </div>
          ) : null}
          <h3
            className={cn(
              'min-w-0 text-lg leading-tight font-semibold tracking-tight',
              'break-words transition-transform duration-200 ease-out sm:text-xl',
              props.mode !== 'default' && !props.attempt.reviewLock
                ? '-translate-x-7'
                : 'translate-x-0'
            )}
          >
            {canSelect ? (
              <button
                type="button"
                className={cn(
                  'block min-w-0 cursor-pointer text-left break-words',
                  'select-none focus-visible:rounded-md focus-visible:ring-2',
                  'focus-visible:ring-ring focus-visible:outline-none'
                )}
                onClick={() => props.onSelectedChange(!selected)}
              >
                <AttemptTitle attempt={props.attempt} />
              </button>
            ) : (
              <AttemptTitle attempt={props.attempt} />
            )}
          </h3>
        </div>
        <div
          className={cn(
            'transition-transform duration-200 ease-out',
            !props.attempt.reviewLock ? 'pl-7 sm:pl-0' : 'pl-0',
            props.mode === 'default'
              ? 'translate-x-0'
              : '-translate-x-7 sm:translate-x-0'
          )}
        >
          <AttemptDiffStats attempt={props.attempt} />
        </div>
      </div>

      <div className="min-w-0">
        <AttemptDetails attempt={props.attempt} />
      </div>

      <div
        className={cn(
          'mt-2 flex items-center',
          props.mode === 'default' ? 'h-12' : 'min-h-12'
        )}
      >
        {props.mode === 'default' ? (
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-xl px-5 text-base font-semibold"
          >
            <Link
              to={
                selected
                  ? '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId'
                  : '/courses/$courseSlug/tasks/$taskId/attempts/$studentUsername/$attemptId/review'
              }
              params={getAttemptRouteParams(props.courseSlug, props.attempt)}
            >
              {selected ? (
                <Eye className="size-4" />
              ) : (
                <FileCheck2 className="size-4" />
              )}
              {selected ? 'Посмотреть' : 'Оценить'}
            </Link>
          </Button>
        ) : (
          <CourseAttemptsScoreField
            value={props.draftScore}
            maxScore={props.attempt.task.maxScore}
            changed={draftScoreChanged}
            disabled={Boolean(props.attempt.reviewLock)}
            ariaLabel={`Балл за попытку ${props.attempt.task.title}`}
            error={draftScoreError}
            resetAriaLabel={`Вернуть прежний балл за попытку`}
            onChange={props.onDraftScoreChange}
            onReset={draftScoreChanged ? props.onDraftScoreReset : undefined}
          />
        )}
      </div>
    </article>
  );
}

export function AttemptTitle({ attempt }: { attempt: CourseAttempt }) {
  return (
    <>
      <span className="font-semibold">Попытка #{attempt.attemptNumber}: </span>
      <span className="font-normal break-words">{attempt.task.title}</span>
    </>
  );
}

function getGradeClassName(grade: CourseAttemptGrade): string {
  if (grade.score === 0) {
    return 'font-semibold text-rose-700 dark:text-rose-300';
  }

  if (grade.score === grade.maxScore) {
    return 'font-semibold text-emerald-700 dark:text-emerald-300';
  }

  return 'font-semibold text-amber-700 dark:text-amber-300';
}

export function AttemptDiffStats({ attempt }: { attempt: CourseAttempt }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 text-xs font-medium sm:gap-3',
        'sm:text-sm'
      )}
    >
      <span className="text-emerald-700 dark:text-emerald-300">
        +{attempt.diff.addedLines}
      </span>
      <span className="text-rose-700 dark:text-rose-300">
        −{attempt.diff.deletedLines}
      </span>
    </div>
  );
}

export function AttemptDetails({ attempt }: { attempt: CourseAttempt }) {
  const timing = getTimingLabel(attempt);

  return (
    <div
      className={cn(
        'mt-1 min-w-0 text-sm leading-6 break-words text-muted-foreground',
        'sm:text-base sm:leading-7'
      )}
    >
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0">
        <span className="font-medium text-foreground">
          {attempt.student.fullName}
        </span>
        <span className="whitespace-nowrap">
          Группа «{getGroupLabel(attempt)}»
        </span>
      </p>
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="whitespace-nowrap">
          Отправлено {formatDateTime(attempt.submittedAt)}
        </span>
        <span
          className={cn(
            '-mt-0.5 font-semibold whitespace-nowrap sm:mt-0',
            timing.className
          )}
        >
          {timing.label}
        </span>
      </p>
      {attempt.grade ? (
        <p
          className={cn(
            'flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0',
            'text-foreground'
          )}
        >
          <span className="whitespace-nowrap">
            Оценено {formatDateTime(attempt.grade.gradedAt)}
          </span>
          <span className="-mt-0.5 whitespace-nowrap sm:mt-0">
            преподавателем {attempt.grade.gradedBy}{' '}
            <span className={getGradeClassName(attempt.grade)}>
              ({attempt.grade.score}/{attempt.grade.maxScore})
            </span>
          </span>
        </p>
      ) : (
        <p className="font-semibold text-orange-600 dark:text-orange-300">
          Не оценено
        </p>
      )}
      {attempt.reviewLock ? (
        <p
          className={cn(
            'inline-flex min-w-0 items-center gap-2 font-medium break-words',
            'text-amber-700 dark:text-amber-300'
          )}
        >
          <LockKeyhole className="size-4" /> На проверке у{' '}
          {attempt.reviewLock.teacherName}
        </p>
      ) : null}
    </div>
  );
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const dateTimeFormatCache = new Map<string, string>();

function formatDateTime(value: string): string {
  const cached = dateTimeFormatCache.get(value);

  if (cached) {
    return cached;
  }

  const formatted = DATE_TIME_FORMAT.format(new Date(value));
  dateTimeFormatCache.set(value, formatted);
  return formatted;
}

function getTimingLabel(attempt: CourseAttempt): {
  label: string;
  className: string;
} {
  const submittedAt = Date.parse(attempt.submittedAt);
  const deadlineAt = Date.parse(attempt.deadlineAt);
  const deadlineOffset = submittedAt - deadlineAt;

  if (deadlineOffset > 0) {
    return {
      label: `через ${formatDuration(deadlineOffset)} после дедлайна`,
      className: 'text-amber-700 dark:text-amber-300',
    };
  }

  if (deadlineOffset < 0) {
    return {
      label: `за ${formatDuration(deadlineOffset)} до дедлайна`,
      className: 'text-emerald-700 dark:text-emerald-300',
    };
  }

  return {
    label: 'сдано в дедлайн',
    className: 'text-emerald-700 dark:text-emerald-300',
  };
}

function formatDuration(value: number): string {
  const totalMinutes = Math.max(1, Math.ceil(Math.abs(value) / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return [`${days} д`, hours > 0 ? `${hours} ч` : '']
      .filter(Boolean)
      .join(' ');
  }

  return [hours > 0 ? `${hours} ч` : '', minutes > 0 ? `${minutes} мин` : '']
    .filter(Boolean)
    .join(' ');
}

function getGroupLabel(attempt: CourseAttempt): string {
  return [
    attempt.student.group,
    attempt.student.subgroup ? `${attempt.student.subgroup} подгр.` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function getAttemptRouteParams(courseSlug: string, attempt: CourseAttempt) {
  return {
    courseSlug,
    taskId: String(attempt.task.id),
    studentUsername: attempt.student.username,
    attemptId: String(attempt.attemptNumber),
  };
}
