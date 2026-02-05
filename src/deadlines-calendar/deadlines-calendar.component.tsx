import { cn } from '@/shadcn/lib/utils';
import { useRef } from 'react';
import { DayCell } from './day-cell.component';
import { MonthCell } from './month-cell.component';
import {
  useDeadlinesIsFetching,
  useDeadlinesQuery,
} from './use-deadlines-query.hook';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Spinner } from '@/shadcn/components/ui/spinner';
import { useCalendarHeaderText } from './calendar-header-text.hook';

type DeadlinesCalendarProps = {
  className?: string;
};

const INITIAL_WEEK_INDEX = 5000;
const TOTAL_WEEKS = 10000;
const WEEK_HEIGHT = 300;
const OVERSCAN = 2;

// TODO: Fix DRY
function formatDateKey(date: Date): string {
  return date.toLocaleDateString('ru-RU');
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function getWeekStartDate(weekIndex: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() + diff);
  currentWeekStart.setHours(0, 0, 0, 0);

  const weekOffset = weekIndex - INITIAL_WEEK_INDEX;
  const weekStart = new Date(currentWeekStart);
  weekStart.setDate(currentWeekStart.getDate() + weekOffset * 7);

  return weekStart;
}

function WeekRow({ weekIndex }: { weekIndex: number }) {
  const weekStart = getWeekStartDate(weekIndex);
  const { data } = useDeadlinesQuery({ weekStart });

  const allDays = Array.from({ length: 7 }, (_, dayOffset) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOffset);
    return date;
  });

  return (
    <div className="grid gap-2 xl:grid-cols-4 md:grid-cols-3 grid-cols-2 p-4">
      {allDays.map((date) => {
        const dateKey = formatDateKey(date);
        return (
          <>
            {date.getDate() === 1 && (
              <MonthCell key={`month-${formatDateKey(date)}`} date={date} />
            )}
            <DayCell
              key={dateKey}
              date={date}
              deadlines={data?.[dateKey] || []}
              isToday={isToday(date)}
            />
          </>
        );
      })}
    </div>
  );
}

export function DeadlinesCalendar({ className }: DeadlinesCalendarProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: TOTAL_WEEKS,
    getScrollElement: () => parentRef.current,
    estimateSize: () => WEEK_HEIGHT,
    overscan: OVERSCAN,
    initialOffset: INITIAL_WEEK_INDEX * WEEK_HEIGHT,
    measureElement: (element) => element?.getBoundingClientRect().height,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const isFetching = useDeadlinesIsFetching();

  const visibleDates = virtualItems
    .slice(OVERSCAN, virtualItems.length - OVERSCAN + 1)
    .map((item) => getWeekStartDate(item.index));
  const currentMonth = useCalendarHeaderText(visibleDates);

  return (
    <div
      className={cn(
        'flex flex-col border rounded-lg overflow-hidden bg-card',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          'bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'
        )}
      >
        <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
          {currentMonth} {isFetching && <Spinner />}
        </h2>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualWeek) => (
            <div
              key={virtualWeek.key}
              data-index={virtualWeek.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualWeek.start}px)`,
              }}
            >
              <WeekRow weekIndex={virtualWeek.index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
