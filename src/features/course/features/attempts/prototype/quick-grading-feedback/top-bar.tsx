// PROTOTYPE (#121): top bar in place of the filter sidebar. Filters are locked
// during quick grading (#114), so the bar only states which applied filters
// built the frozen session, plus the keyboard hints; the list gets the full
// page width. References: Shopify bulk editor (mode bar over a full-width
// grid), Twenty / Unify (applied filters as a chip row above the table).
import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import type {
  CourseAttemptStudent,
  CourseAttemptTask,
  CourseAttemptsFilters,
} from '@/features/course/features/attempts/model/types';

const GRADED_LABEL = { yes: 'да', no: 'нет' } as const;

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
  const chips = [
    ...(filters.tasks.length > 0
      ? [
          {
            label: filters.tasks.length === 1 ? 'Задание' : 'Задания',
            value: summarize(
              filters.tasks.map(
                (id) => tasks.find((task) => task.id === id)?.title ?? id
              )
            ),
          },
        ]
      : []),
    ...(filters.students.length > 0
      ? [
          {
            label: 'Студенты',
            value: summarize(
              filters.students.map(
                (username) =>
                  students.find((student) => student.username === username)
                    ?.fullName ?? username
              )
            ),
          },
        ]
      : []),
    ...(filters.graded !== 'any'
      ? [{ label: 'Оценено', value: GRADED_LABEL[filters.graded] }]
      : []),
  ];

  return (
    <div
      title="Фильтры заблокированы на время быстрой оценки"
      className={cn(
        'mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border',
        'bg-card px-4 py-2.5'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
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
            <span
              key={chip.label}
              className={cn(
                'flex max-w-full min-w-0 items-center gap-1 rounded-full border',
                'bg-muted/60 px-2.5 py-0.5 text-xs'
              )}
            >
              <span className="shrink-0 text-muted-foreground">
                {chip.label}:
              </span>
              <span className="truncate font-medium">{chip.value}</span>
            </span>
          ))
        )}
      </div>
      <div
        className={cn(
          'hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs',
          'text-muted-foreground md:flex'
        )}
      >
        {hints}
      </div>
    </div>
  );
}

function summarize(values: string[]) {
  const [first, ...rest] = values;

  return rest.length > 0 ? `${first}, +${rest.length}` : (first ?? '');
}
