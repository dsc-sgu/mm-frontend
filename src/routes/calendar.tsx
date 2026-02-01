import { createFileRoute } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState, useEffect } from 'react';

export const Route = createFileRoute('/calendar')({
  component: CalendarPage,
});

function CalendarPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const [upcomingMonth, setUpcomingMonth] = useState('');
  const [headerOffset, setHeaderOffset] = useState(0);
  const [sideHeaderMonth, setSideHeaderMonth] = useState('');
  const [sideHeaderTop, setSideHeaderTop] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const today = new Date();
  const initialWeekIndex = 5000;

  // Настраиваемая высота недели - увеличена, так как теперь 3 ряда
  const WEEK_HEIGHT = 300; // Было 100, теперь ~100 * 3
  const HEADER_HEIGHT = 56;

  const virtualizer = useVirtualizer({
    count: 10000,
    getScrollElement: () => parentRef.current,
    estimateSize: () => WEEK_HEIGHT,
    overscan: 5,
    initialOffset: initialWeekIndex * WEEK_HEIGHT,
  });

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = parentRef.current?.scrollTop || 0;
      const firstVisibleIndex = Math.floor(scrollTop / WEEK_HEIGHT);

      const firstVisibleWeek = new Date();
      firstVisibleWeek.setDate(
        firstVisibleWeek.getDate() + (firstVisibleIndex - initialWeekIndex) * 7
      );

      const currentMonthStr = formatMonthYear(firstVisibleWeek);
      setCurrentMonth(currentMonthStr);

      const containerHeight = 600;
      const visibleWeeksCount = Math.ceil(containerHeight / WEEK_HEIGHT) + 1;

      let foundNewMonth = false;
      let newMonthStr = '';
      let newMonthWeekTop = 0;

      for (let i = 0; i <= visibleWeeksCount; i++) {
        const weekIndex = firstVisibleIndex + i;
        const weekDate = new Date();
        weekDate.setDate(
          weekDate.getDate() + (weekIndex - initialWeekIndex) * 7
        );

        const weekMonthStr = formatMonthYear(weekDate);

        if (weekMonthStr !== currentMonthStr && !foundNewMonth) {
          foundNewMonth = true;
          newMonthStr = weekMonthStr;
          newMonthWeekTop = weekIndex * WEEK_HEIGHT - scrollTop + HEADER_HEIGHT;
          break;
        }
      }

      if (foundNewMonth) {
        setSideHeaderMonth(newMonthStr);
        setSideHeaderTop(newMonthWeekTop);

        const nextWeek = new Date(firstVisibleWeek);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextMonthStr = formatMonthYear(nextWeek);

        const weekOffset = scrollTop % WEEK_HEIGHT;
        if (currentMonthStr !== nextMonthStr && weekOffset > 0) {
          setUpcomingMonth(nextMonthStr);
          setHeaderOffset(Math.min(weekOffset, HEADER_HEIGHT));
        } else {
          setUpcomingMonth('');
          setHeaderOffset(0);
        }
      } else {
        setSideHeaderMonth('');
        setUpcomingMonth('');
        setHeaderOffset(0);
      }

      setIsScrolling(true);
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    const scrollElement = parentRef.current;
    scrollElement?.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      scrollElement?.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, [initialWeekIndex]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl h-[600px] bg-white rounded-lg shadow-lg flex flex-col"
      >
        <div className="relative h-[56px] border-b border-gray-200 overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full bg-white px-6 py-4 transition-transform"
            style={{
              transform: `translateY(-${headerOffset}px)`,
            }}
          >
            <h1 className="text-2xl font-semibold">{currentMonth}</h1>
          </div>

          {isScrolling && upcomingMonth && (
            <div
              className="absolute top-0 left-0 w-full bg-white px-6 py-4 transition-transform"
              style={{
                transform: `translateY(${56 - headerOffset}px)`,
              }}
            >
              <h1 className="text-2xl font-semibold">{upcomingMonth}</h1>
            </div>
          )}
        </div>

        {isScrolling && sideHeaderMonth && (
          <div
            className="absolute left-4 z-40 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md"
            style={{
              top: `${sideHeaderTop}px`,
            }}
          >
            <h2 className="text-lg font-semibold text-gray-800">
              {sideHeaderMonth}
            </h2>
          </div>
        )}

        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const weekStartDate = new Date();
              weekStartDate.setDate(
                weekStartDate.getDate() +
                  (virtualRow.index - initialWeekIndex) * 7
              );

              const daysInWeek = Array.from({ length: 7 }, (_, dayIndex) => {
                const date = new Date(weekStartDate);
                date.setDate(date.getDate() + dayIndex);
                return date;
              });

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="border-b-2 border-gray-400"
                >
                  {/* Изменено: grid-cols-2 на мобильных, grid-cols-3 на планшетах и выше */}
                  <div className="grid grid-cols-2 md:grid-cols-3 h-full">
                    {daysInWeek.map((date, dayIndex) => {
                      const isToday =
                        date.toDateString() === new Date().toDateString();
                      const dayName = date.toLocaleDateString('ru-RU', {
                        weekday: 'short',
                      });
                      const dayNumber = date.getDate();
                      const monthName = date.toLocaleDateString('ru-RU', {
                        month: 'short',
                      });

                      return (
                        <div
                          key={dayIndex}
                          className={`
                            border-r border-b border-gray-100 p-3
                            ${isToday ? 'bg-blue-50' : 'bg-white'}
                            ${dayIndex === 5 || dayIndex === 6 ? 'bg-gray-50' : ''}
                          `}
                        >
                          <div className="mb-2">
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500 uppercase">
                                {dayName}
                              </div>
                              <div
                                className={`
                                  text-lg font-semibold
                                  ${isToday ? 'text-blue-600' : 'text-gray-900'}
                                `}
                              >
                                {dayNumber}
                              </div>
                              {dayNumber === 1 && (
                                <div className="text-xs text-gray-400">
                                  {monthName}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            {virtualRow.index % 3 === dayIndex % 3 && (
                              <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                📝 Сдать лабораторную работу по Machine Learning
                              </div>
                            )}
                            {virtualRow.index % 5 === dayIndex % 5 && (
                              <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                ✅ Контест #3 по алгоритмам и структурам данных
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
