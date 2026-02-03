import { useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayCell } from './day-cell.component';
import { MonthCell } from './month-cell.component';
import type { DeadlinesByDay } from './deadlines-calendar.types';
import { useMediaQuery } from '@/use-media-query.hook';
import { fetchDeadlines } from './deadlines.api.mock';

interface DeadlinesCalendarProps {
  className?: string;
}

const INITIAL_WEEK_INDEX = 5000;
const TOTAL_WEEKS = 10000;
const WEEK_HEIGHT = 168;

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function isFirstDayOfMonth(date: Date): boolean {
  return date.getDate() === 1;
}

export function DeadlinesCalendar({ className }: DeadlinesCalendarProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState('');

  const [deadlinesCache, setDeadlinesCache] = useState<
    Map<number, DeadlinesByDay>
  >(new Map());

  const [loadingWeeks, setLoadingWeeks] = useState<Set<number>>(new Set());

  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const isMediumScreen = useMediaQuery('(min-width: 768px)');
  const columnsCount = isLargeScreen ? 4 : isMediumScreen ? 3 : 2;

  const virtualizer = useVirtualizer({
    count: TOTAL_WEEKS,
    getScrollElement: () => parentRef.current,
    estimateSize: () => WEEK_HEIGHT,
    overscan: 5,
    initialOffset: INITIAL_WEEK_INDEX * WEEK_HEIGHT,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (virtualItems.length === 0) return;

    const firstVisibleItem = virtualItems[0];
    const weekStart = getWeekStartDate(firstVisibleItem.index);
    setCurrentMonth(formatMonthYear(weekStart));
  }, [virtualItems]);

  useEffect(() => {
    virtualItems.forEach((virtualRow) => {
      const weekIndex = virtualRow.index;

      if (deadlinesCache.has(weekIndex) || loadingWeeks.has(weekIndex)) {
        return;
      }

      setLoadingWeeks((prev) => new Set(prev).add(weekIndex));

      const weekStart = getWeekStartDate(weekIndex);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      fetchDeadlines(weekStart, weekEnd)
        .then((data) => {
          setDeadlinesCache((prev) => new Map(prev).set(weekIndex, data));
          setLoadingWeeks((prev) => {
            const next = new Set(prev);
            next.delete(weekIndex);
            return next;
          });
        })
        .catch(() => {
          setLoadingWeeks((prev) => {
            const next = new Set(prev);
            next.delete(weekIndex);
            return next;
          });
        });
    });
  }, [virtualItems, deadlinesCache, loadingWeeks]);

  const isLoading = loadingWeeks.size > 0;

  return (
    <div
      className={cn(
        'flex flex-col border rounded-lg overflow-hidden bg-card',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-lg font-semibold capitalize">{currentMonth}</h2>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const weekStart = getWeekStartDate(virtualRow.index);
            const weekData = deadlinesCache.get(virtualRow.index) || {};

            const days = Array.from({ length: 7 }, (_, dayOffset) => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() + dayOffset);
              return date;
            });

            const visibleDays = days.slice(0, columnsCount);

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className={cn(
                    'grid gap-3 p-4',
                    columnsCount === 4 && 'grid-cols-4',
                    columnsCount === 3 && 'grid-cols-3',
                    columnsCount === 2 && 'grid-cols-2'
                  )}
                >
                  {visibleDays.map((date) => {
                    const dateKey = formatDateKey(date);
                    const deadlines = weekData[dateKey] || [];

                    // Показываем MonthCell для первого дня месяца
                    if (isFirstDayOfMonth(date)) {
                      return <MonthCell key={dateKey} date={date} />;
                    }

                    return (
                      <DayCell
                        key={dateKey}
                        date={date}
                        deadlines={deadlines}
                        isToday={isToday(date)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
