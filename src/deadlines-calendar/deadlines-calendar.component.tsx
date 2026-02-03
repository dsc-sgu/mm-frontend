import { useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayCell } from './day-cell.component';
import { MonthCell } from './month-cell.component';
import type { DeadlinesByDay } from './deadlines-calendar.types';
import { useMediaQuery } from '@/use-media-query.hook';
import { useDeadlinesQuery } from './use-deadlines-query.hook';

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

/**
 * Компонент для одной недели календаря
 */
function WeekRow({
  weekIndex,
  columnsCount,
}: {
  weekIndex: number;
  columnsCount: number;
}) {
  const weekStart = getWeekStartDate(weekIndex);
  const { data: weekData, isLoading } = useDeadlinesQuery({ weekStart });

  // Генерируем все 7 дней недели
  const allDays = Array.from({ length: 7 }, (_, dayOffset) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOffset);
    return date;
  });

  // Находим первое число месяца в этой неделе (если есть)
  const firstDayOfMonthIndex = allDays.findIndex(isFirstDayOfMonth);
  const hasFirstDayOfMonth = firstDayOfMonthIndex !== -1;
  const firstDayOfMonth = hasFirstDayOfMonth
    ? allDays[firstDayOfMonthIndex]
    : null;

  // Определяем, какие ячейки нужно отрисовать
  const cells: JSX.Element[] = [];

  // Если 1-е число попадает в видимый диапазон, показываем MonthCell
  if (hasFirstDayOfMonth && firstDayOfMonthIndex < columnsCount) {
    // Добавляем DayCell до MonthCell
    for (let i = 0; i < firstDayOfMonthIndex; i++) {
      const date = allDays[i];
      const dateKey = formatDateKey(date);
      const deadlines = weekData?.[dateKey] || [];

      cells.push(
        <DayCell
          key={dateKey}
          date={date}
          deadlines={deadlines}
          isToday={isToday(date)}
        />
      );
    }

    // Добавляем MonthCell
    cells.push(
      <MonthCell
        key={`month-${formatDateKey(firstDayOfMonth!)}`}
        date={firstDayOfMonth!}
      />
    );

    // Добавляем оставшиеся DayCell после MonthCell
    for (let i = firstDayOfMonthIndex + 1; i < columnsCount; i++) {
      const date = allDays[i];
      const dateKey = formatDateKey(date);
      const deadlines = weekData?.[dateKey] || [];

      cells.push(
        <DayCell
          key={dateKey}
          date={date}
          deadlines={deadlines}
          isToday={isToday(date)}
        />
      );
    }
  } else {
    // 1-го числа нет в видимом диапазоне или вообще нет в неделе
    // Просто показываем первые columnsCount дней
    for (let i = 0; i < columnsCount; i++) {
      const date = allDays[i];
      const dateKey = formatDateKey(date);
      const deadlines = weekData?.[dateKey] || [];

      cells.push(
        <DayCell
          key={dateKey}
          date={date}
          deadlines={deadlines}
          isToday={isToday(date)}
        />
      );
    }
  }

  return <>{cells}</>;
}

export function DeadlinesCalendar({ className }: DeadlinesCalendarProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState('');

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

  // Обновляем заголовок при скролле
  useEffect(() => {
    if (virtualItems.length === 0) return;

    const firstVisibleItem = virtualItems[0];
    const weekStart = getWeekStartDate(firstVisibleItem.index);
    setCurrentMonth(formatMonthYear(weekStart));
  }, [virtualItems]);

  return (
    <div
      className={cn(
        'flex flex-col border rounded-lg overflow-hidden bg-card',
        className
      )}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-lg font-semibold capitalize">{currentMonth}</h2>
      </div>

      {/* Календарь с бесконечным скроллом */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => (
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
                <WeekRow
                  weekIndex={virtualRow.index}
                  columnsCount={columnsCount}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
