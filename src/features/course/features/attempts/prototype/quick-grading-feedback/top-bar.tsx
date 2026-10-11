// PROTOTYPE (#121): one top bar for the whole Course Attempts page in place of
// the filter sidebar. In normal mode it holds the filters (filter-bar.tsx);
// in quick grading the same frame shows the applied filters as locked chips
// (#114 locks them) plus the keyboard hints, so entering the mode does not
// move the list. References: Shopify bulk editor (mode bar over a full-width
// grid), Twenty / Unify (applied filters as a chip row above the table).
import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import type {
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';
import { appliedChips } from './filter-labels';

export function BarFrame({
  title,
  children,
  trailing,
}: {
  title?: string;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      title={title}
      className={cn(
        'mb-3 flex min-h-[3.25rem] flex-wrap items-center gap-x-4 gap-y-2',
        'rounded-2xl border bg-card px-3 py-2 sm:px-4'
      )}
    >
      <div
        className={cn(
          'flex min-w-0 flex-1 basis-80 flex-wrap items-center gap-1.5'
        )}
      >
        {children}
      </div>
      {trailing ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function Chip({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'flex h-7 max-w-full min-w-0 items-center gap-1 rounded-full border',
        'bg-muted/60 pr-1 pl-2.5 text-xs'
      )}
    >
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="truncate pr-1.5 font-medium">{value}</span>
      {children}
    </span>
  );
}

export function QuickGradingTopBar({
  count,
  filters,
  tasks,
  students,
  hints,
}: {
  count: number;
  filters: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  hints: ReactNode;
}) {
  const chips = appliedChips(filters, tasks, students);

  return (
    <BarFrame
      title="Фильтры заблокированы на время быстрой оценки"
      trailing={
        <div
          className={cn(
            'hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs',
            'text-muted-foreground md:flex'
          )}
        >
          {hints}
        </div>
      }
    >
      <span className="mr-1 flex items-center gap-1.5 text-sm font-semibold">
        <LockKeyhole className="size-3.5 text-muted-foreground" />
        Попыток: {count}
      </span>
      {chips.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          все попытки курса, без фильтров
        </span>
      ) : (
        chips.map((chip) => (
          <Chip key={chip.key} label={chip.label} value={chip.value} />
        ))
      )}
    </BarFrame>
  );
}
