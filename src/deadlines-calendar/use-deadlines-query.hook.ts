import { useQuery } from '@tanstack/react-query';
import { fetchDeadlines } from './deadlines.api.mock';

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getWeekQueryKey(weekStart: Date): string[] {
  return ['deadlines', weekStart.toISOString()];
}

interface UseDeadlinesQueryOptions {
  weekStart: Date;
}

export function useDeadlinesQuery({ weekStart }: UseDeadlinesQueryOptions) {
  const { start, end } = getWeekBounds(weekStart);

  return useQuery({
    queryKey: getWeekQueryKey(weekStart),
    queryFn: () => fetchDeadlines(start, end),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
