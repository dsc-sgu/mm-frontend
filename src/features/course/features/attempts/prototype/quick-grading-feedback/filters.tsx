// PROTOTYPE (#121): Course Attempts filters during quick grading, where they
// are locked (#114). Two placements to compare: a top bar instead of the
// sidebar (gives the rows the full page width) and the current sidebar.
import type { ReactNode } from 'react';
import { ChevronDown, Filter, LockKeyhole } from 'lucide-react';

import { Button } from '@/shadcn/components/ui/button';
import { Kbd } from '@/shadcn/components/ui/kbd';
import { cn } from '@/shadcn/lib/utils';
import type {
  CourseAttemptGradedFilter,
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';

type LockedFiltersProps = {
  filters: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  count: number;
  hints: readonly string[];
};

const gradedOptions: { value: CourseAttemptGradedFilter; label: string }[] = [
  { value: 'any', label: 'Неважно' },
  { value: 'no', label: 'Нет' },
  { value: 'yes', label: 'Да' },
];

const LOCKED_REASON = 'Недоступны во время быстрой оценки';

export function LockedFiltersTopBar({
  compact,
  ...props
}: LockedFiltersProps & { compact: boolean }) {
  const summary = summarize(props);

  if (compact) {
    return (
      <div
        className={cn(
          'mb-3 flex items-center gap-2 rounded-2xl border bg-card px-3 py-2',
          'text-xs text-muted-foreground'
        )}
        title={LOCKED_REASON}
      >
        <LockKeyhole className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">
          {summary.tasks} · {summary.students} · оценена: {summary.graded}
        </span>
        <CountBadge count={props.count} />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div
        className={cn(
          'flex flex-wrap items-end gap-x-3 gap-y-2 rounded-2xl border bg-card',
          'px-4 py-3'
        )}
      >
        <FieldStub label="Задания" value={summary.tasks} className="w-60" />
        <FieldStub label="Студенты" value={summary.students} className="w-60" />
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">
            Оценена
          </span>
          <GradedStub graded={props.filters.graded} />
        </div>
        <Button type="button" disabled className="h-9">
          Применить
          <Kbd>Ctrl</Kbd>
          <Kbd>↵</Kbd>
        </Button>
        <Button type="button" variant="outline" disabled className="h-9">
          Сбросить
        </Button>
        <div className="ml-auto flex items-center gap-2 self-center text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" /> {LOCKED_REASON}
          <CountBadge count={props.count} />
        </div>
      </div>
      <Hints hints={props.hints} />
    </div>
  );
}

export function LockedFiltersSidebar(props: LockedFiltersProps) {
  const summary = summarize(props);

  return (
    <aside
      className={cn(
        'sticky top-20 grid gap-4 self-start rounded-3xl border border-border',
        'bg-card p-5'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
          <Filter className="size-4" /> Фильтры
        </h2>
        <CountBadge count={props.count} />
      </div>
      <FieldStub label="Задания" value={summary.tasks} />
      <FieldStub label="Студенты" value={summary.students} />
      <div className="grid gap-1">
        <span className="text-xs font-semibold text-muted-foreground">
          Оценена
        </span>
        <GradedStub graded={props.filters.graded} stretch />
      </div>
      <Button type="button" disabled>
        Применить
        <Kbd>Ctrl</Kbd>
        <Kbd>↵</Kbd>
      </Button>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole className="size-3.5" /> {LOCKED_REASON}
      </p>
      <Hints hints={props.hints} />
    </aside>
  );
}

function FieldStub({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 gap-1', className)}>
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <span
        aria-disabled
        className={cn(
          'flex h-9 min-w-0 items-center justify-between gap-2 rounded-md',
          'border border-input px-3 text-sm opacity-60'
        )}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="size-4 shrink-0" />
      </span>
    </div>
  );
}

function GradedStub({
  graded,
  stretch = false,
}: {
  graded: CourseAttemptGradedFilter;
  stretch?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex gap-1 opacity-60',
        stretch ? 'grid grid-cols-3' : null
      )}
    >
      {gradedOptions.map((option) => (
        <span
          key={option.value}
          className={cn(
            'grid h-9 place-items-center rounded-md border px-3 text-sm',
            graded === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input'
          )}
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
      Попыток: {count}
    </span>
  );
}

function Hints({ hints }: { hints: readonly string[] }): ReactNode {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
      {hints.map((hint) => (
        <li key={hint}>{hint}</li>
      ))}
    </ul>
  );
}

function summarize({
  filters,
  tasks,
  students,
}: Pick<LockedFiltersProps, 'filters' | 'tasks' | 'students'>) {
  const taskTitle = (id: string) =>
    tasks.find((task) => task.id === id)?.title ?? id;
  const studentName = (username: string) =>
    students.find((student) => student.username === username)?.fullName ??
    username;

  return {
    tasks:
      filters.tasks.length === 0
        ? 'Все задания'
        : filters.tasks.length === 1
          ? taskTitle(filters.tasks[0]!)
          : `${filters.tasks.length} ${plural(filters.tasks.length, ['задание', 'задания', 'заданий'])}`,
    students:
      filters.students.length === 0
        ? 'Все студенты'
        : filters.students.length === 1
          ? studentName(filters.students[0]!)
          : `${filters.students.length} ${plural(filters.students.length, ['студент', 'студента', 'студентов'])}`,
    graded:
      gradedOptions.find((option) => option.value === filters.graded)?.label ??
      'Неважно',
  };
}

function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return forms[1];
  }

  return forms[2];
}
