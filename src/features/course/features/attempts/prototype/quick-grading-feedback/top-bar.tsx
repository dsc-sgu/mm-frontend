// PROTOTYPE (#121): one top bar for the whole Course Attempts page in place of
// the filter sidebar and the bottom action bar. It stays pinned while the
// list scrolls. In normal mode it holds the filters (filter-bar.tsx); in quick
// grading the same frame shows the applied filters as locked chips (#114
// locks them) and the session actions, so entering the mode does not move
// the list. References: Shopify bulk editor (mode bar over a full-width
// grid), Twenty / Unify (applied filters as a chip row above the table).
import { useEffect, useRef, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import type {
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';
import { appliedChips } from './filter-labels';

// Pins the bar (and the column header under it) to the top of the window.
// The scroll padding follows its height, so a field focused from the
// keyboard is never scrolled under it.
export function StickyTop({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const html = document.documentElement;
    const previous = html.style.scrollPaddingTop;
    const observer = new ResizeObserver(() => {
      html.style.scrollPaddingTop = `${element.offsetHeight + 8}px`;
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      html.style.scrollPaddingTop = previous;
    };
  }, []);

  return (
    <div ref={ref} className="sticky top-0 z-20 bg-background pt-3">
      {children}
    </div>
  );
}

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
      className={cn(
        'mb-3 flex min-h-[3.25rem] flex-wrap items-center gap-x-4 gap-y-2',
        'rounded-2xl border bg-card px-3 py-2 sm:px-4'
      )}
    >
      <div
        title={title}
        className={cn(
          'flex min-w-0 flex-1 basis-80 flex-wrap items-center gap-1.5'
        )}
      >
        {children}
      </div>
      {trailing ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

export function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className={cn(
        'flex h-7 max-w-full min-w-0 items-center gap-1 rounded-full border',
        'bg-muted/60 px-2.5 text-xs'
      )}
    >
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="truncate font-medium">{value}</span>
    </span>
  );
}

export function QuickGradingTopBar({
  count,
  filters,
  tasks,
  students,
  actions,
}: {
  count: number;
  filters: CourseAttemptsFilters;
  tasks: readonly CourseAttemptTask[];
  students: readonly CourseAttemptStudent[];
  actions: ReactNode;
}) {
  return (
    <BarFrame
      title="Фильтры заблокированы на время быстрой оценки"
      trailing={actions}
    >
      <span className="mr-1 flex items-center gap-1.5 text-sm font-semibold">
        <LockKeyhole className="size-3.5 text-muted-foreground" />
        Попыток: {count}
      </span>
      {appliedChips(filters, tasks, students).map((chip) => (
        <Chip key={chip.key} label={chip.label} value={chip.value} />
      ))}
    </BarFrame>
  );
}
