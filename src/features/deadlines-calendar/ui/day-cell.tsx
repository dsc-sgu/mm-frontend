import { cn } from '@/shadcn/lib/utils';
import { DeadlinesList } from './deadlines-list';
import type { Deadline } from '@/features/deadlines-calendar/model/types';

type DayCellProps = {
  date: Date;
  deadlines: Deadline[];
  isToday: boolean;
};

export function DayCell({ date, deadlines, isToday }: DayCellProps) {
  const dayOfWeek = date.toLocaleDateString('ru-RU', { weekday: 'short' });
  const dayNumber = date.getDate();

  return (
    <div
      className={cn(
        'flex min-h-34 flex-col overflow-hidden rounded-lg border border-border p-3',
        isToday ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-card'
      )}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase">
          {dayOfWeek}
        </span>
        <span
          className={cn(
            'text-sm font-semibold',
            isToday ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'
          )}
        >
          {dayNumber}
        </span>
      </div>

      <DeadlinesList deadlines={deadlines} />
    </div>
  );
}
