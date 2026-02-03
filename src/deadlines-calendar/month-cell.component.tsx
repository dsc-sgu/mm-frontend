import { cn } from '@/lib/utils';
import type { Season } from './deadlines-calendar.types';

interface MonthCellProps {
  date: Date;
}

function getSeasonFromMonth(month: number): Season {
  if (month === 11 || month === 0 || month === 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  return 'autumn';
}

const SEASON_COLOR: Record<Season, string> = {
  winter: 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100',
  spring:
    'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100',
  summer:
    'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100',
  autumn:
    'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100',
};

export function MonthCell({ date }: MonthCellProps) {
  const monthName = date.toLocaleDateString('ru-RU', { month: 'long' });
  const year = date.getFullYear();
  const season = getSeasonFromMonth(date.getMonth());
  const seasonColor = SEASON_COLOR[season];

  return (
    <div
      className={cn(
        'flex items-center justify-center border border-border rounded-lg min-h-34',
        seasonColor
      )}
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold capitalize">{monthName}</h2>
        <p className="text-lg font-medium">{year}</p>
      </div>
    </div>
  );
}
