import { cn } from '@/lib/utils';
import { DeadlinesList } from './deadlines-list.component';
import type { Deadline } from './deadlines-calendar.types';

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
        'flex flex-col border border-border rounded-lg p-3 min-h-34 overflow-hidden',
        isToday ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-card'
      )}
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
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
