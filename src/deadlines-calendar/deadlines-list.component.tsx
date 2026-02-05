import { useState } from 'react';
import { cn } from '@/shadcn/lib/utils';
import { DeadlineDetails } from './deadline-details.component';
import type { Deadline } from './deadlines-calendar.types';
import type { CourseColor } from '@/course/course.types';

type DeadlinesListProps = {
  deadlines: Deadline[];
};

const COURSE_COLOR_CLASSES: Record<CourseColor, string> = {
  blue: 'bg-blue-500 hover:bg-blue-600 text-white',
  teal: 'bg-teal-500 hover:bg-teal-600 text-white',
  violet: 'bg-violet-500 hover:bg-violet-600 text-white',
  pink: 'bg-pink-500 hover:bg-pink-600 text-white',
  red: 'bg-red-500 hover:bg-red-600 text-white',
  orange: 'bg-orange-500 hover:bg-orange-600 text-white',
  green: 'bg-green-500 hover:bg-green-600 text-white',
};

const MAX_VISIBLE_DEADLINES = 3;

export function DeadlinesList({ deadlines }: DeadlinesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleDeadlines = isExpanded
    ? deadlines
    : deadlines.slice(0, MAX_VISIBLE_DEADLINES - 1);
  const hiddenCount = deadlines.length - MAX_VISIBLE_DEADLINES + 1;

  if (deadlines.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 overflow-auto flex-1">
      {visibleDeadlines.map((deadline) => (
        <DeadlineDetails key={deadline.id} deadline={deadline}>
          <button
            className={cn(
              'w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors truncate',
              COURSE_COLOR_CLASSES[deadline.courseColor]
            )}
          >
            {deadline.subjectName}
          </button>
        </DeadlineDetails>
      ))}

      {!isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            'w-full text-left px-2 py-1 rounded text-xs font-medium',
            'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700',
            'text-foreground transition-colors'
          )}
        >
          показать +{hiddenCount}
        </button>
      )}

      {isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(false)}
          className={cn(
            'w-full text-left px-2 py-1 rounded text-xs font-medium',
            'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700',
            'text-foreground transition-colors'
          )}
        >
          свернуть
        </button>
      )}
    </div>
  );
}
