import { useMemo } from 'react';

type MonthInfo = {
  month: number;
  year: number;
};

function getMonthInfo(date: Date): MonthInfo {
  return {
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

function formatMonth(month: number): string {
  const date = new Date(2000, month, 1);
  return date.toLocaleDateString('ru-RU', { month: 'long' });
}

export function useCalendarHeaderText(visibleDates: Date[]): string {
  return useMemo(() => {
    if (visibleDates.length === 0) return '';

    const uniqueMonths = new Map<string, MonthInfo>();

    visibleDates.forEach((date) => {
      const info = getMonthInfo(date);
      const key = `${info.year}-${info.month}`;
      if (!uniqueMonths.has(key)) {
        uniqueMonths.set(key, info);
      }
    });

    const monthInfos = Array.from(uniqueMonths.values());

    if (monthInfos.length === 1) {
      const { month, year } = monthInfos[0];
      return `${formatMonth(month)} ${year}`;
    }

    if (monthInfos.length === 2) {
      const [first, second] = monthInfos;

      if (first.year !== second.year) {
        return `${formatMonth(first.month)} ${first.year} / ${formatMonth(second.month)} ${second.year}`;
      }

      return `${formatMonth(first.month)} / ${formatMonth(second.month)} ${first.year}`;
    }

    const first = monthInfos[0];
    const last = monthInfos[monthInfos.length - 1];

    if (first.year !== last.year) {
      return `${formatMonth(first.month)} ${first.year} / ${formatMonth(last.month)} ${last.year}`;
    }

    return `${formatMonth(first.month)} / ${formatMonth(last.month)} ${first.year}`;
  }, [visibleDates]);
}
